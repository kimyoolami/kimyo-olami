CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'REFUNDED');

CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "payload" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XTR',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "telegram_payment_charge_id" TEXT,
  "provider_payment_charge_id" TEXT,
  "paid_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_payload_key" ON "payments"("payload");
CREATE UNIQUE INDEX "payments_telegram_payment_charge_id_key" ON "payments"("telegram_payment_charge_id");
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
