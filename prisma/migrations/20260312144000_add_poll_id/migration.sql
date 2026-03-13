-- Add poll_id to locations
ALTER TABLE "locations" ADD COLUMN "poll_id" TEXT;

CREATE UNIQUE INDEX "locations_poll_id_key" ON "locations"("poll_id");
