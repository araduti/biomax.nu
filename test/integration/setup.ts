import { beforeAll, afterAll } from "vitest";
import { prisma, disconnect } from "./db";

beforeAll(async () => {
  // Fail fast with a clear message if the test DB isn't reachable /
  // migrated, instead of every test throwing a cryptic connection error.
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "Product" LIMIT 1');
  } catch (err) {
    throw new Error(
      "[integration] cannot reach the migrated test database. " +
        "Start it with `docker compose -f docker-compose.dev.yml up -d db` " +
        "and ensure the biomax_test schema is applied.\n" +
        String(err)
    );
  }
});

afterAll(async () => {
  await disconnect();
});
