-- Korg 3b-3 Product pilot (ADR 0028 D1): first FORCE RLS model.
--
-- Transitional policy: STRICT when a tenant GUC is set (the
-- withTenantRLS path → proves isolation), PERMISSIVE when it is unset
-- (legacy/unwrapped Product accessors keep working until each is
-- migrated). The final lock-down (later sub-slice) drops the
-- `app.current_tenant_id() IS NULL OR` clause to make it unconditional.
--
-- NOTE: FORCE RLS still does NOT apply to a superuser / BYPASSRLS
-- role. If the dev DATABASE_URL role is superuser, isolation won't be
-- observable until a dedicated non-superuser app role is used
-- (ADR 0028 D1 / ADR 0029 — known infra requirement).

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;

CREATE POLICY "Product_tenant_isolation" ON "Product"
  USING (
    app.current_tenant_id() IS NULL
    OR "tenantId" = app.current_tenant_id()
  )
  WITH CHECK (
    app.current_tenant_id() IS NULL
    OR "tenantId" = app.current_tenant_id()
  );
