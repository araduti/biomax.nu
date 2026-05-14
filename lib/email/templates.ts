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
  /** Public tracking token — when present, surface a "Spåra leverans"
   *  link that works without login. Guests rely on this; logged-in
   *  customers use /konto/ordrar/[orderNumber] for full self-service. */
  trackingToken?: string;
};

export function orderConfirmationEmail(d: OrderConfirmationData) {
  const orderUrl = `https://www.biomax.nu/konto?order=${encodeURIComponent(d.orderNumber)}`;
  const trackingUrl = d.trackingToken
    ? `https://www.biomax.nu/spara/${encodeURIComponent(d.trackingToken)}`
    : null;
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
      trackingUrl
        ? `<p style="margin: 14px 0 0; font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #525860; text-align: center;">
             Eller spåra leveransen utan att logga in:
             <a href="${trackingUrl}" style="color: #1E3A5F;">${trackingUrl}</a>
           </p>`
        : "",
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
    ...(trackingUrl ? [`Spåra leveransen: ${trackingUrl}`] : []),
    "",
    "— Biomax · Sedan 2001",
  ].join("\n");

  return { subject, html, text, preheader };
}

// ───────────────────────────── review request ───
export type ReviewRequestData = {
  customerFirstName: string | null;
  orderNumber: string;
  items: {
    productName: string;
    productSlug: string;
  }[];
};

/**
 * "Hur trivs du med ditt köp?" — sent ~14 days post-fulfillment.
 *
 * One email per order with a row per product, each linking to the
 * review section on that product's page. Login-gating is handled at
 * the destination (the form CTA on `/produkter/[slug]#recensioner`
 * shows a sign-in prompt for unauthenticated users — we don't pass
 * a one-time token from here to keep the email link sturdy if the
 * customer forwards it or opens it weeks later).
 */
export function reviewRequestEmail(d: ReviewRequestData) {
  const greeting = d.customerFirstName
    ? `Hej ${escape(d.customerFirstName)},`
    : "Hej,";
  const subject = `Hur trivs du med ditt köp?`;
  const preheader = `Det har gått ett par veckor sedan du fick order ${d.orderNumber} — vi är nyfikna på vad du tycker.`;

  const productRows = d.items
    .map(
      (it) => `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #F0EDE5; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #1F2530;">
            <strong style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-weight: 500; color: #0F2440;">${escape(it.productName)}</strong>
          </td>
          <td style="padding: 14px 0; border-bottom: 1px solid #F0EDE5; text-align: right;">
            <a href="https://www.biomax.nu/produkter/${encodeURIComponent(it.productSlug)}#recensioner" style="font-family: Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #0F2440; text-decoration: underline; text-decoration-color: rgba(122,156,126,0.4); text-underline-offset: 3px;">
              Lämna recension
            </a>
          </td>
        </tr>`
    )
    .join("");

  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow(`Order ${d.orderNumber}`),
      brandedHeading("Hur trivs du med ditt köp?"),
      brandedParagraph(
        `${greeting} det har gått ett par veckor sedan vi skickade din order. Vi är nyfikna — fungerar produkten som du hoppades?`
      ),
      brandedParagraph(
        `Andra kunder läser dina recensioner när de funderar på vad som passar dem. Några rader om hur du upplever produkten hjälper både oss och dem. Både positiv och kritisk feedback är välkommen — det viktigaste är att den är ärlig.`
      ),
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0 12px;">${productRows}</table>`,
      `<p style="margin: 28px 0 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #8A8E92; line-height: 1.6;">
        Du får detta mejl en gång per order. Om du redan recenserat något av produkterna — tack! Ignorera detta mejl i så fall.
      </p>`,
    ].join("\n"),
  });

  const text = [
    `Hur trivs du med ditt köp? — order ${d.orderNumber}`,
    "",
    `${greeting} det har gått ett par veckor sedan vi skickade din order. Vi är nyfikna — fungerar produkten som du hoppades?`,
    "",
    "Andra kunder läser dina recensioner när de funderar på vad som passar dem. Några rader hjälper både oss och dem.",
    "",
    "Lämna recension:",
    ...d.items.map(
      (it) =>
        `  • ${it.productName}\n    https://www.biomax.nu/produkter/${it.productSlug}#recensioner`
    ),
    "",
    "Du får detta mejl en gång per order. Tack!",
  ].join("\n");

  return { subject, preheader, html, text };
}

// ────────────────────────── welcome series ───
const SITE = "https://www.biomax.nu";

