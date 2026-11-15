import { ApiError, type RefundChoice, type StaffOrder } from "@cke/api-client";
import type { AlertSettings } from "@cke/validation";
import { useCallback, useMemo } from "react";
import { api } from "../api";
import type { Alert, Order } from "../data/seed";
import { CATALOG_NAME } from "../ui/thumb";
import { useToast } from "../ui/toast";
import { reloadLive } from "./live";
import { mapOrder } from "./mapping";
import {
  acknowledge,
  assignRider,
  cancelOrder,
  clearAlert,
  findOrder,
  log,
  markCollected,
  markReady,
  partialRefund,
  placeWalkIn,
  tick,
  useStore,
  type Settings,
} from "./store";

// Every action on orders, alerts, riders, the menu, and settings, in one place (build step 6).
// Demo: the change happens in the app, as before. Live: it goes to the API, which records who did
// it and tells every other screen over the live connection; the app applies the returned order at
// once. A refusal (an order that already moved on, a sold-out item) shows the API's plain-English
// message, and the app reloads what's true now.

type Pick = { kind: "full" | "partial" };

export function useOps() {
  const { s, set } = useStore();
  const toast = useToast();
  const live = s.live && !!api;

  /** Runs an API call; applies a returned order; on a refusal says why and reloads. */
  const run = useCallback(
    async (call: () => Promise<{ order?: StaffOrder } | unknown>, done?: string) => {
      try {
        const res = (await call()) as { order?: StaffOrder } | undefined;
        const o = res && typeof res === "object" && "order" in res ? res.order : undefined;
        if (o)
          set((st) => ({
            orders: [
              mapOrder(
                o,
                st.orders.find((x) => x.no === o.number),
              ),
              ...st.orders.filter((x) => x.no !== o.number),
            ],
          }));
        if (done) toast(done);
        return true;
      } catch (e) {
        toast(e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.");
        void reloadLive().catch(() => {});
        return false;
      }
    },
    [set, toast],
  );

  const idOf = useCallback((no: string) => findOrder(s, no)?.id, [s]);

  return useMemo(
    () => ({
      live,

      acknowledge: (no: string) => {
        set((st) => acknowledge(st, no)); // straight onto Preparing; the API confirms it
        const id = idOf(no);
        if (live && id) void run(() => api!.acknowledge(id));
      },

      tick: (o: Order, i: number) => {
        set((st) => tick(st, o.no, i));
        const line = o.lines[i];
        if (live && o.id && line?.id) void run(() => api!.tickItem(o.id!, line.id!, !line.ticked));
      },

      ready: (no: string) => {
        set((st) => markReady(st, no));
        const id = idOf(no);
        if (live && id) void run(() => api!.ready(id));
      },

      collected: (no: string) => {
        set((st) => markCollected(st, no));
        const id = idOf(no);
        if (live && id) void run(() => api!.collected(id));
      },

      /** Places the walk-in order being entered. Resolves to whether it went through. */
      placeWalkIn: async (pay: Order["pay"], cash?: number) => {
        if (!live) {
          set((st) => placeWalkIn(st, pay, cash));
          return true;
        }
        const items = Object.entries(s.draft.lines)
          .filter(([, q]) => q > 0)
          .map(([dish, quantity]) => ({
            itemId:
              s.catalogIds[
                dish === "soup"
                  ? "Soup of the day"
                  : dish === "xsoup"
                    ? "Extra soup"
                    : (CATALOG_NAME[dish] ?? "")
              ]!,
            quantity,
          }));
        if (items.some((i) => !i.itemId)) {
          toast("The menu hasn’t loaded yet. Try again in a moment.");
          return false;
        }
        const ok = await run(() =>
          api!.walkIn({
            type: s.draft.type === "eatin" ? "eat_in" : "take_away",
            label: s.draft.name.trim() || undefined,
            items,
            payment: pay === "cash" ? { method: "cash", received: cash ?? 0 } : { method: pay },
          }),
        );
        if (ok) set({ draft: { lines: {}, type: "takeaway", name: "" } });
        return ok;
      },

      /** Cancels an order with a refund: full, or a typed partial amount (4.6, MGR-15). */
      cancel: (no: string, reason: string, pick: Pick, amount?: number) => {
        set((st) => cancelOrder(st, no, reason, amount));
        const id = idOf(no);
        if (live && id) void run(() => api!.cancelOrder(id, reason, choice(pick, amount)));
      },

      /** A manager's refund on the order detail: full or partial, the order stays as it is. */
      refund: (no: string, reason: string, pick: Pick, amount: number) => {
        if (!live) {
          set((st) =>
            pick.kind === "full"
              ? cancelOrder(st, no, reason)
              : partialRefund(st, no, amount, reason),
          );
          return;
        }
        const id = idOf(no);
        if (id) void run(() => api!.refundOrder(id, choice(pick, amount), reason));
      },

      approveCancel: (a: Alert, pick: Pick, amount?: number) => {
        set((st) => ({
          ...cancelOrder(st, a.orderNo, "Customer request approved", amount),
          ...clearAlert(st, a.id),
        }));
        if (live && a.requestId)
          void run(() => api!.approveRequest(a.requestId!, choice(pick, amount)));
      },

      declineCancel: (a: Alert) => {
        set((st) => ({
          ...clearAlert(st, a.id),
          ...log(st, "account", `Declined the cancellation request for ${a.orderNo}`),
        }));
        if (live && a.requestId) void run(() => api!.declineRequest(a.requestId!));
      },

      /** A rider's help request: approve a manual completion, or keep the order open (DSP-04). */
      resolveHelp: (a: Alert, resolution: "manual_completion" | "kept_open") => {
        set((st) => ({
          ...clearAlert(st, a.id),
          ...(resolution === "manual_completion"
            ? {
                orders: st.orders.map((x) =>
                  x.no === a.orderNo
                    ? {
                        ...x,
                        status: "done" as const,
                        events: [
                          ...x.events,
                          { label: "Completed by approval", at: Date.now(), by: st.userId ?? "" },
                        ],
                      }
                    : x,
                ),
                ...log(st, "account", `Approved a manual completion for ${a.orderNo}`),
              }
            : {}),
        }));
        if (live && a.requestId) void run(() => api!.resolveHelp(a.requestId!, resolution));
      },

      clearAlert: (a: Alert) => {
        set((st) => ({
          ...clearAlert(st, a.id),
          ...log(st, "account", `Cleared the alert for ${a.orderNo}`),
        }));
        if (live) void run(() => api!.clearAlert(a.id));
      },

      assign: (no: string, riderId: string) => {
        set((st) => assignRider(st, no, riderId));
        const id = idOf(no);
        if (live && id) void run(() => api!.assign(id, riderId));
      },

      /** One tap on Sold out or the menu (KIT-09, MGR-07). `dish` is the app's dish ID. */
      soldOut: (dish: string, soldOut: boolean) => {
        set((st) => ({
          menu: st.menu.map((m) => (m.id === dish ? { ...m, soldOut } : m)),
          ...log(
            st,
            "setting",
            `Marked ${st.menu.find((m) => m.id === dish)?.name ?? dish} ${soldOut ? "sold out" : "available"}`,
          ),
        }));
        const name =
          dish === "soup"
            ? "Soup of the day"
            : dish === "xsoup"
              ? "Extra soup"
              : CATALOG_NAME[dish];
        const id = name ? s.catalogIds[name] : undefined;
        if (live && id) void run(() => api!.setAvailability(id, !soldOut));
      },

      /** A Settings change (MGR-09 to MGR-12, MGR-31, MGR-35, MGR-36). */
      setting: (patch: Partial<Settings>, what: string) => {
        set((x) => ({ settings: { ...x.settings, ...patch }, ...log(x, "setting", what) }));
        if (!live) return;
        if (patch.areas) {
          const changed = Object.entries(patch.areas).filter(([n, v]) => s.settings.areas[n] !== v);
          for (const [n, v] of changed) {
            const id = s.areaIds[n];
            if (id) void run(() => api!.setArea(id, v));
          }
        }
        const body: Record<string, unknown> = {};
        if (patch.paused !== undefined) body.paused = patch.paused;
        if (patch.budget !== undefined) body.capacityBudget = patch.budget;
        if (patch.batchKm !== undefined) body.batchDistanceM = Math.round(patch.batchKm * 1000);
        if (patch.tracking !== undefined) body.trackingMode = patch.tracking;
        if (patch.cancelLimit !== undefined) body.cancellationLimit = patch.cancelLimit;
        if (patch.fee !== undefined) body.deliveryFee = patch.fee;
        if (patch.riderPay !== undefined) body.riderPay = patch.riderPay;
        if (patch.whatsapp !== undefined) body.whatsappNumber = patch.whatsapp;
        if (Object.keys(body).length) void run(() => api!.changeSettings(body));
      },

      /** Settings, Alerts: saved together (MGR-14). Resolves to whether it was saved. */
      saveAlerts: async (a: AlertSettings, logLine: string) => {
        if (!live) {
          set((x) => ({
            settings: {
              ...x.settings,
              alerts: a,
              alertsSavedAt: Date.now(),
              alertsSavedBy: x.userId ?? undefined,
            },
            ...log(x, "setting", logLine),
          }));
          return true;
        }
        try {
          const res = await api!.saveAlertSettings(a);
          set((x) => ({
            settings: {
              ...x.settings,
              alerts: a,
              alertsSavedAt: res.alerts.updatedAt
                ? new Date(res.alerts.updatedAt).getTime()
                : Date.now(),
              alertsSavedBy: res.alerts.updatedBy?.code ?? x.userId ?? undefined,
            },
          }));
          return true;
        } catch (e) {
          toast(e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.");
          return false;
        }
      },

      /** The order detail's full record: timeline, payment, refunds, and customer card (MGR-24). */
      loadDetail: async (no: string) => {
        const id = idOf(no);
        if (!live || !id) return;
        try {
          const { order } = await api!.order(id);
          set((st) => ({
            orders: st.orders.map((x) => (x.no === order.number ? mapOrder(order, x) : x)),
          }));
        } catch {
          // The list row stays; the detail tries again next time it opens.
        }
      },
    }),
    [live, run, set, idOf, s.draft, s.catalogIds, s.settings.areas, s.areaIds, toast],
  );
}

const choice = (pick: Pick, amount?: number): RefundChoice =>
  pick.kind === "partial" && amount ? { kind: "partial", amount } : { kind: "full" };

export type Ops = ReturnType<typeof useOps>;
