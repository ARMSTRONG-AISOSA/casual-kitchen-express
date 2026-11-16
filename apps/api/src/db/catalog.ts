// The starting menu, soups, and areas. Prices are the mock prices in docs/Casual-Kitchen-Express.md
// section 4; areas are docs/list-of-areas.md section 8. Managers change all of this in the app.

type Station = "rice" | "soups_and_swallows" | "snacks_and_drinks";
type Options = "protein" | "swallow";

export type CatalogItem = {
  name: string;
  description: string;
  price: number;
  station: Station;
  load: 1 | 2 | 3;
  options?: Options;
  isSoup?: boolean;
};

export const CATEGORIES: { name: string; items: CatalogItem[] }[] = [
  {
    name: "Rice meals",
    items: [
      {
        name: "Jollof rice",
        description: "Smoky party-style jollof, cooked slowly the home way.",
        price: 2000,
        station: "rice",
        load: 2,
        options: "protein",
      },
      {
        name: "Fried rice",
        description: "Vegetable fried rice with green peas and liver.",
        price: 2200,
        station: "rice",
        load: 2,
        options: "protein",
      },
      {
        name: "Rice combo",
        description: "Half jollof, half fried rice, for days you can’t choose.",
        price: 2500,
        station: "rice",
        load: 2,
        options: "protein",
      },
    ],
  },
  {
    name: "Soups and swallows",
    items: [
      {
        name: "Soup of the day",
        description: "Comes with one swallow.",
        price: 3000,
        station: "soups_and_swallows",
        load: 3,
        options: "swallow",
        isSoup: true,
      },
      {
        name: "Pounded yam (extra)",
        description: "One extra wrap.",
        price: 1000,
        station: "soups_and_swallows",
        load: 3,
      },
      {
        name: "Eba (extra)",
        description: "One extra wrap.",
        price: 700,
        station: "soups_and_swallows",
        load: 3,
      },
      {
        name: "Extra soup",
        description: "A second bowl of today’s soup.",
        price: 1200,
        station: "soups_and_swallows",
        load: 3,
        isSoup: true,
      },
    ],
  },
  {
    name: "Proteins and sides",
    items: [
      {
        name: "Chicken",
        description: "One piece, peppered.",
        price: 1800,
        station: "rice",
        load: 2,
      },
      { name: "Beef", description: "One portion, stewed.", price: 1000, station: "rice", load: 2 },
      { name: "Fish", description: "One piece, fried.", price: 1500, station: "rice", load: 2 },
      {
        name: "Fried plantain",
        description: "Sweet, ripe dodo.",
        price: 800,
        station: "rice",
        load: 2,
      },
      {
        name: "Moi moi",
        description: "Steamed bean pudding.",
        price: 800,
        station: "rice",
        load: 2,
      },
      { name: "Coleslaw", description: "Fresh and creamy.", price: 600, station: "rice", load: 2 },
    ],
  },
  {
    name: "Snacks",
    items: [
      {
        name: "Meat pie",
        description: "Flaky pastry, minced beef filling.",
        price: 1200,
        station: "snacks_and_drinks",
        load: 1,
      },
      {
        name: "Spring rolls",
        description: "Set of three.",
        price: 1500,
        station: "snacks_and_drinks",
        load: 1,
      },
      {
        name: "Doughnut",
        description: "Soft and sugared.",
        price: 500,
        station: "snacks_and_drinks",
        load: 1,
      },
    ],
  },
  {
    name: "Drinks",
    items: [
      {
        name: "Bottled water",
        description: "75 cl.",
        price: 300,
        station: "snacks_and_drinks",
        load: 1,
      },
      {
        name: "Soft drink",
        description: "Chilled, 50 cl.",
        price: 500,
        station: "snacks_and_drinks",
        load: 1,
      },
      {
        name: "Yoghurt drink",
        description: "Chilled.",
        price: 1000,
        station: "snacks_and_drinks",
        load: 1,
      },
    ],
  },
  {
    name: "Combos",
    items: [
      {
        name: "Classic Jollof Combo",
        description: "Jollof rice, chicken, fried plantain, and a soft drink.",
        price: 4800,
        station: "rice",
        load: 2,
      },
      {
        name: "Office Lunch Combo",
        description: "Fried rice, beef, coleslaw, and bottled water.",
        price: 4100,
        station: "rice",
        load: 2,
      },
      {
        name: "Home Plate",
        description: "Soup of the day with pounded yam, fish, and water.",
        price: 5000,
        station: "soups_and_swallows",
        load: 3,
        isSoup: true,
      },
    ],
  },
];

/** Option lists. The first is the default (CUS-03: one tap adds the default). */
export const OPTIONS: Record<Options, { name: string; priceChange: number }[]> = {
  protein: [
    { name: "Chicken", priceChange: 1800 },
    { name: "Beef", priceChange: 1000 },
    { name: "Fish", priceChange: 1500 },
    { name: "No protein", priceChange: 0 },
  ],
  swallow: [
    { name: "Eba", priceChange: 0 },
    { name: "Pounded yam", priceChange: 0 },
  ],
};

export const SOUPS = ["Egusi", "Efo riro", "Ogbono"];

export const NEIGHBOURHOODS = [
  "Ugbowo",
  "Ekosodin",
  "BDPA estate",
  "Osasogie",
  "Uselu",
  "Uwelu",
  "Evbogida",
  "Isihor",
  "Idunmwowina",
  "Iguosa",
  "Oluku (up to Oluku Market)",
];
