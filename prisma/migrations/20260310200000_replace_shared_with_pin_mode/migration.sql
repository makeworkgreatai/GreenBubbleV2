-- Replace shared boolean with pin_mode string
ALTER TABLE "users" ADD COLUMN "pin_mode" TEXT NOT NULL DEFAULT 'named';

-- Migrate existing data: shared=true becomes "shared", shared=false becomes "named"
UPDATE "users" SET "pin_mode" = 'shared' WHERE "shared" = true;

-- Drop the old column
ALTER TABLE "users" DROP COLUMN "shared";
