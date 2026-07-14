import { Shell } from "@/components/layout/Shell";
import { CartView } from "@/components/cart/CartView";

export const metadata = { title: "Cart — MakiLove" };

export default function CartPage() {
  return (
    <Shell className="pt-4">
      <CartView />
    </Shell>
  );
}