function unsubscribeFooter(token: string | null): string {
  if (!token) return "";
  const url = `${SITE}/avregistrera?token=${encodeURIComponent(token)}`;
  return `<p style="margin: 32px 0 0; font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #8A8E92; line-height: 1.6; text-align: center;">
    Vill du inte ha våra brev? <a href="${url}" style="color: #8A8E92; text-decoration: underline;">Avregistrera med ett klick</a>.
  </p>`;
}

function unsubscribeText(token: string | null): string {
  if (!token) return "";
  return `\n\n—\nVill du inte ha våra brev? Avregistrera: ${SITE}/avregistrera?token=${encodeURIComponent(token)}`;
}

export type WelcomeStageData = {
  unsubscribeToken: string | null;
  /** Optional one-time coupon code injected into stage 1. */
  couponCode?: string | null;
};

/** Stage 1 — sent within an hour of signup. Contains the discount code. */
export function welcomeStage1Email(d: WelcomeStageData) {
  const code = d.couponCode ?? "VALKOMMEN10";
  const subject = `Välkommen till Biomax — här är din kupongkod`;
  const preheader = `Tack för att du anmälde dig. Som ny prenumerant får du 10 % på första ordern med koden ${code}.`;
  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow("Brev nr 1 av 3"),
      brandedHeading("Välkommen till Biomax"),
      brandedParagraph(
        `Tack för att du anmälde dig. Vi är en familjeägd hälsobutik i Kållered som funnits sedan 2001 — du får brev från oss ungefär varannan vecka, aldrig oftare.`
      ),
      brandedParagraph(
        `Som ny prenumerant får du <strong>10 % rabatt på din första order</strong>. Använd koden nedan i kassan.`
      ),
      `<div style="margin: 28px 0; text-align: center;">
        <code style="display: inline-block; font-family: 'Courier New', monospace; font-size: 20px; font-weight: 600; letter-spacing: 0.12em; color: #0F2440; background: #F4ECDD; padding: 14px 28px; border-radius: 8px; border: 1px dashed #C68A4F;">${escape(code)}</code>
      </div>`,
      brandedButton("Bläddra i sortimentet", `${SITE}/produkter`),
      unsubscribeFooter(d.unsubscribeToken),
    ].join("\n"),
  });
  const text = [
    "Välkommen till Biomax",
    "",
    "Tack för att du anmälde dig. Vi är en familjeägd hälsobutik i Kållered som funnits sedan 2001.",
    "",
    `Som ny prenumerant får du 10 % rabatt på din första order. Använd koden: ${code}`,
    "",
    `Bläddra i sortimentet: ${SITE}/produkter`,
    unsubscribeText(d.unsubscribeToken),
  ].join("\n");
  return { subject, preheader, html, text };
}

/** Stage 2 — sent ~3 days after signup. Brand story, no offer. */
export function welcomeStage2Email(d: WelcomeStageData) {
  const subject = `Tre saker värda att veta om Biomax`;
  const preheader = `Familjehistorien bakom butiken i Kållered — och vad vi själva tänker när vi väljer produkter.`;
  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow("Brev nr 2 av 3"),
      brandedHeading("Tre saker värda att veta"),
      brandedParagraph(
        `<strong>1. Vi är en familj, inte ett kapitalbolag.</strong> Biomax har drivits från Kållered sedan 2001. Vi importerar, utvecklar och säljer kosttillskott — och vi står bakom varje produkt vi har i sortimentet.`
      ),
      brandedParagraph(
        `<strong>2. Vi har en fysisk butik.</strong> Eken Hälsobutik på Ekenleden 15A i Kållered är öppen tisdag–lördag. Där finns även konsultation, håranalys och laserbehandling om du vill ha personlig vägledning.`
      ),
      brandedParagraph(
        `<strong>3. Vi tror på traditionell kunskap i kombination med modern forskning.</strong> Det är därför vi har byggt en kunskapsbank där varje ingrediens beskrivs både utifrån sin traditionella användning och utifrån vad forskningen faktiskt säger.`
      ),
      brandedButton("Läs i kunskapsbanken", `${SITE}/kunskap`),
      unsubscribeFooter(d.unsubscribeToken),
    ].join("\n"),
  });
  const text = [
    "Tre saker värda att veta om Biomax",
    "",
    "1. Vi är en familj, inte ett kapitalbolag. Biomax har drivits från Kållered sedan 2001.",
    "",
    "2. Vi har en fysisk butik. Eken Hälsobutik på Ekenleden 15A i Kållered är öppen tisdag–lördag.",
    "",
    "3. Vi tror på traditionell kunskap kombinerad med modern forskning. Kunskapsbanken finns på " + SITE + "/kunskap",
    unsubscribeText(d.unsubscribeToken),
  ].join("\n");
  return { subject, preheader, html, text };
}

