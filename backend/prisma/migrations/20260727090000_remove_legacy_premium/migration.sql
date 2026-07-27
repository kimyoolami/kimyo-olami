ALTER TABLE "users"
  DROP COLUMN IF EXISTS "is_premium",
  DROP COLUMN IF EXISTS "premium_until";

ALTER TABLE "courses"
  DROP COLUMN IF EXISTS "is_premium";
