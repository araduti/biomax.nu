"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/components/admin/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateCoupon, deleteCoupon } from "@/lib/admin/coupon-actions";

type Initial = {
  code: string;
  description: string;
  discountPercent: number | null;
  discountAmount: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  maxUses: number | null;
};

export function CouponEditForm({
  initial,
  usedCount,
}: {
  initial: Initial;
  usedCount: number;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(initial.description);
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    initial.discountAmount ? "amount" : "percent"
  );
  const [percent, setPercent] = useState(
    initial.discountPercent != null ? String(initial.discountPercent) : ""
  );
  const [amount, setAmount] = useState(initial.discountAmount);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [expiresAt, setExpiresAt] = useState(initial.expiresAt);
  const [active, setActive] = useState(initial.active);
  const [maxUses, setMaxUses] = useState(
    initial.maxUses != null ? String(initial.maxUses) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await updateCoupon({
        code: initial.code,
        description: description || null,
        discountPercent:
          discountType === "percent" && percent
            ? parseInt(percent, 10)
            : null,
        discountAmount: discountType === "amount" ? amount : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  async function remove() {
    if (usedCount > 0) return;
    const ok = await confirmDialog({
      title: `Ta bort rabattkoden "${initial.code}"?`,
      body: "Koden försvinner permanent. Befintliga ordrar som använt koden behåller sin rabatt.",
      confirmLabel: "Ta bort",
      intent: "destructive",
    });
    if (!ok) return;
    startDelete(async () => {
      const result = await deleteCoupon(initial.code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/kuponger");
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="font-sans text-body text-ink-body font-semibold">
            Aktiv
          </span>
        </label>
        <p className="mt-1 font-sans text-micro text-ink-soft">
          Avaktivera istället för att ta bort när koden använts.
        </p>
      </div>

      <div>
        <label className="block font-sans text-caption font-semibold text-ink-soft mb-1.5">
          Rabattyp
        </label>
        <div className="flex gap-3 mb-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={discountType === "percent"}
              onChange={() => setDiscountType("percent")}
              disabled={pending}
            />
            <span className="font-sans text-small">Procent</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={discountType === "amount"}
              onChange={() => setDiscountType("amount")}
              disabled={pending}
            />
            <span className="font-sans text-small">Fast belopp</span>
          </label>
        </div>
        {discountType === "percent" ? (
          <Input
            label="Procent"
            type="number"
            min="1"
            max="100"
            value={percent}
            onChange={(e) =>
              setPercent(e.target.value.replace(/[^0-9]/g, ""))
            }
            disabled={pending}
          />
        ) : (
          <Input
            label="Belopp (SEK)"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Aktiv från"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          disabled={pending}
          hint="Tom = direkt."
        />
        <Input
          label="Aktiv till"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          disabled={pending}
          hint="Tom = ingen utgång."
        />
      </div>

      <Input
        label="Max antal användningar"
        type="number"
        min="0"
        value={maxUses}
        onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ""))}
        disabled={pending}
        hint="Tom = obegränsat."
      />

      <div>
        <label
          htmlFor="coupon-desc"
          className="block font-sans text-caption font-semibold text-ink-soft mb-1.5"
        >
          Intern beskrivning
        </label>
        <textarea
          id="coupon-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-small text-ink-body focus:outline-none focus:border-accent disabled:opacity-50"
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
          disabled={deleting || usedCount > 0}
          className="text-status-error hover:bg-status-error/10"
        >
          {deleting ? "Tar bort…" : "Ta bort"}
        </Button>
        {usedCount > 0 && (
          <p className="font-sans text-micro text-ink-soft">
            Använd {usedCount} gång{usedCount === 1 ? "" : "er"} — kan inte tas
            bort.
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
