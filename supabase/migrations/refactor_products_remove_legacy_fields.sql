-- Migration: Remove legacy per-product fields and add OG metadata columns
-- These fields are no longer used in the product form:
--   material, capacity, dimensions, weight, shipping_info, category
-- New OG metadata columns are added: og_title, og_description

-- Add new OG columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS og_title        text,
  ADD COLUMN IF NOT EXISTS og_description  text;

-- Drop legacy columns (run only after confirming no data loss is acceptable)
-- ALTER TABLE products
--   DROP COLUMN IF EXISTS material,
--   DROP COLUMN IF EXISTS capacity,
--   DROP COLUMN IF EXISTS dimensions,
--   DROP COLUMN IF EXISTS weight,
--   DROP COLUMN IF EXISTS shipping_info;

-- NOTE: The DROP statements above are commented out for safety.
-- Run them manually once you've confirmed existing product data migration
-- or that the columns are no longer needed in production.
