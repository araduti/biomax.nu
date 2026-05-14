-- CreateEnum
CREATE TYPE "HomepageHeroStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "HomepageHeroSeason" AS ENUM ('var', 'sommar', 'host', 'vinter');

-- CreateTable
CREATE TABLE "HomepageHero" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "motif"     TEXT NOT NULL,
  "caption"   TEXT NOT NULL,
  "accent"    TEXT NOT NULL,
  "photoUrl"  TEXT NOT NULL,
  "photoAlt"  TEXT NOT NULL,
  "season"    "HomepageHeroSeason",
  "startsAt"  TIMESTAMP(3),
  "endsAt"    TIMESTAMP(3),
  "priority"  INTEGER NOT NULL DEFAULT 0,
  "status"    "HomepageHeroStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HomepageHero_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageHero_status_idx"            ON "HomepageHero"("status");
CREATE INDEX "HomepageHero_season_idx"            ON "HomepageHero"("season");
CREATE INDEX "HomepageHero_startsAt_endsAt_idx"   ON "HomepageHero"("startsAt", "endsAt");

-- Seed the 4 seasons + Midsommar 2026 so the admin list isn't empty
-- on first visit and the homepage keeps rendering immediately.
-- IDs use a stable prefix ('hero-seed-') so reseed scripts can tell
-- defaults from editor-created rows.
INSERT INTO "HomepageHero" ("id", "name", "motif", "caption", "accent", "photoUrl", "photoAlt", "season", "priority", "status", "updatedAt") VALUES
  ('hero-seed-var',     'Vår — när häggen blommar', 'När häggen blommar',     'Vit hägg mot djupgrön skog, mitten av maj',          '#7A8B6F', 'https://images.unsplash.com/photo-1588280991779-bf36c2af6727', 'Häggens vita blomklasar mot djupgrön vårskog',      'var',    0, 'PUBLISHED', NOW()),
  ('hero-seed-sommar',  'Sommar — vid vattnet',     'Långa ljusa kvällar',    'Vid vattnet i juli',                                  '#D4A574', 'https://images.unsplash.com/photo-1660063846374-8f98fd32cbc3', 'Sommarstämning vid vattnet i nordisk natur',        'sommar', 0, 'PUBLISHED', NOW()),
  ('hero-seed-host',    'Höst — lönn och berberis', 'Höstens glöd',           'Lönn och berberis i oktober',                         '#B5523B', 'https://images.unsplash.com/photo-1665513849007-0974b3ccec81', 'Person promenerar i höstskog med gyllene löv',      'host',   0, 'PUBLISHED', NOW()),
  ('hero-seed-vinter',  'Vinter — barrskogen',      'Hand i hand i snön',     'Snöbarrskog i januari',                               '#7B97A3', 'https://images.unsplash.com/photo-1764773964890-c00c7082b90d', 'Par går hand i hand genom snötäckt barrskog',       'vinter', 0, 'PUBLISHED', NOW()),
  ('hero-seed-midsommar-2026', 'Midsommar 2026', 'Midsommarafton',         'Blomsterkrans, kalla källan, vänner i sommarljus',    '#D4A574', 'https://images.unsplash.com/photo-1591608971362-f08b2a75731a', 'Blomsterkrans och midsommarstämning i nordisk sommar', NULL, 10, 'DRAFT', NOW());

-- Midsommar 2026 is seeded as DRAFT so the editor can review and publish
-- when ready. Date window is set explicitly here:
UPDATE "HomepageHero" SET "startsAt" = '2026-06-15 00:00:00', "endsAt" = '2026-06-26 23:59:59' WHERE "id" = 'hero-seed-midsommar-2026';
