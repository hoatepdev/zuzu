ALTER TABLE "Service"
  ADD COLUMN "stt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", name, id) AS position
  FROM "Service"
)
UPDATE "Service" AS service
SET "stt" = ranked.position
FROM ranked
WHERE service.id = ranked.id;

UPDATE "Service"
SET "isDefault" = true
WHERE name = 'Giặt thường';

CREATE UNIQUE INDEX "Service_single_default_idx"
  ON "Service" ("isDefault")
  WHERE "isDefault" = true;
