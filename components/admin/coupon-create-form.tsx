"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCoupon } from "@/lib/admin/coupon-actions";

export function CouponCreateForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    "percent"
  );
  const [percent, setPercent] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    if (!code.trim()) return;
    start(async () => {
      const result = await createCoupon({
        code,
        description: description || null,
        discountPercent:
          discountType === "percent" && percent
            ? parseInt(percent, 10)
            : null,
        discountAmount: discountType === "amount" ? amount : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/kuponger/${result.code}`);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="coupon-code"
          className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5"
        >
          Kod
        </label>
        <Input
          id="coupon-code"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
          }
          placeholder="VAR2026"
          disabled={pending}
        />
      </div>

      <div>
        <label className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5">
          Rabattyp
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={discountType === "percent"}
              onChange={() => setDiscountType("percent")}
              disabled={pending}
            />
            <span className="font-sans text-[13px]">Procent</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={discountType === "amount"}
              onChange={() => setDiscountType("amount")}
              disabled={pending}
            />
            <span className="font-sans text-[13px]">Fast belopp</span>
          </label>
        </div>
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

      <div>
        <label
          htmlFor="coupon-desc"
          className="block font-sans text-[12px] font-semibold text-ink-soft mb-1.5"
        >
          Intern beskrivning <span className="text-ink-soft font-normal">(valfritt)</span>
        </label>
        <textarea
          id="coupon-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          placeholder="t.ex. vårkampanj v.18"
          className="w-full px-3 py-2 bg-surface border border-border rounded-md font-sans text-[13.5px] text-ink-body placeholder:text-ink-soft focus:outline-none focus:border-accent disabled:opacity-50"
        />
      </div>

      <Button
        type="button"
        size="sm"
        onClick={submit}
        disabled={pending || !code.trim()}
        className="w-full"
      >
        {pending ? "Skapar…" : "Skapa rabattkod"}
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
