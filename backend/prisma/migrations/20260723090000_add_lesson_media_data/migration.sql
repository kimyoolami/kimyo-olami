ALTER TABLE "lessons"
ADD COLUMN "media_data" BYTEA,
ADD COLUMN "media_mime_type" TEXT,
ADD COLUMN "media_file_name" TEXT;
