ALTER TABLE "courses"
  ADD COLUMN "price_stars" INTEGER,
  ADD COLUMN "price_uzs" INTEGER,
  ADD COLUMN "access_days" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "telegram_channel_id" TEXT;

ALTER TABLE "payments" ADD COLUMN "course_id" UUID;

CREATE TABLE "course_access" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "course_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "course_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_access_user_id_course_id_key"
  ON "course_access"("user_id", "course_id");
CREATE INDEX "course_access_expires_at_idx" ON "course_access"("expires_at");
CREATE INDEX "payments_course_id_created_at_idx"
  ON "payments"("course_id", "created_at");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_access"
  ADD CONSTRAINT "course_access_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_access"
  ADD CONSTRAINT "course_access_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "courses"
SET
  "price_stars" = 100,
  "price_uzs" = 49000,
  "access_days" = 30,
  "telegram_channel_id" = '-1004499182599'
WHERE "slug" = 'video-yechimlar';

INSERT INTO "course_access" ("user_id", "course_id", "expires_at", "updated_at")
SELECT u."id", c."id", u."premium_until", CURRENT_TIMESTAMP
FROM "users" u
CROSS JOIN "courses" c
WHERE c."slug" = 'video-yechimlar'
  AND u."is_premium" = TRUE
  AND u."premium_until" > CURRENT_TIMESTAMP
ON CONFLICT ("user_id", "course_id")
DO UPDATE SET "expires_at" = EXCLUDED."expires_at", "updated_at" = CURRENT_TIMESTAMP;

UPDATE "payments" p
SET "course_id" = c."id"
FROM "courses" c
WHERE c."slug" = 'video-yechimlar' AND p."course_id" IS NULL;
