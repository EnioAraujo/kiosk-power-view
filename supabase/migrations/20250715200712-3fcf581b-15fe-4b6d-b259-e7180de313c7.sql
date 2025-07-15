-- Update default refresh_interval to 5 minutes instead of 5 seconds
ALTER TABLE presentations ALTER COLUMN refresh_interval SET DEFAULT 5;