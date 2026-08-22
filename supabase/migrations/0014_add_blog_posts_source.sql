-- Add source column to blog_posts table if it doesn't exist
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
