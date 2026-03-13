-- Replace rigid type + phone with flexible title + phones JSON
ALTER TABLE "contacts" RENAME COLUMN "type" TO "title";

-- Convert single phone to JSON array with label
ALTER TABLE "contacts" ADD COLUMN "phones" JSONB NOT NULL DEFAULT '[]';

UPDATE "contacts" SET "phones" = jsonb_build_array(jsonb_build_object('label', title, 'number', phone));

ALTER TABLE "contacts" DROP COLUMN "phone";