/** Stage 3 — sent ~7 days after signup. Drives traffic to /hjalp guides. */
export function welcomeStage3Email(d: WelcomeStageData) {
  const subject = `Hitta rätt — våra guider efter behov`;
  const preheader = `Sömn, oro, mage, leder, urinvägar, energi och immunförsvar — kort vägledning för var du börjar.`;
  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow("Brev nr 3 av 3"),
      brandedHeading("Vi har guider efter behov"),
      brandedParagraph(
        `Ibland letar man efter en specifik ingrediens. Men oftare letar man efter ett område — sömn, mage, leder, energi. Vi har samlat våra produkter och våra ingredienser just efter sådana områden.`
      ),
      brandedParagraph(
        `Klicka in på det som ligger närmast det du tänker på. Där hittar du de växter och näringsämnen som traditionellt använts — och de produkter vi själva har erfarenhet av.`
      ),
      brandedButton("Visa alla områden", `${SITE}/hjalp`),
      brandedParagraph(
        `Det här är sista brevet i välkomstserien. Sedan får du våra vanliga brev — ungefär varannan vecka, aldrig oftare.`
      ),
      unsubscribeFooter(d.unsubscribeToken),
    ].join("\n"),
  });
  const text = [
    "Hitta rätt — våra guider efter behov",
    "",
    "Ibland letar man efter en specifik ingrediens. Men oftare letar man efter ett område.",
    "",
    `Visa alla områden: ${SITE}/hjalp`,
    "",
    "Det här är sista brevet i välkomstserien.",
    unsubscribeText(d.unsubscribeToken),
  ].join("\n");
  return { subject, preheader, html, text };
}

// ──────────────────────── abandoned cart ───
export type AbandonedCartData = {
  recoveryToken: string;
  items: { name: string; quantity: number; totalPrice: string }[];
  subtotal: string;
  stage: 1 | 2;
  /** Optional coupon code shown only on stage 2. */
  couponCode?: string | null;
};

