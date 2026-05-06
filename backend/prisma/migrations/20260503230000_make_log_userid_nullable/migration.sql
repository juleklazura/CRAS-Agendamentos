-- AlterTable: make user_id nullable in logs to allow audit entries without an associated user
-- (e.g. login_falha when the matricula doesn't exist in the system)
-- This is a safe operation: no data is deleted or modified, only the NOT NULL constraint is dropped.
ALTER TABLE "logs" ALTER COLUMN "user_id" DROP NOT NULL;
