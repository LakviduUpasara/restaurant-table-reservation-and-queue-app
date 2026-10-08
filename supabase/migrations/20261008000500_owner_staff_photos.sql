-- Owner user management stores the photo path in existing Auth user_metadata.
-- Photos remain private; the Owner API supplies temporary signed read URLs.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('staff-photos', 'staff-photos', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

COMMIT;
