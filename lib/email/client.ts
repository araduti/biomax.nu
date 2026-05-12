/**
 * Brevo transactional email client (REST API v3).
 *
 * Two modes — same pattern as Klarna:
 *  - **Real**: when `BREVO_API_KEY` is set.
 *  - **Stub**: logs the email to the dev terminal in a clearly formatted
 *    block so links (password resets, order confirmations) are easy to grab.
 *
 * Reference: https://developers.brevo.com/reference/sendtransacemail
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? "noreply@biomax.nu";
const FROM_NAME = process.env.BREVO_FROM_NAME ?? "Biomax";
const REPLY_TO = process.env.BREVO_REPLY_TO_EMAIL ?? "kontakt@biomax.nu";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

export type SendResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

export type SendInput = {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  /** Optional Brevo template ID — overrides html/text if set. */
  templateId?: number;
  /** Variables passed to the Brevo template (when templateId is used). */
  variables?: Record<string, unknown>;
  /** Plain-text preview shown in inbox listings. */
  preheader?: string;
  /** Tag for analytics (e.g. "order-confirmation", "password-reset"). */
  category?: string;
  /** Custom message ID for webhook event correlation later. */
  customId?: string;
};

/**
 * Send one transactional email. Idempotent on the caller's side — call only
 * after the underlying domain event has happened (order created, etc.).
 */
export async function sendTransactional(input: SendInput): Promise<SendResult> {
  if (!isEmailConfigured()) {
    logStubEmail(input);
    return { ok: true, messageId: `stub-${Date.now()}` };
  }

  const payload: Record<string, unknown> = {
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: input.to.email, name: input.to.name ?? input.to.email }],
    replyTo: { email: REPLY_TO },
  };
  if (input.preheader) {
    payload.headers = { "X-Preheader": input.preheader };
  }
  if (input.category) payload.tags = [input.category];

  if (input.templateId) {
    payload.templateId = input.templateId;
    payload.params = input.variables ?? {};
    // Subject still useful as a fallback if the template doesn't define one.
    if (input.subject) payload.subject = input.subject;
  } else {
    payload.subject = input.subject;
    payload.htmlContent = input.html;
    payload.textContent = input.text;
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY ?? "",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(
        `[email] Brevo send failed ${res.status} for ${input.to.email}: ${body}`
      );
      return { ok: false, error: `Brevo ${res.status}` };
    }
    const data = (await res.json()) as { messageId?: string };
    return { ok: true, messageId: data.messageId };
  } catch (err) {
    console.error("[email] Brevo network error", err);
    return { ok: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────── stub mode ───
function logStubEmail(input: SendInput) {
  const bar = "═".repeat(72);
  const lines = [
    "",
    bar,
    `📧  EMAIL  →  ${input.to.email}`,
    `   ${input.subject}`,
    bar,
  ];
  if (input.preheader) lines.push(`Preheader: ${input.preheader}`);
  if (input.category) lines.push(`Category:  ${input.category}`);
  // Extract any obvious links so the dev can copy/paste from terminal
  const links = (input.html.match(/https?:\/\/[^\s"'<>]+/g) ?? []).slice(0, 5);
  if (links.length) {
    lines.push("Links:");
    for (const link of links) lines.push(`  → ${link}`);
  }
  lines.push("Plaintext preview:");
  for (const ln of input.text.split("\n").slice(0, 12)) {
    lines.push(`  ${ln}`);
  }
  lines.push(bar, "");
  console.log(lines.join("\n"));
}
