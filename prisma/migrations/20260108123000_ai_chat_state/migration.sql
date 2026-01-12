CREATE TABLE IF NOT EXISTS "ai_chat_states" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "sessions" JSONB NOT NULL,
  "active_session_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_chat_states_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ai_chat_states_user_id_organization_id_key'
  ) THEN
    CREATE UNIQUE INDEX "ai_chat_states_user_id_organization_id_key"
      ON "ai_chat_states" ("user_id", "organization_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_chat_states_user_id_fkey'
  ) THEN
    ALTER TABLE "ai_chat_states"
      ADD CONSTRAINT "ai_chat_states_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_chat_states_organization_id_fkey'
  ) THEN
    ALTER TABLE "ai_chat_states"
      ADD CONSTRAINT "ai_chat_states_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
