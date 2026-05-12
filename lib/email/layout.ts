/**
 * Branded email layout — table-based HTML for maximum email-client
 * compatibility. Inline CSS, web-safe fonts, no images that can be blocked.
 *
 * Brand tokens (locked in ADR 0007) are duplicated here as inline styles
 * because email clients ignore <style> blocks unreliably.
 */

const BRAND = {
  primary: "#1E3A5F",
  primaryDeep: "#0F2440",
  accent: "#7A8B6F",
  accentDeep: "#5C6E55",
  surface: "#FBFAF7",
  surfaceWarm: "#F4F0E8",
  surfaceAlt: "#FFFFFF",
  ink: "#0A0A0A",
  inkBody: "#1F2530",
  inkMute: "#525860",
  border: "#E8E5DE",
};

export function brandedEmailHtml({
  preheader,
  body,
  footer,
}: {
  preheader: string;
  body: string;
  /** Optional override for the standard footer. */
  footer?: string;
}): string {
  const defaultFooter = `
    <p style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 14px; color: ${BRAND.surface}; opacity: 0.8;">
      Biomax — vetenskapligt baserade naturpreparat sedan 2001.
    </p>
    <p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: ${BRAND.surface}; opacity: 0.55; line-height: 1.6;">
      Biomax HB · Eken Hälsobutik, Ekenleden 15A, 428 36 Kållered<br />
      Frågor? Maila <a href="mailto:kontakt@biomax.nu" style="color: ${BRAND.accent}; text-decoration: none;">kontakt@biomax.nu</a>
    </p>
  `;

  return `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Biomax</title>
</head>
<body style="margin: 0; padding: 0; background: ${BRAND.surface}; font-family: Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%;">
  <span style="display: none !important; visibility: hidden; color: ${BRAND.surface}; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">${escapeHtml(preheader)}</span>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${BRAND.surface};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 24px;">
              <a href="https://www.biomax.nu" style="text-decoration: none; color: ${BRAND.primary};">
                <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 500; letter-spacing: -0.02em; color: ${BRAND.primary};">biomax</span>
              </a>
              <div style="font-family: Helvetica, Arial, sans-serif; font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase; color: ${BRAND.inkMute}; margin-top: 4px;">
                Sedan 2001 · Kållered
              </div>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background: ${BRAND.surfaceAlt}; border: 1px solid ${BRAND.border}; border-radius: 16px; padding: 36px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${BRAND.primaryDeep}; border-radius: 16px;">
                <tr>
                  <td style="padding: 28px 32px;">
                    ${footer ?? defaultFooter}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Brand button helper — renders a pill-shaped link button using bullet-proof
 * VML+table technique that works across Outlook + every modern client.
 */
export function brandedButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0;">
      <tr>
        <td style="border-radius: 999px; background: ${BRAND.primary};">
          <a href="${href}" style="display: inline-block; padding: 14px 28px; font-family: Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${BRAND.surface}; text-decoration: none; border-radius: 999px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>
  `;
}

export function brandedHeading(text: string): string {
  return `<h1 style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 500; letter-spacing: -0.025em; line-height: 1.1; color: ${BRAND.primaryDeep};">${escapeHtml(text)}</h1>`;
}

export function brandedEyebrow(text: string): string {
  return `<p style="margin: 0 0 8px; font-family: Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: ${BRAND.inkMute};">${escapeHtml(text)}</p>`;
}

export function brandedParagraph(text: string): string {
  return `<p style="margin: 0 0 16px; font-family: Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: ${BRAND.inkBody};">${text}</p>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
