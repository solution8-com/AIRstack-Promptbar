-- Drop NOT NULL constraint so we can store text examples without media
ALTER TABLE "user_prompt_examples"
  ALTER COLUMN "mediaUrl" DROP NOT NULL;

-- Add a column that can hold markdown/text examples
ALTER TABLE "user_prompt_examples"
  ADD COLUMN "content" TEXT;
