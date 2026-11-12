import { QueryClient, QueryClientProvider, focusManager, useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { AppState } from "react-native";
import { api } from "../api";
import { useStore } from "./store";

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

/** Copies the soups from the API into the app’s state, so every screen reads one place. */
function CatalogSync() {
  const { set } = useStore();
  useQuery({
    queryKey: catalogKey,
    enabled: !!api,
    queryFn: async () => {
      const b = await api!.bootstrap();
      set({
        soups: b.soups.map((x) => x.name),
        soupToday: b.soupOfTheDay?.name ?? b.soups[0]?.name ?? "",
        catalogFrom: "api",
        // Dish photos by name, and each soup's own photo, which the soup dishes show (KIT-17).
        photos: Object.fromEntries(
          [...b.menu.flatMap((c) => c.items), ...b.soups].flatMap((x) =>
            x.imageId ? [[x.name, api!.mediaUrl(x.imageId)]] : [],
          ),
        ),
      });
      return b;
    },
  });
  return null;
}

export const refreshCatalog = () => client.invalidateQueries({ queryKey: catalogKey });
