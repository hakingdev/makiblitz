/**
 * Mock catalogue for Makiblitz.
 * Frontend-only data — replaced by the MongoDB / API layer later.
 * Shape mirrors the dumbospizza Product/Category models (simplified).
 */

export type Category = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
};

export type AddOn = {
  id: string;
  name: string;
  price: number;
  emoji: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  ingredients: string[];
  price: number;
  categorySlug: string;
  emoji: string;
  rating: number;
  popular?: boolean;
  featured?: boolean;
  hasSpice?: boolean;
  addOns: AddOn[];
};

export const SPICE_LEVELS = ["Mild", "Medium", "Spicy"] as const;
export type SpiceLevel = (typeof SPICE_LEVELS)[number];

export const FREE_DELIVERY_THRESHOLD = 30;
export const DELIVERY_FEE = 3.5;

export const categories: Category[] = [
  { id: "c1", name: "Nigiri", slug: "nigiri", emoji: "🍣" },
  { id: "c2", name: "Maki Rolls", slug: "maki-rolls", emoji: "🍙" },
  { id: "c3", name: "Sashimi", slug: "sashimi", emoji: "🐟" },
  { id: "c4", name: "Sushi Sets", slug: "sushi-sets", emoji: "🍱" },
  { id: "c5", name: "Drinks", slug: "drinks", emoji: "🥤" },
];

const DEFAULT_ADDONS: AddOn[] = [
  { id: "a1", name: "Extra Wasabi", price: 0.5, emoji: "🌿" },
  { id: "a2", name: "Extra Ginger", price: 0.5, emoji: "🧄" },
  { id: "a3", name: "Double Shrimp", price: 1.2, emoji: "🦐" },
  { id: "a4", name: "Soy Sauce", price: 0.3, emoji: "🍶" },
];

export const products: Product[] = [
  {
    id: "p1",
    slug: "dragon-sushi-roll",
    name: "Dragon Sushi Roll",
    description: "Shrimp tempura roll topped with avocado & house sauce.",
    longDescription:
      "Shrimp tempura roll topped with avocado and our special house eel sauce. Hand-rolled by master chefs every morning.",
    ingredients: ["Rice", "Shrimp Tempura", "Avocado", "Nori", "Eel Sauce"],
    price: 12.5,
    categorySlug: "maki-rolls",
    emoji: "🐉",
    rating: 4.9,
    featured: true,
    popular: true,
    hasSpice: true,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p2",
    slug: "tuna-maki-roll",
    name: "Tuna Maki Roll",
    description: "Classic tuna roll with seaweed.",
    longDescription:
      "A timeless classic — fresh tuna and sushi rice wrapped in crisp nori seaweed. Simple, clean, delicious.",
    ingredients: ["Rice", "Tuna", "Nori"],
    price: 6.9,
    categorySlug: "maki-rolls",
    emoji: "🍙",
    rating: 4.7,
    popular: true,
    hasSpice: true,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p3",
    slug: "sashimi-platter",
    name: "Sashimi Platter",
    description: "Assorted premium raw fish.",
    longDescription:
      "A chef-selected assortment of premium raw fish, sliced to order: salmon, tuna and yellowtail.",
    ingredients: ["Salmon", "Tuna", "Yellowtail"],
    price: 18.0,
    categorySlug: "sashimi",
    emoji: "🐟",
    rating: 4.8,
    popular: true,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p4",
    slug: "salmon-nigiri",
    name: "Salmon Nigiri",
    description: "Hand-pressed rice with fresh salmon.",
    longDescription:
      "Two pieces of hand-pressed vinegared rice topped with a generous slice of fresh Atlantic salmon.",
    ingredients: ["Rice", "Salmon"],
    price: 5.5,
    categorySlug: "nigiri",
    emoji: "🍣",
    rating: 4.6,
    popular: true,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p5",
    slug: "spicy-salmon-roll",
    name: "Spicy Salmon Roll",
    description: "Salmon, spicy mayo & cucumber.",
    longDescription:
      "Fresh salmon tossed in spicy mayo with crunchy cucumber, rolled in seasoned rice and nori.",
    ingredients: ["Rice", "Salmon", "Spicy Mayo", "Cucumber", "Nori"],
    price: 9.9,
    categorySlug: "maki-rolls",
    emoji: "🌶️",
    rating: 4.8,
    featured: true,
    hasSpice: true,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p6",
    slug: "ebi-nigiri",
    name: "Ebi Nigiri",
    description: "Sweet poached shrimp over rice.",
    longDescription:
      "Two pieces of nigiri topped with sweet, tender poached shrimp (ebi).",
    ingredients: ["Rice", "Shrimp"],
    price: 5.9,
    categorySlug: "nigiri",
    emoji: "🦐",
    rating: 4.5,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p7",
    slug: "makiblitz-deluxe-set",
    name: "Makiblitz Deluxe Set",
    description: "24 pieces — chef's signature selection.",
    longDescription:
      "Our signature 24-piece set: a curated mix of nigiri, maki rolls and sashimi. Perfect for sharing.",
    ingredients: ["Assorted Nigiri", "Maki Rolls", "Sashimi"],
    price: 34.0,
    categorySlug: "sushi-sets",
    emoji: "🍱",
    rating: 5.0,
    featured: true,
    popular: true,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p8",
    slug: "tuna-sashimi",
    name: "Tuna Sashimi",
    description: "Five slices of premium maguro.",
    longDescription:
      "Five thick slices of premium maguro (bluefin tuna), served chilled.",
    ingredients: ["Tuna"],
    price: 14.5,
    categorySlug: "sashimi",
    emoji: "🐟",
    rating: 4.7,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p9",
    slug: "green-tea",
    name: "Matcha Green Tea",
    description: "Hot ceremonial-grade matcha.",
    longDescription:
      "Ceremonial-grade matcha whisked to a smooth, frothy finish. Served hot.",
    ingredients: ["Matcha"],
    price: 3.5,
    categorySlug: "drinks",
    emoji: "🍵",
    rating: 4.4,
    addOns: [],
  },
  {
    id: "p10",
    slug: "ramune-soda",
    name: "Ramune Soda",
    description: "Japanese marble soda — original.",
    longDescription:
      "The iconic Japanese marble soda with a refreshing original flavour.",
    ingredients: ["Soda"],
    price: 2.9,
    categorySlug: "drinks",
    emoji: "🥤",
    rating: 4.3,
    addOns: [],
  },
  {
    id: "p11",
    slug: "california-roll",
    name: "California Roll",
    description: "Crab, avocado & cucumber inside-out.",
    longDescription:
      "The crowd favourite — crab stick, avocado and cucumber in an inside-out roll dusted with sesame.",
    ingredients: ["Rice", "Crab", "Avocado", "Cucumber", "Sesame"],
    price: 8.5,
    categorySlug: "maki-rolls",
    emoji: "🥑",
    rating: 4.6,
    popular: true,
    addOns: DEFAULT_ADDONS,
  },
  {
    id: "p12",
    slug: "miso-set",
    name: "Miso Lunch Set",
    description: "12 pieces with miso soup.",
    longDescription:
      "A balanced 12-piece lunch set served with a warm bowl of miso soup.",
    ingredients: ["Assorted Sushi", "Miso Soup"],
    price: 16.5,
    categorySlug: "sushi-sets",
    emoji: "🍲",
    rating: 4.7,
    addOns: DEFAULT_ADDONS,
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.categorySlug === categorySlug);
}

export function getFeatured(): Product[] {
  return products.filter((p) => p.featured);
}

export function getPopular(): Product[] {
  return products.filter((p) => p.popular);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
