"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory } from "@/lib/admin/category-actions";

export function CategoryCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    if (!name.trim()) return;
    start(async () => {
      const result = await createCategory({
        name,
        slug: slug || undefined,
        description: description || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/kategorier/${result.slug}`);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="cat-name"
          className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5"
        >
          Namn
        </label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="t.ex. Sömn & oro"
          disabled={pending}
        />
      </div>
      <div>
        <label
          htmlFor="cat-slug"
          className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5"
        >
          Slug <span className="text-ink-soft font-normal">(valfritt)</span>
        </label>
        <Input
          id="cat-slug"
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
          placeholder="somn-och-oro"
          disabled={pending}
        />
      </div>
      <div>
        <label
          htmlFor="cat-desc"
          className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5"
        >
          Beskrivning <span className="text-ink-soft font-normal">(valfritt)</span>
        </label>
        <textarea
          id="cat-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-[13.5px] text-ink-body placeholder:text-ink-soft focus:outline-none focus:border-accent disabled:opacity-50"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={submit}
        disabled={pending || !name.trim()}
        className="w-full"
      >
        {pending ? "Skapar…" : "Skapa kategori"}
      </Button>
      {error && (
        <p
          role="alert"
          className="font-sans text-[12px] text-[#B5523B] bg-[#B5523B]/10 px-3 py-2 rounded-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
