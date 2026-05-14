#!/usr/bin/env -S npx tsx

/**
 * One-shot backfill: create a LoyaltyAccount (with welcome bonus) for
 * every existing User that doesn't have one yet. Safe to re-run — the
 * `ensureAccount` helper is idempotent.
 *
 * Run once after the loyalty migration lands, then delete or archive.
 *
 *   npx tsx scripts/backfill-loyalty-accounts.ts
 */

import { prisma } from "../lib/prisma";
import { ensureAccount } from "../lib/loyalty/account";

async function main() {
  const users = await prisma.user.findMany({
    where: { loyaltyAccount: null },
    select: { id: true, email: true },
  });

  console.log(`Found ${users.length} users without a loyalty account.\n`);

  let ok = 0;
  let failed = 0;
  for (const u of users) {
    try {
      await ensureAccount(u.id);
      ok++;
      if (ok % 50 === 0) console.log(`  ${ok}/${users.length}…`);
    } catch (err) {
      failed++;
      console.error(`  FAILED for ${u.email}:`, (err as Error).message);
    }
  }

  console.log(`\nDone. Enrolled ${ok}, failed ${failed}.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
