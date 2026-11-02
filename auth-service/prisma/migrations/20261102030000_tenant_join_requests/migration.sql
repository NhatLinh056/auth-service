BEGIN;

CREATE TYPE "TenantJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "tenant_join_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "status" "TenantJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tenant_join_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tenant_join_requests_userId_tenantId_key" ON "tenant_join_requests"("userId", "tenantId");
CREATE INDEX "tenant_join_requests_tenantId_status_idx" ON "tenant_join_requests"("tenantId", "status");
CREATE INDEX "tenant_join_requests_userId_status_idx" ON "tenant_join_requests"("userId", "status");

COMMIT;

