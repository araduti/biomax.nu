/**
 * Runtime environment validation (Ampliosoft platform §A5).
 *
 * Called once from instrumentation.ts `register()` when the Node server
 * boots. Fails fast with a clear, variable-named error if a required
 * runtime var is missing — so a misconfigured container dies immediately
 * instead of 500-ing on the first request.
 *
 * NOT run during `next build`: the builder injects harmless placeholders
 * (Dockerfile §A4) and the build phase is skipped explicitly so static
 * collection can't trip this.
 */

const REQUIRED: { name: string; why: string }[] = [
  { name: "DATABASE_URL", why: "Postgres DSN for the app (DML role)" },
  { name: "BETTER_AUTH_SECRET", why: "session signing key" },
  { name: "BETTER_AUTH_URL", why: "canonical public URL" },
  { name: "NEXT_PUBLIC_APP_URL", why: "client-side canonical URL" },
];

export function validateRuntimeEnv(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const missing = REQUIRED.filter((v) => !process.env[v.name]?.trim());
  if (missing.length === 0) return;

  const lines = missing.map((v) => `  - ${v.name} (${v.why})`).join("\n");
  // eslint-disable-next-line no-console
  console.error(
    `\nFATAL: missing required environment variable(s):\n${lines}\n` +
      `Set them in the container environment (see docs/deployment.md §Runtime env).\n`
  );
  process.exit(1);
}
