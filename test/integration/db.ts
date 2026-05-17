import { prisma } from "@/lib/prisma";

/**
 * Hard safety rail: these helpers TRUNCATE tables. Refuse to touch
 * anything that isn't an explicit *_test database so a mis-set
 * DATABASE_URL can never wipe dev/prod data.
 */
const url = process.env.DATABASE_URL ?? "";
if (!/_test(\?|$)/.test(url) && !url.includes("biomax_test")) {
  throw new Error(
    `[integration] refusing to run against non-test DB: ${url || "(unset)"}`
  );
}

export { prisma };

/**
 * Wipe the tables the money-path suite writes, in FK-safe order.
 * CASCADE handles child rows (ReturnItem, OrderItem, SubscriptionLine).
 */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ReturnItem","Return","OrderItem","Order",
      "SubscriptionLine","Subscription",
      "ProductVariant","Product","Address"
    RESTART IDENTITY CASCADE
  `);
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
