import { QueryClient, QueryClientProvider, focusManager, useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { AppState } from "react-native";
import { api } from "../api";
import type { Person } from "../data/seed";
import { CATALOG_NAME } from "../ui/thumb";
import { myRole, useStore } from "./store";

// Server data goes through TanStack Query (architecture.md 14). The catalog is fetched when the app
// opens and again when it comes back to the foreground; an unchanged catalog costs a tiny 304
// (14.4, decision 1). The live nudge comes with the real-time channel.
const client = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

export function CatalogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // React Native has no window focus, so tell TanStack Query when the app is in front.
    const sub = AppState.addEventListener("change", (st) =>
      focusManager.setFocused(st === "active"),
    );
    return () => sub.remove();
  }, []);
  return (
    <QueryClientProvider client={client}>
      <CatalogSync />
      {children}
    </QueryClientProvider>
  );
}

export const catalogKey = ["bootstrap"] as const;

/** Copies the soups from the API into the app's state, so every screen reads one place. */
function CatalogSync() {
  const { s, set } = useStore();
  useQuery({
    queryKey: catalogKey,
    enabled: !!api,
    queryFn: async () => {
      const b = await api!.bootstrap();
      const items = b.menu.flatMap((c) => c.items);
      // The app's dishes take their price (with the default choice), load, and sold-out flag
      // from the menu in the database (MGR-05, KIT-09).
      set((st) => ({
        menu: st.menu.map((m) => {
          const name =
            m.id === "soup"
              ? "Soup of the day"
              : m.id === "xsoup"
                ? "Extra soup"
                : CATALOG_NAME[m.id];
          const item = items.find((i) => i.name === name);
          if (!item) return m;
          const usual = item.options.find((o) => o.isDefault);
          return {
            ...m,
            price: item.price + (usual?.priceChange ?? 0),
            load: item.load as 1 | 2 | 3,
            soldOut: !item.available,
          };
        }),
        soups: b.soups,
        soupToday: b.soupOfTheDay?.name ?? b.soups[0]?.name ?? "",
        catalogFrom: "api",
        catalogIds: Object.fromEntries(b.menu.flatMap((c) => c.items).map((i) => [i.name, i.id])),
        photos: Object.fromEntries(
          [...b.menu.flatMap((c) => c.items), ...b.soups].flatMap((x) =>
            x.imageId ? [[x.name, api!.mediaUrl(x.imageId)]] : [],
          ),
        ),
      }));
      return b;
    },
  });
  // Staff photos, for People, the profile view, and the top bar (3.1). Staff only, so it waits
  // for someone to sign in and fetches again when the person changes.
  useQuery({
    queryKey: [...staffKey, s.userId],
    enabled: !!api && !!s.userId,
    queryFn: async () => {
      const { staff } = await api!.staffPhotos();
      set({
        staffPhotos: Object.fromEntries(
          staff.flatMap((p) =>
            p.photoId
              ? [
                  [
                    p.code,
                    {
                      uri: api!.mediaUrl(p.photoId),
                      sourceKind: p.sourceKind,
                      author: p.author,
                      licence: p.licence,
                      sourceUrl: p.sourceUrl,
                    },
                  ],
                ]
              : [],
          ),
        ),
      });
      return staff;
    },
  });
  // The staff list, from the database, for managers (MGR-03, MGR-04). Other roles keep the demo
  // list for now; it moves to the API with the rest of their screens (build step 6).
  useQuery({
    queryKey: [...peopleKey, s.userId],
    enabled: !!api && !!s.userId && myRole(s) === "manager",
    queryFn: async () => {
      const { people } = await api!.people();
      set({
        people: people.map((p): Person => ({
          id: p.code,
          name: p.fullName,
          role: p.role,
          job: p.jobTitle ?? "",
          phone: p.phone ?? "",
          active: p.status === "active",
          owner: p.isOwner,
          gender: p.gender ?? undefined,
          homeAddress: p.homeAddress ?? undefined,
          email: p.email ?? undefined,
          username: p.username ?? undefined,
        })),
      });
      return people;
    },
  });
  return null;
}

export const peopleKey = ["people"] as const;
export const refreshPeople = () => client.invalidateQueries({ queryKey: peopleKey });

export const staffKey = ["staff-photos"] as const;
export const refreshStaff = () => client.invalidateQueries({ queryKey: staffKey });

export const refreshCatalog = () => client.invalidateQueries({ queryKey: catalogKey });
