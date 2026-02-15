
ALTER TYPE pothole_status ADD VALUE 'archived';

ALTER TABLE potholes ADD COLUMN repaired_at timestamptz;
ALTER TABLE potholes ADD COLUMN reopen_count integer NOT NULL DEFAULT 0;
