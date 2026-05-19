-- Korg 3b-3 foundation (ADR 0028 D1): RLS bootstrap helper.
-- Additive only — creates the `app` schema + the GUC reader that
-- future FORCE ROW LEVEL SECURITY policies will use. No table has RLS
-- enabled yet, so behaviour is unchanged.

CREATE SCHEMA IF NOT EXISTS app;

-- Reads the per-transaction GUC set by withTenantRLS()'s
-- `SET LOCAL app.current_tenant_id`. `true` = missing_ok → returns
-- NULL outside a tenant tx (so policies can deny rather than error).
CREATE OR REPLACE FUNCTION app.current_tenant_id()
  RETURNS text
  LANGUAGE sql
  STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')
$$;
