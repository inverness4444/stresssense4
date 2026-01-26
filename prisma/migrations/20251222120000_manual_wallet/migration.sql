-- Update UserRole enum values and add new roles (only if UserRole is an enum)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole' AND typtype = 'e') THEN
    IF EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'Manager'
    ) THEN
      ALTER TYPE "UserRole" RENAME VALUE 'Manager' TO 'MANAGER';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'Employee'
    ) THEN
      ALTER TYPE "UserRole" RENAME VALUE 'Employee' TO 'EMPLOYEE';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'ADMIN'
    ) THEN
      ALTER TYPE "UserRole" ADD VALUE 'ADMIN';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'MANAGER'
    ) THEN
      ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'EMPLOYEE'
    ) THEN
      ALTER TYPE "UserRole" ADD VALUE 'EMPLOYEE';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'SUPER_ADMIN'
    ) THEN
      ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
    END IF;
  END IF;
END $$;

-- Add balance to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "balance" DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Create enums for wallet and topups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionType') THEN
    CREATE TYPE "WalletTransactionType" AS ENUM ('manual_deposit', 'manual_withdraw', 'adjustment');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionStatus') THEN
    CREATE TYPE "WalletTransactionStatus" AS ENUM ('pending', 'confirmed', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TopupRequestStatus') THEN
    CREATE TYPE "TopupRequestStatus" AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Create WalletTransaction table
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "WalletTransactionStatus" NOT NULL DEFAULT 'confirmed',
  "comment" TEXT,
  "createdByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_createdByAdminId_idx" ON "WalletTransaction"("createdByAdminId");

-- Create TopupRequest table
CREATE TABLE IF NOT EXISTS "TopupRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "details" JSONB,
  "status" "TopupRequestStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "processedByAdminId" TEXT,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "TopupRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TopupRequest_userId_idx" ON "TopupRequest"("userId");
CREATE INDEX IF NOT EXISTS "TopupRequest_processedByAdminId_idx" ON "TopupRequest"("processedByAdminId");
CREATE INDEX IF NOT EXISTS "TopupRequest_status_idx" ON "TopupRequest"("status");

-- Add foreign keys
ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TopupRequest"
  ADD CONSTRAINT "TopupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TopupRequest"
  ADD CONSTRAINT "TopupRequest_processedByAdminId_fkey" FOREIGN KEY ("processedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
