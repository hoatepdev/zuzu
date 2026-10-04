CREATE TYPE "DuePeriod" AS ENUM ('MORNING', 'AFTERNOON');

ALTER TABLE "Order" ADD COLUMN "duePeriod" "DuePeriod";
