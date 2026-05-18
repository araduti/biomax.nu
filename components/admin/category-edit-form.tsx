"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/components/admin/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  updateCategory,
  deleteCategory,
} from "@/lib/admin/category-actions";

type Initial = {
  slug: string;
  name: string;
  description: string;
};

export function CategoryEditForm({
  initial,
  productCount,
}: {
  initial: Initial;
  productCount: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();

  const dirty =
    name !== initial.name ||
    slug !== initial.slug ||
    description !== initial.description;

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await updateCategory({
        slug: initial.slug,
        name,
        description: description || null,
        newSlug: slug !== initial.slug ? slug : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.slug !== initial.slug) {
        router.replace(`/admin/kategorier/${result.slug}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    });
  }

  async function remove() {
    if (productCount > 0) return;
    const ok = await confirmDialog({
      title: `Ta bort kategorin "${initial.name}"?`,
      body: "Kategorin tas bort permanent. Produkter som tillhör kategorin behåller sina kopplingar tills du redigerar dem.",
      confirmLabel: "Ta bort",
      intent: "destructive",
    });
    if (!ok) return;
    setError(null);
    startDelete(async () => {
      const result = await deleteCategory(initial.slug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/kategorier");
    });
  }

  const isDefault = initial.slug === "uncategorized";

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="cat-name"
          className="block font-sans text-caption font-semibold text-ink-soft mb-1.5"
        >
          Namn
        </label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending || isDefault}
        />
      </div>

      <div>
        <label
          htmlFor="cat-slug"
          className="block font-sans text-caption font-semibold text-ink-soft mb-1.5"
        >
          Slug
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-caption text-ink-soft">
            /kategorier/
          </span>
          <Input
            id="cat-slug"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            disabled={pending || isDefault}
            className="max-w-[320px]"
          />
        </div>
        {slug !== initial.slug && (
          <p className="mt-1.5 font-sans text-micro text-ink-soft">
            Den gamla URL:en omdirigeras automatiskt (301).
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="cat-desc"
          className="block font-sans text-caption font-semibold text-ink-soft mb-1.5"
        >
          Beskrivning
        </label>
        <textarea
          id="cat-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-small text-ink-body placeholder:text-ink-soft focus:outline-none focus:border-accent disabled:opacity-50"
        />
        <p className="mt-1.5 font-sans text-micro text-ink-soft">
          Visas som inledning på kategorisidan.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-2">
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending || !dirty || !name.trim()}
        >
          {pending ? "Sparar…" : "Spara"}
        </Button>
        {!isDefault && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={remove}
            disabled={deleting || productCount > 0}
            className="text-status-error hover:bg-status-error/10"
          >
            {deleting ? "Tar bort…" : "Ta bort kategori"}
          </Button>
        )}
        {productCount > 0 && (
          <p className="font-sans text-micro text-ink-soft">
            Kan inte tas bort medan {productCount} produkter använder den.
          </p>
        )}
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
