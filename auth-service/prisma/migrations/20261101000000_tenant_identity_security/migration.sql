-- Additive migration: supports both migrated databases and existing db-push installations.
BEGIN;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "adminEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "allowedRedirectUris" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE TABLE IF NOT EXISTS "app_users" (
  "id" TEXT PRIMARY KEY,
  "applicationId" TEXT NOT NULL REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email" TEXT NOT NULL, "name" TEXT, "avatarUrl" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_applicationId_email_key" ON "app_users"("applicationId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "app_users_id_applicationId_key" ON "app_users"("id", "applicationId");
CREATE INDEX IF NOT EXISTS "app_users_applicationId_idx" ON "app_users"("applicationId");
CREATE TABLE IF NOT EXISTS "app_oauth_identities" (
  "id" TEXT PRIMARY KEY, "appUserId" TEXT NOT NULL, "applicationId" TEXT,
  "provider" "OAuthProviderType" NOT NULL, "providerUserId" TEXT NOT NULL, "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "app_oauth_identities" ADD COLUMN IF NOT EXISTS "applicationId" TEXT;
UPDATE "app_oauth_identities" i SET "applicationId" = u."applicationId"
FROM "app_users" u WHERE i."appUserId" = u."id" AND i."applicationId" IS NULL;
ALTER TABLE "app_oauth_identities" ALTER COLUMN "applicationId" SET NOT NULL;
DROP INDEX IF EXISTS "app_oauth_identities_provider_providerUserId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "app_oauth_identities_applicationId_provider_providerUserId_key"
ON "app_oauth_identities"("applicationId", "provider", "providerUserId");
CREATE INDEX IF NOT EXISTS "app_oauth_identities_appUserId_idx" ON "app_oauth_identities"("appUserId");
ALTER TABLE "app_oauth_identities" DROP CONSTRAINT IF EXISTS "app_oauth_identities_appUserId_fkey";
ALTER TABLE "app_oauth_identities" ADD CONSTRAINT "app_oauth_identities_appUserId_applicationId_fkey"
FOREIGN KEY ("appUserId", "applicationId") REFERENCES "app_users"("id", "applicationId") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