export function abandonedCartEmail(d: AbandonedCartData) {
  const url = `${SITE}/varukorg?recover=${encodeURIComponent(d.recoveryToken)}`;
  const subject =
    d.stage === 1
      ? "Du glömde något i varukorgen"
      : "Sista påminnelsen — vi har sparat din varukorg";
  const preheader =
    d.stage === 1
      ? `Vi har sparat din varukorg på ${formatPriceSEK(d.subtotal)}. Klicka för att slutföra köpet.`
      : `Din varukorg på ${formatPriceSEK(d.subtotal)} ligger kvar. ${
          d.couponCode ? `Använd koden ${d.couponCode} för 10 % rabatt.` : ""
        }`;

  const itemRows = d.items
    .map(
      (it) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #F0EDE5; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #1F2530;">
          <strong style="font-family: Georgia, 'Times New Roman', serif; font-weight: 500; color: #0F2440;">${escape(it.name)}</strong>
          <span style="color: #525860; font-size: 13px;"> · ${it.quantity} st</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #F0EDE5; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #1F2530; text-align: right; white-space: nowrap;">
          ${formatPriceSEK(it.totalPrice)}
        </td>
      </tr>`
    )
    .join("");

  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow(d.stage === 1 ? "Påminnelse" : "Sista chansen"),
      brandedHeading(
        d.stage === 1
          ? "Du glömde något i varukorgen"
          : "Vi har fortfarande din varukorg sparad"
      ),
      brandedParagraph(
        d.stage === 1
          ? "Hej — du lade till produkter i din varukorg men slutförde aldrig köpet. Vi har sparat den åt dig. Klicka nedan så är du tillbaka där du slutade."
          : "Det här är sista påminnelsen från oss om den här varukorgen. Antingen slutför du köpet nu, eller så låter vi det bero." +
              (d.couponCode
                ? ` Som tack för besväret: <strong>10 % rabatt med koden ${escape(d.couponCode)}</strong>.`
                : "")
      ),
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0 8px;">
        ${itemRows}
        <tr>
          <td style="padding: 16px 0 0; border-top: 1px solid #E8E5DE; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: 500; color: #0F2440;">Totalt</td>
          <td style="padding: 16px 0 0; border-top: 1px solid #E8E5DE; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: 500; color: #0F2440; text-align: right;">${formatPriceSEK(d.subtotal)}</td>
        </tr>
      </table>`,
      brandedButton("Slutför köpet", url),
    ].join("\n"),
  });

  const text = [
    d.stage === 1
      ? "Du glömde något i varukorgen"
      : "Sista påminnelsen — vi har sparat din varukorg",
    "",
    ...d.items.map(
      (it) => `  ${it.quantity} × ${it.name} — ${formatPriceSEK(it.totalPrice)}`
    ),
    "",
    `Totalt: ${formatPriceSEK(d.subtotal)}`,
    "",
    d.couponCode && d.stage === 2
      ? `Använd koden ${d.couponCode} för 10 % rabatt i kassan.`
      : "",
    "",
    `Slutför köpet: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, preheader, html, text };
}

// ──────────────────────── replenishment reminder ───
export type ReplenishmentReminderData = {
  customerFirstName: string | null;
  product: { name: string; slug: string };
  daysRemaining: number;
  unsubscribeToken?: string | null;
};

export function replenishmentReminderEmail(d: ReplenishmentReminderData) {
  const url = `${SITE}/produkter/${encodeURIComponent(d.product.slug)}`;
  const greeting = d.customerFirstName
    ? `Hej ${escape(d.customerFirstName)},`
    : "Hej,";
  const subject = `Din ${d.product.name} tar snart slut`;
  const preheader = `Räknat på din senaste beställning räcker den till ungefär ${d.daysRemaining} dagar till. Lägg en ny order nu så hinner paketet fram i tid.`;
  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow("Påminnelse"),
      brandedHeading(`Din ${escape(d.product.name)} börjar bli slut`),
      brandedParagraph(
        `${greeting} räknat på din senaste beställning av <strong>${escape(d.product.name)}</strong> räcker den till ungefär ${d.daysRemaining} dagar till.`
      ),
      brandedParagraph(
        `Vill du slippa uppehåll i din rutin? Lägg en ny order nu så hinner paketet fram innan det tar slut.`
      ),
      brandedButton(`Beställ ${d.product.name} igen`, url),
      brandedParagraph(
        `Beräkningen är ett ungefär — vi utgår från den vanligaste doseringen och antalet kapslar i den senaste beställningen. Tar du mer eller mindre kan datumet variera.`
      ),
    ].join("\n"),
  });
  const text = [
    `Din ${d.product.name} börjar bli slut`,
    "",
    `${greeting} räknat på din senaste beställning av ${d.product.name} räcker den till ungefär ${d.daysRemaining} dagar till.`,
    "",
    `Beställ igen: ${url}`,
  ].join("\n");
  return { subject, preheader, html, text };
}

// ──────────────────────── stock back in stock ───
export type StockBackInStockData = {
  productName: string;
  productSlug: string;
};

/**
 * "Produkten du väntat på är tillbaka." Sent when a stock-notification
 * request is fulfilled by `fanoutStockNotifications`. No discount —
 * scarcity is itself the lever; offering one would train customers to
 * wait. Link goes straight to the product page.
 */
export function stockBackInStockEmail(d: StockBackInStockData) {
  const url = `https://www.biomax.nu/produkter/${encodeURIComponent(d.productSlug)}`;
  const subject = `${d.productName} är tillbaka i lager`;
  const preheader = `${d.productName} finns nu på lager igen. Lagret är begränsat — det går snabbt när vi får hem nya partier.`;
  const html = brandedEmailHtml({
    preheader,
    body: [
      brandedEyebrow("Tillbaka i lager"),
      brandedHeading(`${escape(d.productName)} finns på lager igen`),
      brandedParagraph(
        `Du bad oss höra av oss när ${escape(d.productName)} kom tillbaka. Nu finns den i lagret i Kållered igen.`
      ),
      brandedParagraph(
        `Lagret är begränsat — vi får hem nya partier i omgångar. Logga gärna in och slutför köpet om du fortfarande vill ha den.`
      ),
      brandedButton(`Visa ${d.productName}`, url),
    ].join("\n"),
  });
  const text = [
    `${d.productName} är tillbaka i lager`,
    "",
    `Du bad oss höra av oss när ${d.productName} kom tillbaka. Nu finns den i lagret i Kållered igen.`,
    "",
    `Visa produkten: ${url}`,
    "",
    "Lagret är begränsat — vi får hem nya partier i omgångar.",
  ].join("\n");
  return { subject, preheader, html, text };
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
