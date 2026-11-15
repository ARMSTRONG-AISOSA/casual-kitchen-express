import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import * as t from "../db/schema";

/** One line of a new order as an app sends it: the item, its option, and how many. */
export const orderLine = z.object({
  itemId: z.uuid(),
  // Items with options take exactly one (a protein or a swallow). Leaving it out takes the
  // default, so one tap adds the default (CUS-03).
  optionId: z.uuid().optional(),
  quantity: z.number().int().min(1).max(20),
  notes: z.string().trim().max(200).optional(),
});
export const orderLines = z.array(orderLine).min(1, "Add something to the order").max(30);
export type OrderLineInput = z.infer<typeof orderLine>;

export type PricedLine = {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: string[];
  notes: string | null;
  station: (typeof t.station.enumValues)[number];
  load: number;
};

type Priced =
  | { ok: true; lines: PricedLine[]; foodTotal: number; load: number; soupVarietyId: string | null }
  | { ok: false; error: string };

/**
 * Prices an order on the server from the current menu, never from what the app sends (4.6, 18.2).
 * Each line keeps the name and price as they were when ordered. A soup dish takes today's soup.
 */
export async function priceLines(db: Db, input: OrderLineInput[]): Promise<Priced> {
  const ids = [...new Set(input.map((l) => l.itemId))];
  const [items, options, [s]] = await Promise.all([
    db.select().from(t.menuItem).where(inArray(t.menuItem.id, ids)),
    db.select().from(t.itemOption).where(inArray(t.itemOption.itemId, ids)),
    db.select().from(t.setting).where(eq(t.setting.id, 1)),
  ]);
  const soup = s?.soupVarietyId
    ? (
        await db
          .select({ id: t.soupVariety.id, name: t.soupVariety.name })
          .from(t.soupVariety)
          .where(and(eq(t.soupVariety.id, s.soupVarietyId), eq(t.soupVariety.active, true)))
      )[0]
    : undefined;

  const lines: PricedLine[] = [];
  let usesSoup = false;
  for (const l of input) {
    const item = items.find((i) => i.id === l.itemId);
    if (!item || item.archived)
      return { ok: false, error: "Something in the order is no longer on the menu" };
    if (!item.available)
      return { ok: false, error: `${item.name} is sold out. Remove it to continue.` };
    const own = options.filter((o) => o.itemId === item.id);
    let option: (typeof own)[number] | undefined;
    if (own.length) {
      option = l.optionId
        ? own.find((o) => o.id === l.optionId)
        : (own.find((o) => o.isDefault) ?? own[0]);
      if (!option) return { ok: false, error: `That choice isn’t available for ${item.name}` };
    } else if (l.optionId) {
      return { ok: false, error: `${item.name} has no choices` };
    }
    let name = item.name;
    if (item.isSoup) {
      if (!soup) return { ok: false, error: "Today’s soup isn’t set yet. Ask the restaurant." };
      usesSoup = true;
      name = `${item.name} (${soup.name})`;
    }
    lines.push({
      itemId: item.id,
      name,
      unitPrice: item.price + (option?.priceChange ?? 0),
      quantity: l.quantity,
      options: option ? [option.name] : [],
      notes: l.notes || null,
      station: item.station,
      load: item.load,
    });
  }
  return {
    ok: true,
    lines,
    foodTotal: lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    load: lines.reduce((sum, l) => sum + l.load * l.quantity, 0),
    soupVarietyId: usesSoup ? soup!.id : null,
  };
}
