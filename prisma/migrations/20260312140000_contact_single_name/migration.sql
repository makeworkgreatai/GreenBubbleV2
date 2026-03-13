-- Merge first_name + last_name into single name column
ALTER TABLE "contacts" ADD COLUMN "name" TEXT;

UPDATE "contacts" SET "name" = TRIM(first_name || ' ' || last_name);

ALTER TABLE "contacts" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "contacts" DROP COLUMN "first_name";
ALTER TABLE "contacts" DROP COLUMN "last_name";
