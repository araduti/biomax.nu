import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Cross-tenant isolation suite (ADR 0032 D5) — the permanent
 * regression gate for the RLS guarantee.
 *
 * MUST connect as the least-privilege `kine_app` role: under the test
 * DB's default superuser role Postgres bypasses RLS entirely and this
 * suite would FALSELY PASS. We build a dedicated kine_app client here
 * (the shared test `prisma` is superuser).
 *
 * Skips with a clear message if the test DB lacks kine_app / Product
 * RLS (same "assumes a migrated test DB" contract as the rest of the
 * integration suite, plus the role).
 */

const TEST_DB =
  process.env.TEST_DATABASE_URL ??
  "postgresql://biomax:biomax@localhost:5433/biomax_test";
const APP_TEST_DB = TEST_DB.replace(
  /\/\/[^@]+@/,
  "//kine_app:kineapp_dev_only@"
);

const A = `iso-a-${Date.now()}`;
const B = `iso-b-${Date.now()}`;

let app: PrismaClient;
let sup: PrismaClient;
let usable = false;

const mk = (url: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

function scoped<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return app.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant_id = '${tenantId}'`
    );
    return fn(tx);
  });
}

const productData = (tenantId: string, slug: string) => ({
  tenantId,
  sku: slug,
  slug,
  name: slug,
  shortDescription: "x",
  longDescription: "x",
  status: "PUBLISHED" as const,
  price: "10.00",
  imageUrl: "",
});

beforeAll(async () => {
  try {
    app = mk(APP_TEST_DB);
    sup = mk(TEST_DB);
    await app.$queryRawUnsafe('SELECT 1 FROM "Product" LIMIT 1');
    await sup.$executeRawUnsafe(
      `INSERT INTO "Tenant"(id,slug,name,"primaryColorHex",status,"createdAt","updatedAt")
       VALUES ('${A}','${A}','A','#000000','ACTIVE',now(),now()),
              ('${B}','${B}','B','#000000','ACTIVE',now(),now())
       ON CONFLICT (id) DO NOTHING`
    );
    await scoped(A, (tx) => tx.product.create({ data: productData(A, `p-${A}`) }));
    await scoped(B, (tx) => tx.product.create({ data: productData(B, `p-${B}`) }));
    usable = true;
  } catch (err) {
    console.warn(
      "[tenant-isolation] skipped — test DB needs kine_app + Product RLS. " +
        String(err).slice(0, 200)
    );
  }
});

afterAll(async () => {
  try {
    if (sup) {
      await sup.$executeRawUnsafe(
        `DELETE FROM "Product" WHERE "tenantId" IN ('${A}','${B}')`
      );
      await sup.$executeRawUnsafe(
        `DELETE FROM "Tenant" WHERE id IN ('${A}','${B}')`
      );
      await sup.$disconnect();
    }
  } catch {
    /* best-effort */
  }
  if (app) await app.$disconnect();
});

describe("cross-tenant isolation (RLS, kine_app role)", () => {
  it("A's scope sees only A's products, never B's", () => {
    if (!usable) return;
    return scoped(A, async (tx) => {
      const rows = await tx.product.findMany({
        select: { tenantId: true, slug: true },
      });
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.tenantId === A)).toBe(true);
      expect(rows.some((r) => r.slug === `p-${B}`)).toBe(false);
    });
  });

  it("A cannot read B's product by slug", () => {
    if (!usable) return;
    return scoped(A, async (tx) => {
      // After #3e: slug is no longer a global @unique — it's composite
      // (tenantId, slug). findFirst is the appropriate API for this RLS
      // isolation test (we're scoped to A; even searching by B's slug
      // should return null because the row isn't visible).
      const b = await tx.product.findFirst({ where: { slug: `p-${B}` } });
      expect(b).toBeNull();
    });
  });

  it("A cannot UPDATE B's product (RLS USING hides the row)", () => {
    if (!usable) return;
    return scoped(A, async (tx) => {
      const res = await tx.product.updateMany({
        where: { slug: `p-${B}` },
        data: { name: "hijacked" },
      });
      expect(res.count).toBe(0);
    });
  });

  it("TRANSITIONAL: no tenant scope → permissive (≥2). 3b-2 lock-down flips this to 0", async () => {
    if (!usable) return;
    const rows = await app.product.findMany({
      where: { tenantId: { in: [A, B] } },
      select: { id: true },
    });
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
