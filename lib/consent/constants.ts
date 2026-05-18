/**
 * Consent policy version (ADR 0023). Bump this whenever the privacy
 * policy or cookie-banner copy changes materially — every ConsentEvent
 * records the version in force so we can prove which disclosure the
 * visitor agreed to. Keep in sync with the `lastUpdated` on /integritet
 * and /gdpr.
 */
export const CONSENT_POLICY_VERSION = "2026-05-17";

/** localStorage key holding the stable anonymous subject id. */
export const CONSENT_SUBJECT_KEY = "biomax-consent-id";
