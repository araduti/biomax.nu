-- Kine 3b-2 (post-#3e housekeeping): rename the runtime DB role from
-- `korg_app` to `kine_app` to match the brand.
--
-- ALTER ROLE RENAME preserves all grants, owned objects, default
-- privileges, and configuration parameters (statement_timeout,
-- idle_in_transaction_session_timeout set by 20260520120000). The
-- only thing callers need to update is the role name in connection
-- strings — production env vars and test fixtures, NOT the migrations
-- already applied (those remain historical record).
--
-- Password is rotated alongside the rename so a leaked
-- `korgapp_dev_only` from the prior name no longer authenticates.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'korg_app')
     AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kine_app') THEN
    ALTER ROLE korg_app RENAME TO kine_app;
  END IF;
END $$;

-- Reset password under the new name (dev-only; prod sets via infra).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kine_app') THEN
    ALTER ROLE kine_app WITH PASSWORD 'kineapp_dev_only';
  END IF;
END $$;

-- The default privileges granted by the previous migration are role-
-- name-keyed in pg_default_acl. RENAME ROLE updates those references
-- automatically — no re-grant needed.
