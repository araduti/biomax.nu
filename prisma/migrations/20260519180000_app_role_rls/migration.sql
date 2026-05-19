-- Korg 3b-3a (ADR 0028 D1 / ADR 0029): least-privilege runtime role.
--
-- RLS is bypassed for superuser/BYPASSRLS roles. Migrations keep
-- running as the privileged role (DATABASE_URL); the *runtime* must
-- connect as this NON-superuser, NON-BYPASSRLS role so FORCE RLS
-- policies are actually enforced.
--
-- DEV ONLY password below — idempotent-guarded. In production the
-- role + secret are provisioned by infra (ADR 0029), not this file.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'korg_app') THEN
    CREATE ROLE korg_app LOGIN PASSWORD 'korgapp_dev_only'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

-- Schema + object access (DML only — no DDL, no ownership).
GRANT USAGE ON SCHEMA public, app TO korg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO korg_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO korg_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO korg_app;

-- Future migrations run as the privileged role "biomax" (the dev
-- DATABASE_URL role); auto-grant their new tables/sequences to the
-- app role so a new model never silently breaks the runtime.
ALTER DEFAULT PRIVILEGES FOR ROLE biomax IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO korg_app;
ALTER DEFAULT PRIVILEGES FOR ROLE biomax IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO korg_app;
ALTER DEFAULT PRIVILEGES FOR ROLE biomax IN SCHEMA app
  GRANT EXECUTE ON FUNCTIONS TO korg_app;
