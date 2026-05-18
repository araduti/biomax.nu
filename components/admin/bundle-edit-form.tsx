"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/components/admin/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateBundle, deleteBundle } from "@/lib/admin/bundle-actions";

type Initial = {
  slug: string;
  name: string;
  description: string;
  discountPercent: number;
  active: boolean;
  productSlugs: string[];
};

export function BundleEditForm({
  initial,
  allProducts,
}: {
  initial: Initial;
  allProducts: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [discountPercent, setDiscountPercent] = useState(
    String(initial.discountPercent)
  );
  const [active, setActive] = useState(initial.active);
  const [selected, setSelected] = useState<string[]>(initial.productSlugs);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();

  function toggle(productSlug: string) {
    setSelected((prev) =>
      prev.includes(productSlug)
        ? prev.filter((s) => s !== productSlug)
        : [...prev, productSlug]
    );
  }

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await updateBundle({
        slug: initial.slug,
        name,
        description: description || null,
        discountPercent: parseInt(discountPercent, 10) || 0,
        active,
        productSlugs: selected,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  async function remove() {
    const ok = await confirmDialog({
      title: "Ta bort paketet?",
      body: `"${initial.name}" tas bort. Pågående ordrar med paketet behåller sin information.`,
      confirmLabel: "Ta bort",
      intent: "destructive",
    });
    if (!ok) return;
    startDelete(async () => {
      const r = await deleteBundle(initial.slug);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/admin/paket");
    });
  }

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="font-sans text-body font-semibold">Aktiv</span>
      </label>

      <Input
        label="Namn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={pending}
      />

      <Input
        label="Rabatt (%)"
        type="number"
        min="0"
        max="100"
        value={discountPercent}
        onChange={(e) =>
          setDiscountPercent(e.target.value.replace(/[^0-9]/g, ""))
        }
        disabled={pending}
      />

      <div>
        <label className="block font-sans text-caption font-semibold text-ink-soft mb-1.5">
          Produkter ({selected.length} valda)
        </label>
        <ul className="max-h-[260px] overflow-auto bg-surface border border-border rounded-md p-1">
          {allProducts.map((p) => (
            <li key={p.slug}>
              <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-warm rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(p.slug)}
                  onChange={() => toggle(p.slug)}
                  disabled={pending}
                />
                <span className="font-sans text-small text-ink-body truncate">
                  {p.name}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="block font-sans text-caption font-semibold text-ink-soft mb-1.5">
          Beskrivning
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-small"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border-soft">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Sparar…" : "Spara"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={remove}
          disabled={deleting}
          className="text-status-error hover:bg-status-error/10 ml-auto"
        >
          {deleting ? "Tar bort…" : "Ta bort"}
        </Button>
        {saved && (
          <span
            role="status"
            className="font-sans text-caption text-accent-deep font-semibold"
          >
            ✓ Sparat
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="font-sans text-caption text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
