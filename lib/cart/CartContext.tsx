"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
  type AddOn,
  type Product,
  type SpiceLevel,
} from "@/lib/data/menu";

export type CartItem = {
  /** Stable line id (product + chosen options) so identical configs merge. */
  lineId: string;
  product: Product;
  quantity: number;
  spice?: SpiceLevel;
  addOns: AddOn[];
};

export type DeliveryType = "delivery" | "pickup";

type CartState = {
  items: CartItem[];
  deliveryType: DeliveryType;
};

type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; lineId: string }
  | { type: "SET_QTY"; lineId: string; quantity: number }
  | { type: "SET_DELIVERY"; deliveryType: DeliveryType }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; state: CartState };

const STORAGE_KEY = "makiblitz-cart";

function makeLineId(
  productId: string,
  spice: SpiceLevel | undefined,
  addOns: AddOn[],
): string {
  const addonKey = addOns
    .map((a) => a.id)
    .sort()
    .join(",");
  return [productId, spice ?? "", addonKey].join("|");
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "ADD": {
      const existing = state.items.find((i) => i.lineId === action.item.lineId);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.lineId === action.item.lineId
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i,
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case "REMOVE":
      return {
        ...state,
        items: state.items.filter((i) => i.lineId !== action.lineId),
      };
    case "SET_QTY":
      return {
        ...state,
        items: state.items
          .map((i) =>
            i.lineId === action.lineId
              ? { ...i, quantity: Math.max(0, action.quantity) }
              : i,
          )
          .filter((i) => i.quantity > 0),
      };
    case "SET_DELIVERY":
      return { ...state, deliveryType: action.deliveryType };
    case "CLEAR":
      return { ...state, items: [] };
    default:
      return state;
  }
}

const initialState: CartState = { items: [], deliveryType: "delivery" };

type CartContextValue = {
  items: CartItem[];
  deliveryType: DeliveryType;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDeliveryRemaining: number;
  addItem: (
    product: Product,
    opts?: { quantity?: number; spice?: SpiceLevel; addOns?: AddOn[] },
  ) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  setDeliveryType: (type: DeliveryType) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", state: JSON.parse(raw) });
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  // Persist on change. § 25 TDDDG: never touch storage for pristine visitors
  // (e.g. on the coming-soon page) — only once there is real cart state.
  useEffect(() => {
    try {
      const isPristine =
        state.items.length === 0 &&
        state.deliveryType === initialState.deliveryType;
      if (isPristine && localStorage.getItem(STORAGE_KEY) === null) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode etc.) — cart just won't persist */
    }
  }, [state]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = state.items.reduce((sum, i) => {
      const addOnTotal = i.addOns.reduce((s, a) => s + a.price, 0);
      return sum + (i.product.price + addOnTotal) * i.quantity;
    }, 0);
    const deliveryFee =
      state.deliveryType === "pickup" || subtotal >= FREE_DELIVERY_THRESHOLD
        ? 0
        : DELIVERY_FEE;
    const freeDeliveryRemaining = Math.max(
      0,
      FREE_DELIVERY_THRESHOLD - subtotal,
    );

    return {
      items: state.items,
      deliveryType: state.deliveryType,
      itemCount,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      freeDeliveryRemaining,
      addItem: (product, opts) => {
        const quantity = opts?.quantity ?? 1;
        const addOns = opts?.addOns ?? [];
        const spice = opts?.spice;
        dispatch({
          type: "ADD",
          item: {
            lineId: makeLineId(product.id, spice, addOns),
            product,
            quantity,
            spice,
            addOns,
          },
        });
      },
      removeItem: (lineId) => dispatch({ type: "REMOVE", lineId }),
      setQuantity: (lineId, quantity) =>
        dispatch({ type: "SET_QTY", lineId, quantity }),
      setDeliveryType: (deliveryType) =>
        dispatch({ type: "SET_DELIVERY", deliveryType }),
      clear: () => dispatch({ type: "CLEAR" }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
