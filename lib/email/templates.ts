/**
 * Email templates — pure functions returning { subject, html, text, preheader }
 * shaped for the lib/email/client.ts sender.
 *
 * Templates are HTML strings (with the brand layout) for V1. When marketing
 * automation is built (Phase 7) we can migrate to Brevo's visual templates
 * by setting `templateId` on the send call instead.
 */

import {
  brandedEmailHtml,
  brandedHeading,
  brandedParagraph,
  brandedButton,
  brandedEyebrow,
} from "./layout";
import { formatPriceSEK } from "@/lib/format";

// ─────────────────────────────── password reset ───
export type PasswordResetData = {
  url: string;
  email: string;
};

export function passwordResetEmail(d: PasswordResetData) {
  const preheader = "Klicka för att välja ett nytt lösenord till ditt Biomax-konto.";
  const subject = "Återställ ditt Biomax-lösenord";
  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow("Återställ lösenord"),
      brandedHeading("Välj ett nytt lösenord"),
      brandedParagraph(
        `Vi fick en begäran om att återställa lösenordet för <strong style="color: #0F2440;">${escape(d.email)}</strong>. Klicka på knappen nedan för att välja ett nytt. Länken är giltig i en timme.`
      ),
      brandedButton("Välj nytt lösenord", d.url),
      brandedParagraph(
        `Om du inte begärde detta kan du ignorera meddelandet — ditt lösenord är oförändrat.`
      ),
      `<p style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #E8E5DE; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #525860; line-height: 1.6;">Funkar inte knappen? Kopiera länken: <br /><a href="${d.url}" style="color: #1E3A5F; word-break: break-all;">${d.url}</a></p>`,
    ].join("\n"),
  });
  const text = [
    "Återställ ditt Biomax-lösenord",
    "",
    `Vi fick en begäran om att återställa lösenordet för ${d.email}.`,
    `Öppna länken för att välja ett nytt (giltig i 1 timme):`,
    "",
    d.url,
    "",
    "Om du inte begärde detta kan du ignorera meddelandet.",
    "",
    "— Biomax · Sedan 2001",
  ].join("\n");
  return { subject, html, text, preheader };
}

// ─────────────────────────────── order confirmation ───
export type OrderConfirmationData = {
  orderNumber: string;
  customerFirstName: string | null;
  email: string;
  items: { name: string; quantity: number; unitPrice: string; totalPrice: string }[];
  subtotal: string;
  shipping: string;
  total: string;
  shippingAddress: {
    fullName: string;
    street: string;
    postalCode: string;
    city: string;
  };
};

export function orderConfirmationEmail(d: OrderConfirmationData) {
  const orderUrl = `https://www.biomax.nu/konto?order=${encodeURIComponent(d.orderNumber)}`;
  const subject = `Tack för din beställning — ${d.orderNumber}`;
  const preheader = `Vi har tagit emot din order ${d.orderNumber} på ${formatPriceSEK(d.total)}. Den packas inom 1–2 arbetsdagar.`;

  const itemRows = d.items
    .map(
      (it) => `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #F0EDE5; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #1F2530;">
            <strong style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-weight: 500; color: #0F2440;">${escape(it.name)}</strong><br />
            <span style="color: #525860; font-size: 13px;">${it.quantity} × ${formatPriceSEK(it.unitPrice)}</span>
          </td>
          <td style="padding: 14px 0; border-bottom: 1px solid #F0EDE5; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #1F2530; text-align: right; vertical-align: top; white-space: nowrap;">
            ${formatPriceSEK(it.totalPrice)}
          </td>
        </tr>`
    )
    .join("");

  const greeting = d.customerFirstName
    ? `Hej ${escape(d.customerFirstName)},`
    : "Hej,";

  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow(`Ordernummer · ${d.orderNumber}`),
      brandedHeading("Tack för din beställning"),
      brandedParagraph(
        `${greeting} vi har tagit emot din order och packar den i Kållered inom 1–2 arbetsdagar. Du får en spårningslänk så fort Postnord hämtat den.`
      ),

      // Items table
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0 8px;">
        ${itemRows}
        <tr>
          <td style="padding: 16px 0 6px; font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #525860;">Delsumma</td>
          <td style="padding: 16px 0 6px; font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #1F2530; text-align: right;">${formatPriceSEK(d.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 0 0 12px; font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #525860;">Frakt</td>
          <td style="padding: 0 0 12px; font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #1F2530; text-align: right;">${parseFloat(d.shipping) === 0 ? "Fri" : formatPriceSEK(d.shipping)}</td>
        </tr>
        <tr>
          <td style="padding: 16px 0 0; border-top: 1px solid #E8E5DE; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 500; color: #0F2440;">Att betala</td>
          <td style="padding: 16px 0 0; border-top: 1px solid #E8E5DE; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 500; color: #0F2440; text-align: right;">${formatPriceSEK(d.total)}</td>
        </tr>
      </table>`,

      `<p style="margin: 24px 0 6px; font-family: Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: #525860;">Levereras till</p>
       <p style="margin: 0 0 24px; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #1F2530; line-height: 1.6;">
         ${escape(d.shippingAddress.fullName)}<br />
         ${escape(d.shippingAddress.street)}<br />
         ${escape(d.shippingAddress.postalCode)} ${escape(d.shippingAddress.city)}
       </p>`,

      brandedButton("Visa order", orderUrl),
    ].join("\n"),
  });

  const text = [
    `Tack för din beställning — ${d.orderNumber}`,
    "",
    `${greeting} vi har tagit emot din order och packar den i Kållered inom 1–2 arbetsdagar.`,
    "",
    ...d.items.map(
      (it) =>
        `  ${it.quantity} × ${it.name} — ${formatPriceSEK(it.totalPrice)}`
    ),
    "",
    `Delsumma: ${formatPriceSEK(d.subtotal)}`,
    `Frakt:    ${parseFloat(d.shipping) === 0 ? "Fri" : formatPriceSEK(d.shipping)}`,
    `Totalt:   ${formatPriceSEK(d.total)}`,
    "",
    `Levereras till:`,
    `  ${d.shippingAddress.fullName}`,
    `  ${d.shippingAddress.street}`,
    `  ${d.shippingAddress.postalCode} ${d.shippingAddress.city}`,
    "",
    `Visa order: ${orderUrl}`,
    "",
    "— Biomax · Sedan 2001",
  ].join("\n");

  return { subject, html, text, preheader };
}

// ─────────────────────────────── helpers ───
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
