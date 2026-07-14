import { Shell } from "@/components/layout/Shell";
import { User, Clock, MapPin, Heart, Gift } from "lucide-react";

export const metadata = { title: "Profile — MakiLove" };

const ITEMS = [
  { icon: Clock, label: "Order history", note: "Past orders & reorder" },
  { icon: MapPin, label: "Addresses", note: "Delivery locations" },
  { icon: Heart, label: "Favourites", note: "Your saved dishes" },
  { icon: Gift, label: "Loyalty", note: "10 points per €1 spent" },
];

export default function ProfilePage() {
  return (
    <Shell className="space-y-8 pt-4">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-gradient shadow-brand">
          <User className="h-7 w-7 text-white" />
        </span>
        <div>
          <h1 className="font-display text-2xl text-white">Guest</h1>
          <p className="text-sm text-white/60">Sign in to save your orders</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ITEMS.map(({ icon: Icon, label, note }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-card bg-white/5 p-4"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
              <Icon className="h-5 w-5 text-brand-light" />
            </span>
            <div>
              <p className="font-semibold text-white">{label}</p>
              <p className="text-xs text-white/55">{note}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="rounded-card border border-white/10 bg-white/5 p-4 text-center text-xs text-white/45">
        Accounts, order history & loyalty are wired to the backend in a later
        phase.
      </p>
    </Shell>
  );
}
