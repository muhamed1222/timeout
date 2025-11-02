-- Add avatar_id and photo_url fields to employee table
ALTER TABLE "employee" 
ADD COLUMN IF NOT EXISTS "avatar_id" integer,
ADD COLUMN IF NOT EXISTS "photo_url" text;

-- Add comment for documentation
COMMENT ON COLUMN "employee"."avatar_id" IS 'ID of selected template avatar (1-8)';
COMMENT ON COLUMN "employee"."photo_url" IS 'URL of uploaded employee photo';

