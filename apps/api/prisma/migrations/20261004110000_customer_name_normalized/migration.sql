CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE "Customer"
  ADD COLUMN "nameNormalized" TEXT;

UPDATE "Customer"
SET "nameNormalized" = lower(unaccent(coalesce("name", '')))
WHERE "name" IS NOT NULL;

CREATE INDEX "Customer_nameNormalized_idx" ON "Customer" ("nameNormalized");
