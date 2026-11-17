import { ApiError } from "@cke/api-client";
import { naira } from "@cke/brand-tokens";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { api } from "../../src/api";
import { Button, Card, Field, KV, Page, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

// Cash-up at close (ACC-04): the person on the counter counts the drawer. What it should hold comes
// from today's walk-in cash payments, less cash refunds. The account officer or a manager signs it
// off in Finance; until then it can be counted again.
export default function CashUp() {
  const toast = useToast();
  const q = useQuery({
    queryKey: ["cash-up-today"],
    queryFn: () => api!.cashUpToday(),
    enabled: !!api,
  });
  const c = q.data;
  const [counted, setCounted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown =
    counted ?? (c?.counted !== null && c?.counted !== undefined ? String(c.counted) : "");
  const n = Number(shown.replace(/[^0-9]/g, ""));
  const diff = shown && c ? n - c.expected : 0;

  if (!c)
    return (
      <Page>
        <T muted>{q.isError ? "Can’t load today’s cash-up right now. Try again." : "Loading…"}</T>
      </Page>
    );

  const signed = !!c.signedOffBy;
  return (
    <Page>
      <T muted>Today, before the 8:30 pm sign-out.</T>
      <Card>
        <KV k="Cash expected" v={naira(c.expected)} />
        <T v="small" muted style={{ marginTop: 6 }}>
          Walk-in cash payments today, minus cash refunds.
        </T>
        {signed ? (
          <KV k="Counted" v={`${naira(c.counted ?? 0)}, signed off by ${c.signedOffBy}`} />
        ) : (
          <Field
            label="Cash counted in the drawer"
            value={shown}
            onChangeText={setCounted}
            keyboardType="number-pad"
            placeholder="For example 42600"
          />
        )}
        {shown ? (
          <KV
            k="Difference"
            v={diff === 0 ? "None" : `${diff > 0 ? "Over" : "Short"} ${naira(Math.abs(diff))}`}
            strong
          />
        ) : null}
        {c.countedBy && !signed ? (
          <T v="small" muted style={{ marginTop: 6 }}>
            Saved earlier by {c.countedBy}. Saving again replaces it.
          </T>
        ) : null}
      </Card>
      {signed ? null : (
        <Button
          label="Save the cash-up"
          disabled={!shown || busy}
          style={{ marginTop: 16 }}
          onPress={async () => {
            setBusy(true);
            try {
              await api!.countCash(n);
              toast("Cash-up saved");
              router.back();
            } catch (e) {
              toast(e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </Page>
  );
}
