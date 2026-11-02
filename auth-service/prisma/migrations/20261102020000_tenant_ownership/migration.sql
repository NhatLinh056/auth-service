BEGIN;
CREATE TABLE "tenants" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ownerUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tenants_ownerUserId_key" ON "tenants"("ownerUserId");
ALTER TABLE "users" ADD COLUMN "tenantId" TEXT;
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- No foreign keys here: audit evidence survives deletion of a tenant/account.
CREATE TABLE "tenant_audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL,
  "tenantName" TEXT NOT NULL, "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "fromOwnerId" TEXT, "toOwnerId" TEXT,
  "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "tenant_audit_logs_tenantId_createdAt_idx" ON "tenant_audit_logs"("tenantId", "createdAt");
COMMIT;
