/**
 * Speisekarte — 51 dishes as transcribed in the Figma file (Desktop/Mobile ·
 * Speisekarte, component "Menu / Dish row"). Codes are the printed source
 * codes from the menu sheets. Prices in euro.
 *
 * `column` places a category in the two-column desktop layout; the array
 * order is the single-column (mobile) order.
 */

export type Dish = {
  code: string;
  name: string;
  ingredients?: string;
  price: number;
};

export type MenuCategory = {
  id: string;
  title: string;
  note?: string;
  column: "left" | "right";
  dishes: Dish[];
};

export const MENU: MenuCategory[] = [
  {
    id: "appetizers",
    title: "Appetizers / Salate",
    column: "left",
    dishes: [
      { code: "A1", name: "Mini-Frühlingsrollen vegan", ingredients: "7 Stk. · Sweet Chili", price: 7.9 },
      { code: "A2", name: "Frühlingsrollen vegetarisch", ingredients: "7 Stk. · Sweet Chili Mayo", price: 9.9 },
      { code: "A3", name: "Chuka", ingredients: "Chuka · Gurke · Goma Dare · Sesam", price: 11.9 },
      { code: "A4", name: "Bonito Salat mit Thunfisch", ingredients: "Thunfisch · Salat · Gurke · Bonito", price: 13.9 },
      { code: "A5", name: "Frischer vegetarischer Salat", ingredients: "Salat · Avocado · Gurke", price: 6.9 },
      { code: "A6", name: "Spicy Salat mit Lachs", ingredients: "Lachs · Avocado · Gurke · Spicy · Tobiko", price: 11.9 },
    ],
  },
  {
    id: "gunkan-nigiri",
    title: "Gunkan & Nigiri",
    note: "Gunkan · 1 Stk. / Nigiri · 1 Stk.",
    column: "left",
    dishes: [
      { code: "G1", name: "Gunkan Thunfisch", ingredients: "Thunfisch · Paprika · Spicy", price: 6.9 },
      { code: "G2", name: "Gunkan Lachs", ingredients: "Lachs · Gurke · Spicy", price: 6.9 },
      { code: "G3", name: "Gunkan Aal", ingredients: "Aal · Avocado · Unagi", price: 7.9 },
      { code: "N1", name: "Nigiri Lachs", ingredients: "Lachs", price: 5.9 },
      { code: "N2", name: "Nigiri Avocado", ingredients: "Avocado", price: 5.9 },
    ],
  },
  {
    id: "maki",
    title: "Maki",
    note: "6 Stk.",
    column: "right",
    dishes: [
      { code: "M1", name: "Maki Thunfisch", ingredients: "Thunfisch", price: 7.9 },
      { code: "M2", name: "Maki Lachs", ingredients: "Lachs", price: 7.9 },
      { code: "M3", name: "Maki Aal", ingredients: "Aal · Unagi · Sesam", price: 11.9 },
      { code: "M4", name: "Maki mit gebratenem Lachs", ingredients: "Gebratener Lachs", price: 7.9 },
    ],
  },
  {
    id: "philadelphia",
    title: "Philadelphia",
    note: "8 Stk.",
    column: "right",
    dishes: [
      { code: "P1", name: "Philadelphia Klassik", ingredients: "Frischkäse · Gurke · Lachs", price: 12.9 },
      { code: "P2", name: "Philadelphia Ebi", ingredients: "Frischkäse · Gurke · Tigergarnele · Unagi", price: 11.9 },
      { code: "P3", name: "Philadelphia Avocado", ingredients: "Frischkäse · Avocado · Lachs", price: 12.9 },
      { code: "P4", name: "Philadelphia Double Salmon", ingredients: "Frischkäse · Lachs innen & außen", price: 16.9 },
      { code: "P5", name: "Philadelphia Masago", ingredients: "Frischkäse · Gurke · Lachs · Masago", price: 15.9 },
    ],
  },
  {
    id: "california",
    title: "California",
    note: "8 Stk.",
    column: "right",
    dishes: [
      { code: "C1", name: "California Klassik", ingredients: "Frischkäse · Surimi · Avocado · Gurke", price: 8.9 },
      { code: "C2", name: "California Salmon", ingredients: "Frischkäse · Lachs · Avocado · Gurke", price: 10.9 },
      { code: "C3", name: "California Tobiko", ingredients: "Frischkäse · Surimi · Avocado · Gurke · Tobiko", price: 10.9 },
      { code: "C4", name: "California mit gebratenem Lachs", ingredients: "Frischkäse · Gurke · gebratener Lachs · Masago", price: 13.9 },
    ],
  },
  {
    id: "futomaki",
    title: "Futomaki",
    note: "8 Stk.",
    column: "left",
    dishes: [
      { code: "F1", name: "Futomaki mit Thunfisch", ingredients: "Thunfisch · Frischkäse · Gurke · Salat", price: 9.9 },
      { code: "F2", name: "Futomaki mit Aal", ingredients: "Aal · Frischkäse · Avocado · Unagi", price: 14.9 },
      { code: "F3", name: "Futomaki Veggie", ingredients: "Tofu · Avocado · Gurke · Salat", price: 6.9 },
      { code: "F4", name: "Futomaki Klassik", ingredients: "Lachs · Frischkäse · Gurke · Salat", price: 9.9 },
    ],
  },
  {
    id: "special-rolls",
    title: "Special Rolls",
    note: "8 Stk.",
    column: "left",
    dishes: [
      { code: "S1", name: "Ponni Bonito", ingredients: "Lachs · Frischkäse · Gurke · Bonito", price: 10.9 },
      { code: "S2", name: "Crunch Roll", ingredients: "Tempura-Garnele · Frischkäse · Avocado · Röstzwiebeln", price: 8.9 },
      { code: "S3", name: "Green Roll mit Aal", ingredients: "Aal · Frischkäse · Avocado · Unagi", price: 13.9 },
      { code: "S4", name: "Unagi-Drache", ingredients: "Aal · Frischkäse · Avocado · Unagi", price: 16.9 },
      { code: "S5", name: "Crunch Chicken and Cheese Layer", ingredients: "Hähnchen · Frischkäse · Cheddar · Gurke", price: 8.9 },
      { code: "S6", name: "Tiger-Drache", ingredients: "Thunfisch · Surimi · Masago · Tigergarnele", price: 10.9 },
      { code: "S7", name: "Roll Fish", ingredients: "Lachs · Garnele · Aal", price: 17.9 },
      { code: "S8", name: "Green Roll Alaska", ingredients: "Lachs · Frischkäse · Avocado · Unagi", price: 9.9 },
      { code: "S9", name: "Veggie Green Roll", ingredients: "Tofu · Gurke · Salat · Avocado", price: 5.9 },
      { code: "S9", name: "Überbackenes Futomaki mit Garnele", price: 10.9 },
      { code: "S9", name: "Überbackenes Futomaki mit Lachs", price: 9.9 },
      { code: "S9", name: "Überbackenes Uramaki mit Pilzen und Hähnchen", price: 8.9 },
    ],
  },
  {
    id: "hot-rolls",
    title: "Hot Rolls",
    note: "8 Stk.",
    column: "right",
    dishes: [
      { code: "H1", name: "Tempura-Futomaki mit Thunfisch", ingredients: "Frischkäse · Gurke · Thunfisch", price: 10.9 },
      { code: "H2", name: "Tempura-Futomaki Lachs & Krebsfleisch", ingredients: "Frischkäse · Gurke · Lachs · Surimi · Tobiko", price: 13.9 },
      { code: "H3", name: "Tempura-Futomaki mit Aal", ingredients: "Frischkäse · Gurke · Aal · Unagi", price: 17.9 },
      { code: "H4", name: "Tempura-Futomaki mit Lachs", ingredients: "Frischkäse · Gurke · Lachs", price: 11.9 },
    ],
  },
  {
    id: "sushi-burger",
    title: "Sushi Burger",
    column: "right",
    dishes: [
      { code: "B1", name: "Crispy Chick", ingredients: "Reis-Buns · Hähnchen · Salat · Tomate", price: 9.9 },
      { code: "B2", name: "Philadelphia Spicy", ingredients: "Reis-Buns · Thunfisch · Frischkäse · Gurke · Avocado", price: 12.9 },
      { code: "B3", name: "Philadelphia Premium", ingredients: "Reis-Buns · Lachs · Frischkäse · Gurke · Salat", price: 13.9 },
      { code: "B4", name: "Tempura Double Fish", ingredients: "Lachs · Thunfisch · Frischkäse · Gurke", price: 14.9 },
      { code: "B5", name: "Tempura Unagi Hot", ingredients: "Aal · Frischkäse · Salat · Unagi", price: 14.9 },
      { code: "B6", name: "Tempura Tobi Spicy", ingredients: "Lachs · Tobiko · Frischkäse · Gurke", price: 14.9 },
      { code: "B7", name: "Tempura Philadelphia", ingredients: "Lachs · Frischkäse · Gurke · Avocado", price: 14.9 },
    ],
  },
];

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

/** 5.9 → "5,90 €" */
export function formatPrice(value: number): string {
  return euro.format(value);
}
