import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";

export const metadata = { title: "Backups" };
export const dynamic = "force-dynamic";

type BackupTier = {
  name: string;
  path: string;
  count: number;
  latest: { name: string; size: number; mtimeMs: number } | null;
};

const dateTimeFmt = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function inspectTier(name: string, path: string): BackupTier {
  if (!existsSync(path)) {
    return { name, path, count: 0, latest: null };
  }
  try {
    const files = readdirSync(path)
      .filter((f) => f.startsWith("biomax-"))
      .map((f) => {
        const stat = statSync(join(path, f));
        return { name: f, size: stat.size, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    return { name, path, count: files.length, latest: files[0] ?? null };
  } catch {
    return { name, path, count: 0, latest: null };
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function hoursAgo(mtimeMs: number): string {
  const h = Math.round((Date.now() - mtimeMs) / 3_600_000);
  if (h < 1) return "för mindre än en timme sedan";
  if (h < 24) return `för ${h} timmar sedan`;
  const d = Math.round(h / 24);
  return `för ${d} ${d === 1 ? "dag" : "dagar"} sedan`;
}

export default function BackupsPage() {
  // Try the default BACKUP_DIR (./backups) and the conventional /srv path.
  // First one found wins.
  const candidates = [
    process.env.BACKUP_DIR,
    join(process.cwd(), "backups"),
    "/srv/backups",
  ].filter((p): p is string => !!p);

  const root = candidates.find((p) => existsSync(p));

  if (!root) {
    return (
      <>
        <AdminPageHeader
          eyebrow="System"
          title="Backups"
          subtitle="Daglig Postgres-dump med tierad retention (7 dagliga, 8 veckovisa, 12 månadsvisa). Status läses direkt från katalogen som kronan skriver till."
          crumbs={[
            { label: "System", href: "/admin" },
            { label: "Backups" },
          ]}
        />
        <AdminEmptyState
          intent="setup"
          title="Inga backup-filer hittade"
          body={
            <>
              Kör{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                scripts/backup-postgres.sh
              </code>{" "}
              en gång manuellt för att skapa katalogstrukturen, och lägg sedan
              in kronan från ADR 0013 (daglig 03:00). Sätt valfri{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                BACKUP_DIR
              </code>{" "}
              om du vill skriva någon annanstans än{" "}
              <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
                ./backups
              </code>
              .
            </>
          }
        />
      </>
    );
  }

  const tiers = [
    inspectTier("Daglig", join(root, "daily")),
    inspectTier("Veckovis", join(root, "weekly")),
    inspectTier("Månadsvis", join(root, "monthly")),
  ];

  // Latest of any tier — that's the freshness signal that matters.
  const newest = tiers
    .map((t) => t.latest?.mtimeMs ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const newestStale = newest === 0 || Date.now() - newest > 36 * 3_600_000;

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Backups"
        subtitle="Daglig Postgres-dump med tierad retention. Status läses direkt från katalogen som kronan skriver till."
        crumbs={[
          { label: "System", href: "/admin" },
          { label: "Backups" },
        ]}
      />

      <div
        className={`mb-8 rounded-2xl px-5 py-4 border ${
          newestStale
            ? "border-[#B5523B]/30 bg-[#B5523B]/[0.05]"
            : "border-accent/30 bg-accent/[0.05]"
        }`}
      >
        <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-semibold text-ink-soft mb-1">
          {newestStale ? "Backup verkar inaktuell" : "Backup är färsk"}
        </p>
        <p className="font-display text-lg font-medium text-primary-deep">
          {newest > 0
            ? `Senaste dump skapad ${hoursAgo(newest)} (${dateTimeFmt.format(new Date(newest))})`
            : "Ingen dump hittad i någon tier."}
        </p>
        <p className="mt-1.5 font-sans text-[13px] text-ink-mute">
          Källkatalog:{" "}
          <code className="px-1 rounded bg-surface-warm font-mono text-[12px]">
            {root}
          </code>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div
            key={t.name}
            className="bg-surface-alt border border-border rounded-2xl p-5"
          >
            <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] font-semibold text-accent-deep mb-1">
              {t.name}
            </p>
            <p className="font-display text-2xl font-medium text-primary-deep tabular-nums mb-2">
              {t.count}{" "}
              <span className="font-sans text-[12px] font-medium text-ink-mute uppercase tracking-[0.18em] not-italic">
                filer
              </span>
            </p>
            {t.latest ? (
              <div className="font-sans text-[13px] text-ink-body leading-relaxed">
                <p className="truncate">
                  <span className="text-ink-mute">Senast:</span>{" "}
                  <span className="font-mono text-[12px]">{t.latest.name}</span>
                </p>
                <p className="text-ink-mute text-[12px] mt-1 tabular-nums">
                  {formatSize(t.latest.size)} · {hoursAgo(t.latest.mtimeMs)}
                </p>
              </div>
            ) : (
              <p className="font-sans text-[13px] text-ink-mute italic">
                Inga filer i denna tier än.
              </p>
            )}
          </div>
        ))}
      </div>

      <aside className="mt-10 pt-6 border-t border-border-soft">
        <p className="font-sans text-[13px] text-ink-mute leading-relaxed max-w-[720px]">
          Kvartalsvis restore-drill (ADR 0013): återställ den senaste dumpen
          till en throw-away databas och verifiera radantal på Order, Product
          och User. Backups som aldrig återställs är teater.
        </p>
      </aside>
    </>
  );
}
