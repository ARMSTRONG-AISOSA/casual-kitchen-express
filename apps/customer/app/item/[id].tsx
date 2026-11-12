import { naira } from "@cke/brand-tokens";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { describe, findItem, PROTEINS, SOUPS, SWALLOWS } from "../../src/data/menu";
import {
  addLine,
  defaults,
  makeLine,
  unitPrice,
  useStore,
  type Options,
} from "../../src/state/store";
import { Button, Option, Qty, Screen, T, TopBar } from "../../src/ui/kit";
import { PhotoPlaceholder } from "../../src/ui/photo";
import { useToast } from "../../src/ui/toast";

// Dish details: the usual options are already chosen, so most people just tap Add (CUS-03).
export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = findItem(id ?? "");
  const { s, set } = useStore();
  const toast = useToast();
  const [opt, setOpt] = useState<Options>(item ? defaults(item, s.soupToday) : {});
  const [qty, setQty] = useState(1);

  if (!item) {
    return (
      <Screen header={<TopBar title="Dish not found" />}>
        <T muted>This dish isn’t on the menu any more.</T>
      </Screen>
    );
  }

  const total = unitPrice(item, opt) * qty;
  const add = () => {
    set((s) => ({ cart: addLine(s.cart, makeLine(item.id, opt, qty)) }));
    toast(`${item.name} added`);
    router.back();
  };

  return (
    <Screen
      header={<TopBar />}
      footer={
        <Button
          label={item.soldOut ? "Sold out today" : `Add to order, ${naira(total)}`}
          onPress={add}
          disabled={item.soldOut}
        />
      }
    >
      <PhotoPlaceholder height={220} label={item.name} style={{ borderRadius: 20 }} />
      <T v="display" style={{ marginTop: 14 }}>
        {item.name}
      </T>
      <T muted style={{ marginTop: 4 }}>
        {describe(item, s.soupToday)}
      </T>
      <T style={{ marginTop: 8 }}>
        <T bold>{naira(item.price)}</T>
        {item.opts === "protein" ? " before protein" : ""}
      </T>

      {item.opts === "protein" ? (
        <Group title="Protein" hint="Pick one">
          {PROTEINS.map((p) => (
            <Option
              key={p.id}
              label={p.soldOut ? `${p.label} (sold out)` : p.label}
              extra={p.price ? `+${naira(p.price)}` : undefined}
              selected={opt.protein === p.id}
              disabled={p.soldOut}
              onPress={() => setOpt({ ...opt, protein: p.id })}
            />
          ))}
        </Group>
      ) : null}

      {item.opts === "soup" ? (
        <>
          <Group
            title="Soup"
            hint={`Today’s pot is ${(SOUPS.find((x) => x.id === s.soupToday)?.label ?? "").toLowerCase()}`}
          >
            {SOUPS.map((p) => (
              <Option
                key={p.id}
                label={p.id === s.soupToday ? `${p.label} (today)` : `${p.label} (not today)`}
                selected={opt.soup === p.id}
                disabled={p.id !== s.soupToday}
                onPress={() => setOpt({ ...opt, soup: p.id })}
              />
            ))}
          </Group>
          <Group title="Swallow">
            {SWALLOWS.map((p) => (
              <Option
                key={p.id}
                label={p.label}
                selected={opt.swallow === p.id}
                onPress={() => setOpt({ ...opt, swallow: p.id })}
              />
            ))}
          </Group>
        </>
      ) : null}

      <Group title="How many?">
        <View style={{ marginTop: 6 }}>
          <Qty value={qty} onChange={setQty} min={1} />
        </View>
      </Group>
    </Screen>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 22 }}>
      <T v="h2">{title}</T>
      {hint ? (
        <T v="small" muted>
          {hint}
        </T>
      ) : null}
      {children}
    </View>
  );
}
