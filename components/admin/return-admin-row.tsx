"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  moderateReturn,
  recordRefund,
} from "@/lib/orders/return-actions";

type ReturnRowData = {
  id: string;
  returnNumber: string;
  status: "REQUESTED" | "APPROVED" | "RECEIVED" | "REFUNDED" | "REJECTED";
  statusLabel: string;
  statusTone: string;
  createdAt: string;
  reason: string | null;
  internalNote: string | null;
  refundAmount: string | null;
  refundReference: string | null;
  orderNumber: string;
  customerEmail: string;
  orderTotal: string;
  items: { productName: string; quantity: number }[];
};

/**
 * One row in /admin/returer. The row is a client component because the
 * approve / reject / mark-received / record-refund actions are inline
 * forms with optimistic UI. Each calls the corresponding server action
 * in lib/orders/return-actions which audit-logs.
 */
export function ReturnAdminRow({ data }: { data: ReturnRowData }) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(data.refundAmount ?? "");
  const [refundReference, setRefundReference] = useState(
    data.refundReference ?? ""
  );
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function moderate(
    action: "APPROVED" | "RECEIVED" | "REJECTED",
    note?: string
  ) {
    setError(null);
    start(async () => {
      const result = await moderateReturn({
        returnId: data.id,
        action,
        internalNote: note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmingReject(false);
      setRejectNote("");
      router.refresh();
    });
  }

  function submitRefund() {
    setError(null);
    const amount = parseFloat(refundAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Ange ett giltigt belopp.");
      return;
    }
    if (!refundReference.trim()) {
      setError("Ange en referens (t.ex. Klarna refund-id).");
      return;
    }
    start(async () => {
      const result = await recordRefund({
        returnId: data.id,
        refundAmount: amount,
        refundReference: refundReference.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRefundOpen(false);
      router.refresh();
    });
  }

  const canApprove = data.status === "REQUESTED";
  const canMarkReceived = data.status === "APPROVED";
  const canRefund =
    data.status === "RECEIVED" || data.status === "APPROVED";
  const canReject =
    data.status === "REQUESTED" || data.status === "APPROVED";

  return (
    <li className="bg-surface-alt border border-border rounded-xl p-5 md:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-sans text-micro uppercase tracking-[0.16em] font-semibold ${data.statusTone}`}
          >
            {data.statusLabel}
          </span>
          <p className="font-display text-base font-medium text-primary-deep">
            {data.returnNumber}
          </p>
          <p className="font-sans text-caption text-ink-mute">
            {data.createdAt}
          </p>
        </div>
        <p className="font-sans text-small text-ink-body">
          <Link
            href={`/admin/ordrar/${data.orderNumber}`}
            className="text-primary-deep underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
          >
            {data.orderNumber}
          </Link>
          {" · "}
          {data.customerEmail}
          {" · "}
          <span className="text-ink-mute">Ordervärde {data.orderTotal}</span>
        </p>
      </header>

      <ul className="mb-4 space-y-1">
        {data.items.map((it, i) => (
          <li
            key={i}
            className="font-sans text-small text-ink-body flex items-baseline gap-2"
          >
            <span>{it.productName}</span>
            <span className="text-ink-soft">·</span>
            <span className="font-semibold">{it.quantity} st</span>
          </li>
        ))}
      </ul>

      {data.reason && (
        <p className="mb-3 font-sans text-small text-ink-mute italic leading-relaxed">
          Anledning: {data.reason}
        </p>
      )}

      {data.status === "REFUNDED" && (
        <p className="mb-3 font-sans text-small text-ink-body">
          <strong>Återbetalat:</strong>{" "}
          {data.refundAmount ? `${data.refundAmount} kr` : "—"} · ref{" "}
          <code>{data.refundReference || "—"}</code>
        </p>
      )}

      {/* Action row */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-border-soft">
        {canApprove && (
          <Button
            type="button"
            size="sm"
            onClick={() => moderate("APPROVED")}
            disabled={pending}
          >
            Godkänn
          </Button>
        )}
        {canMarkReceived && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => moderate("RECEIVED")}
            disabled={pending}
          >
            Mottagen i lager
          </Button>
        )}
        {canRefund && !refundOpen && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRefundOpen(true)}
            disabled={pending}
          >
            Registrera återbetalning
          </Button>
        )}
        {canReject && !confirmingReject && (
          <button
            type="button"
            onClick={() => setConfirmingReject(true)}
            disabled={pending}
            className="ml-auto font-sans text-small text-ink-soft hover:text-status-error transition-colors underline decoration-ink-soft/30 underline-offset-[3px]"
          >
            Avvisa retur
          </button>
        )}
      </div>

      {confirmingReject && (
        <div className="mt-4 pt-4 border-t border-border-soft bg-status-error/5 -mx-5 md:-mx-6 px-5 md:px-6 py-4 rounded-b-2xl">
          <p className="font-sans text-body text-ink-body mb-3">
            Avvisa {data.returnNumber}? Kunden får ingen återbetalning och
            varan returneras inte. Skriv en kort intern notering om varför —
            visas inte för kunden, men hjälper kollegorna förstå beslutet.
          </p>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="T.ex. utanför 14-dagars-fönstret, eller produkten är öppnad."
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 mb-3 bg-surface border-2 border-border rounded-md font-sans text-body focus:border-status-error focus:ring-2 focus:ring-status-error/15"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => moderate("REJECTED", rejectNote || undefined)}
              disabled={pending}
              className="h-12 px-5 rounded-md bg-status-error text-surface font-sans text-body font-semibold hover:bg-[#9F4630] disabled:opacity-50"
            >
              {pending ? "Avvisar…" : "Ja, avvisa retur"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingReject(false);
                setRejectNote("");
                setError(null);
              }}
              disabled={pending}
              className="h-12 px-5 font-sans text-body text-ink-mute hover:text-ink-body"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {refundOpen && (
        <div className="mt-4 pt-4 border-t border-border-soft bg-accent/5 -mx-5 md:-mx-6 px-5 md:px-6 py-4 rounded-b-2xl">
          <p className="font-sans text-body text-ink-body mb-4">
            Registrera återbetalning för{" "}
            <strong className="font-semibold text-primary-deep">
              {data.returnNumber}
            </strong>{" "}
            ({data.customerEmail}, ordervärde {data.orderTotal}). Skriv in
            beloppet som faktiskt återbetalats — och referensen från Klarna
            eller manuell anteckning så det går att spåra senare.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 mb-4">
            <Input
              label="Belopp (kr)"
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              disabled={pending}
            />
            <Input
              label="Referens"
              value={refundReference}
              onChange={(e) => setRefundReference(e.target.value)}
              disabled={pending}
              hint="Klarna refund-id eller manuell notering."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="md"
              onClick={submitRefund}
              disabled={pending}
            >
              {pending
                ? "Bokför…"
                : refundAmount && Number(refundAmount) > 0
                  ? `Återbetala ${Number(refundAmount).toFixed(2).replace(".", ",")} kr`
                  : "Bokför återbetalning"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setRefundOpen(false);
                setError(null);
              }}
              disabled={pending}
              className="h-12 px-5 font-sans text-body text-ink-mute hover:text-ink-body"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 font-sans text-caption text-status-error"
        >
          {error}
        </p>
      )}
    </li>
  );
}
