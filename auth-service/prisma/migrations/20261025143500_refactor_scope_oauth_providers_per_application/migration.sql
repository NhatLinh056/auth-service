-- Truncate existing global unassigned oauth_providers records
DELETE FROM "oauth_providers";

-- AlterTable: Add applicationId to oauth_providers
ALTER TABLE "oauth_providers" ADD COLUMN "applicationId" TEXT NOT NULL;

-- Drop old unique index on provider
DROP INDEX IF EXISTS "oauth_providers_provider_key";

-- Create new compound unique index on (applicationId, provider)
CREATE UNIQUE INDEX "oauth_providers_applicationId_provider_key" ON "oauth_providers"("applicationId", "provider");

-- Add Foreign Key to applications with CASCADE on delete
ALTER TABLE "oauth_providers" ADD CONSTRAINT "oauth_providers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Populate default providers (GOOGLE, FACEBOOK) for all existing applications
INSERT INTO "oauth_providers" ("id", "applicationId", "provider", "name", "isEnabled", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    a."id",
    p.provider::"OAuthProviderType",
    p.name,
    false,
    NOW(),
    NOW()
FROM "applications" a
CROSS JOIN (
    VALUES ('GOOGLE', 'Google'), ('FACEBOOK', 'Facebook')
) AS p(provider, name);
