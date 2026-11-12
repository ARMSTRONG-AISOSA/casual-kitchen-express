// Mock menu for building the screens. Prices are the mock prices in docs/Casual-Kitchen-Express.md.
// The real menu comes from the API once the backend exists.
import type { LoadLevel } from "@cke/types";

export type CategoryId = "rice" | "soup" | "protein" | "snacks" | "drinks" | "combos";
export type OptionKind = "protein" | "soup";

export type MenuItem = {
  id: string;
  cat: CategoryId;
  name: string;
  desc: string;
  price: number;
  opts?: OptionKind;
  soldOut?: boolean;
  load: LoadLevel;
};

export const CATEGORIES: { id: CategoryId | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "rice", label: "Rice meals" },
  { id: "soup", label: "Soups and swallows" },
  { id: "protein", label: "Proteins and sides" },
  { id: "snacks", label: "Snacks" },
  { id: "drinks", label: "Drinks" },
  { id: "combos", label: "Combos" },
];

export const MENU: MenuItem[] = [
  {
    id: "jollof",
    cat: "rice",
    name: "Jollof rice",
    desc: "Smoky party-style jollof, cooked slowly the home way.",
    price: 2000,
    opts: "protein",
    load: 2,
  },
  {
    id: "fried",
    cat: "rice",
    name: "Fried rice",
    desc: "Vegetable fried rice with green peas and liver.",
    price: 2200,
    opts: "protein",
    load: 2,
  },
  {
    id: "ricecombo",
    cat: "rice",
    name: "Rice combo",
    desc: "Half jollof, half fried rice, for days you can’t choose.",
    price: 2500,
    opts: "protein",
    load: 2,
  },
  {
    id: "soup",
    cat: "soup",
    name: "Soup of the day",
    desc: "Today it’s egusi. Comes with one swallow.",
    price: 3000,
    opts: "soup",
    load: 3,
  },
  {
    id: "poundo",
    cat: "soup",
    name: "Pounded yam (extra)",
    desc: "One extra wrap.",
    price: 1000,
    load: 3,
  },
  { id: "eba", cat: "soup", name: "Eba (extra)", desc: "One extra wrap.", price: 700, load: 3 },
  {
    id: "xsoup",
    cat: "soup",
    name: "Extra soup",
    desc: "A second bowl of today’s soup.",
    price: 1200,
    load: 3,
  },
  {
    id: "chicken",
    cat: "protein",
    name: "Chicken",
    desc: "One piece, peppered.",
    price: 1800,
    load: 2,
  },
  { id: "beef", cat: "protein", name: "Beef", desc: "One portion, stewed.", price: 1000, load: 2 },
  {
    id: "fish",
    cat: "protein",
    name: "Fish",
    desc: "One piece, fried.",
    price: 1500,
    soldOut: true,
    load: 2,
  },
  {
    id: "plantain",
    cat: "protein",
    name: "Fried plantain",
    desc: "Sweet, ripe dodo.",
    price: 800,
    load: 2,
  },
  {
    id: "moimoi",
    cat: "protein",
    name: "Moi moi",
    desc: "Steamed bean pudding.",
    price: 800,
    load: 2,
  },
  {
    id: "coleslaw",
    cat: "protein",
    name: "Coleslaw",
    desc: "Fresh and creamy.",
    price: 600,
    load: 2,
  },
  {
    id: "meatpie",
    cat: "snacks",
    name: "Meat pie",
    desc: "Flaky pastry, minced beef filling.",
    price: 1200,
    load: 1,
  },
  {
    id: "springrolls",
    cat: "snacks",
    name: "Spring rolls",
    desc: "Set of three.",
    price: 1500,
    load: 1,
  },
  {
    id: "doughnut",
    cat: "snacks",
    name: "Doughnut",
    desc: "Soft and sugared.",
    price: 500,
    load: 1,
  },
  { id: "water", cat: "drinks", name: "Bottled water", desc: "75 cl.", price: 300, load: 1 },
  { id: "soda", cat: "drinks", name: "Soft drink", desc: "Chilled, 50 cl.", price: 500, load: 1 },
  { id: "yoghurt", cat: "drinks", name: "Yoghurt drink", desc: "Chilled.", price: 1000, load: 1 },
  {
    id: "classic",
    cat: "combos",
    name: "Classic Jollof Combo",
    desc: "Jollof rice, chicken, fried plantain, and a soft drink.",
    price: 4800,
    load: 2,
  },
  {
    id: "office",
    cat: "combos",
    name: "Office Lunch Combo",
    desc: "Fried rice, beef, coleslaw, and bottled water.",
    price: 4100,
    load: 2,
  },
  {
    id: "homeplate",
    cat: "combos",
    name: "Home Plate",
    desc: "Soup of the day with pounded yam, fish, and water.",
    price: 5000,
    load: 3,
  },
];

export type ProteinId = "chicken" | "beef" | "fish" | "none";
export type SoupId = "egusi" | "efo" | "ogbono";
export type SwallowId = "eba" | "poundo";

export const PROTEINS: { id: ProteinId; label: string; price: number; soldOut?: boolean }[] = [
  { id: "chicken", label: "Chicken", price: 1800 },
  { id: "beef", label: "Beef", price: 1000 },
  { id: "fish", label: "Fish", price: 1500, soldOut: true },
  { id: "none", label: "No protein", price: 0 },
];

/** Soups the kitchen cooks. A manager picks one as the soup of the day (KIT-17). */
export const SOUPS: { id: SoupId; label: string }[] = [
  { id: "egusi", label: "Egusi" },
  { id: "efo", label: "Efo riro" },
  { id: "ogbono", label: "Ogbono" },
];

/** A dish's description, with today's soup filled in. */
export const describe = (it: MenuItem, soup: SoupId) =>
  it.id === "soup"
    ? `Today it’s ${(SOUPS.find((x) => x.id === soup)?.label ?? "egusi").toLowerCase()}. Comes with one swallow.`
    : it.desc;

export const SWALLOWS: { id: SwallowId; label: string }[] = [
  { id: "eba", label: "Eba" },
  { id: "poundo", label: "Pounded yam" },
];

/** The neighbourhood list from docs/list-of-areas.md, section 8. */
export const AREAS = [
  "Ugbowo",
  "Ekosodin",
  "BDPA estate",
  "Osasogie",
  "Uselu",
  "Uwelu",
  "Isihor",
  "Idunmwowina",
  "Iguosa",
  "Oluku (up to Oluku Market)",
  "Other area in range",
];

export const findItem = (id: string) => MENU.find((m) => m.id === id);
