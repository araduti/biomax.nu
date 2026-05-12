/**
 * Promote a user to admin role.
 *
 * Usage:
 *   npx tsx scripts/make-admin.ts user@email.com
 *
 * Run after creating an account at /skapa-konto. The change is immediate;
 * the user just needs to refresh / re-fetch session.
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, role: true },
  });
  if (!user) {
    console.error(`✗ No user found with email ${email}`);
    process.exit(1);
  }
  if (user.role === "admin") {
    console.log(`✓ ${user.email} is already admin`);
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
  });
  console.log(`✓ Promoted ${user.email} to admin`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
