"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBundle } from "@/lib/admin/bundle-actions";

export function BundleCreateForm({
  allProducts,
}: {
  allProducts: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(productSlug: string) {
    setSelected((prev) =>
      prev.includes(productSlug)
        ? prev.filter((s) => s !== productSlug)
        : [...prev, productSlug]
    );
  }

  function submit() {
    setError(null);
    if (!name.trim() || selected.length < 2) return;
    start(async () => {
      const r = await createBundle({
        name,
        slug: slug || undefined,
        description: description || undefined,
        discountPercent: parseInt(discountPercent, 10) || 0,
        productSlugs: selected,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/admin/paket/${r.slug}`);
    });
  }

  return (
    <div className="space-y-3">
      <Input
        label="Namn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="t.ex. Sömnpaket"
        disabled={pending}
      />
      <Input
        label="Slug (valfritt)"
        value={slug}
        onChange={(e) =>
          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
        }
        placeholder="somnpaket"
        disabled={pending}
      />
      <Input
        label="Rabatt (%)"
        type="number"
        min="0"
        max="100"
        value={discountPercent}
        onChange={(e) => setDiscountPercent(e.target.value.replace(/[^0-9]/g, ""))}
        disabled={pending}
      />
      <div>
        <label className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5">
          Produkter ({selected.length} valda, minst 2)
        </label>
        <ul className="max-h-[200px] overflow-auto bg-surface border border-border rounded-md p-1">
          {allProducts.map((p) => (
            <li key={p.slug}>
              <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-warm rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(p.slug)}
                  onChange={() => toggle(p.slug)}
                  disabled={pending}
                />
                <span className="font-sans text-[13px] text-ink-body truncate">
                  {p.name}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5">
          Beskrivning (valfritt)
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-[13.5px]"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={submit}
        disabled={pending || !name.trim() || selected.length < 2}
        className="w-full"
      >
        {pending ? "Skapar…" : "Skapa paket"}
      </Button>
      {error && (
        <p
          role="alert"
          className="font-sans text-[12px] text-status-error bg-status-error/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
