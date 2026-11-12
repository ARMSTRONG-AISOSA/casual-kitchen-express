import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { cashExpectedToday, log, useStore } from "../../src/state/store";
import { Button, Card, Field, KV, Page, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

// Cash-up at close (ACC-04): the person on the counter counts the drawer. The account officer or a
// manager signs it off in Finance.
export default function CashUp() {
  const { s, set } = useStore();
  const toast = useToast();
  const expected = cashExpectedToday(s);
  const [counted, setCounted] = useState(s.today.counted !== null ? String(s.today.counted) : "");
  const n = Number(counted.replace(/[^0-9]/g, ""));
  const diff = counted ? n - expected : 0;
  return (
    <Page>
      <T muted>Today, before the 8:30 pm sign-out.</T>
      <Card>
        <KV k="Cash expected" v={naira(expected)} />
        <T v="small" muted style={{ marginTop: 6 }}>
          Walk-in cash payments today, minus cash refunds.
        </T>
        <Field
          label="Cash counted in the drawer"
          value={counted}
          onChangeText={setCounted}
          keyboardType="number-pad"
          placeholder="For example 42600"
        />
        {counted ? (
          <KV
            k="Difference"
            v={diff === 0 ? "None" : `${diff > 0 ? "Over" : "Short"} ${naira(Math.abs(diff))}`}
            strong
          />
        ) : null}
      </Card>
      <Button
        label="Save the cash-up"
        disabled={!counted}
        style={{ marginTop: 16 }}
        onPress={() => {
          set((st) => ({
            today: { counted: n, countedBy: st.userId ?? undefined },
            ...log(st, "money", `Counted ${naira(n)} at close (expected ${naira(expected)})`),
          }));
          toast("Cash-up saved");
          router.back();
        }}
      />
    </Page>
  );
}
