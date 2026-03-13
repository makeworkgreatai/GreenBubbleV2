-- Add poll_id column to locations (nullable, unique)
ALTER TABLE "locations" ADD COLUMN "poll_id" TEXT;

CREATE UNIQUE INDEX "locations_poll_id_key" ON "locations"("poll_id");
