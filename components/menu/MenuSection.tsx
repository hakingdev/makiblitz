import { formatPrice, type Dish, type MenuCategory } from "@/lib/menu";

/** Menu / Dish row (Figma 15:99) — code, name, price; ingredients indented under the name. */
function DishRow({ dish }: { dish: Dish }) {
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex items-start gap-3 font-bold leading-[26px]">
        <span className="w-9 shrink-0 text-xs text-muted">{dish.code}</span>
        <span className="min-w-0 flex-1 text-lg text-ink">{dish.name}</span>
        <span className="w-[90px] shrink-0 text-right text-lg text-ink">{formatPrice(dish.price)}</span>
      </div>
      {dish.ingredients && (
        <p className="pl-12 text-sm leading-[22px] text-muted">{dish.ingredients}</p>
      )}
    </li>
  );
}

export function MenuSection({ category, idPrefix }: { category: MenuCategory; idPrefix: string }) {
  const headingId = `${idPrefix}-${category.id}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="text-[26px] font-extrabold leading-[34px] text-brand lg:text-[30px] lg:leading-10"
        >
          {category.title}
        </h2>
        {category.note && <p className="text-xs font-bold leading-5 text-muted">{category.note}</p>}
      </div>
      <div className="h-px bg-line" />
      <ul>
        {category.dishes.map((dish) => (
          <DishRow key={`${dish.code}-${dish.name}`} dish={dish} />
        ))}
      </ul>
    </section>
  );
}
