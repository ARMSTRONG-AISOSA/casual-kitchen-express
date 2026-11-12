import { Image } from "expo-image";
import { View } from "react-native";
import { useStore } from "../state/store";
import { useTheme } from "../state/theme";

/** The catalog name of each demo dish, so the Business app can show the same photos (MGR-06). */
export const CATALOG_NAME: Record<string, string> = {
  jollof: "Jollof rice",
  fried: "Fried rice",
  ricecombo: "Rice combo",
  poundo: "Pounded yam (extra)",
  eba: "Eba (extra)",
  chicken: "Chicken",
  beef: "Beef",
  fish: "Fish",
  plantain: "Fried plantain",
  moimoi: "Moi moi",
  coleslaw: "Coleslaw",
  meatpie: "Meat pie",
  springrolls: "Spring rolls",
  doughnut: "Doughnut",
  water: "Bottled water",
  soda: "Soft drink",
  yoghurt: "Yoghurt drink",
  classic: "Classic Jollof Combo",
  office: "Office Lunch Combo",
  homeplate: "Home Plate",
};

/**
 * A small photo for a dish (by its id) or a soup (by its name). The soup dishes show today's soup's
 * photo (KIT-17). Without a photo it’s a plain square.
 */
export function Thumb({ dish, soup, size = 48 }: { dish?: string; soup?: string; size?: number }) {
  const { s } = useStore();
  const t = useTheme();
  const name =
    soup ?? (dish === "soup" || dish === "xsoup" ? s.soupToday : CATALOG_NAME[dish ?? ""]);
  const uri = name ? s.photos[name] : undefined;
  const box = { width: size, height: size, borderRadius: 10, backgroundColor: t.chip };
  return uri ? (
    <Image source={{ uri }} contentFit="cover" style={box} accessibilityLabel={`${name} photo`} />
  ) : (
    <View style={box} accessibilityLabel="No photo yet" />
  );
}
