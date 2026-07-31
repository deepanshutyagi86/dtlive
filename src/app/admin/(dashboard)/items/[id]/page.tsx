import { notFound } from "next/navigation";
import { getItemById } from "@/lib/items";
import ItemForm, { ExistingItem } from "./ItemForm";

export const dynamic = "force-dynamic";

export default async function AdminItemEditPage({ params }: { params: { id: string } }) {
  const isNew = params.id === "new";
  let existing: ExistingItem | null = null;

  if (!isNew) {
    const item = await getItemById(params.id);
    if (!item) notFound();
    existing = item as unknown as ExistingItem;
  }

  return (
    <div>
      <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">
        {isNew ? "New" : "Edit"}
      </p>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mb-8">
        {isNew ? "Add item" : existing!.title}
      </h1>
      <ItemForm existing={existing} />
    </div>
  );
}
