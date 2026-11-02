BEGIN;
ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "oauth_identities" ADD COLUMN "providerScope" TEXT NOT NULL DEFAULT 'legacy';
-- Google subjects can be shared across clients. Facebook subjects are app-scoped;
-- legacy Facebook identities require explicit linking after verification.
UPDATE "oauth_identities" SET "providerScope" = 'google' WHERE "provider" = 'GOOGLE';
DROP INDEX "oauth_identities_provider_providerUserId_key";
CREATE UNIQUE INDEX "oauth_identities_provider_providerScope_providerUserId_key"
ON "oauth_identities"("provider", "providerScope", "providerUserId");

-- Preserve every existing membership ID and identity. A membership is attached
-- to a common User only after the user proves control during OAuth exchange.
ALTER TABLE "app_users" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "app_users_applicationId_userId_key" ON "app_users"("applicationId", "userId");
CREATE INDEX "app_users_userId_idx" ON "app_users"("userId");
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
