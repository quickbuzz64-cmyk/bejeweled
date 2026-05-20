-- =============================================================================
-- Vector search for products (all-MiniLM-L6-v2, 384 dimensions)
-- =============================================================================

-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 3. IVFFlat index for cosine similarity (lists=50, suitable for <100k rows)
CREATE INDEX IF NOT EXISTS products_embedding_cosine_idx
ON products
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

-- 4. RPC search function with optional filters
CREATE OR REPLACE FUNCTION search_products_by_vector(
  query_vector vector(384),
  similarity_threshold float DEFAULT 0.30,
  result_limit int DEFAULT 5,
  filter_category text DEFAULT NULL,
  filter_min_price numeric DEFAULT NULL,
  filter_max_price numeric DEFAULT NULL,
  filter_in_stock boolean DEFAULT NULL
)
RETURNS TABLE (
  id text,
  name text,
  description text,
  category text,
  price numeric,
  stock int,
  images text[],
  is_featured boolean,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id::text,
    p.name,
    p.description,
    p.category,
    p.price,
    p.stock,
    p.images,
    p.is_featured,
    1 - (p.embedding <=> query_vector) AS similarity
  FROM products p
  WHERE
    p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_vector)) > similarity_threshold
    AND (filter_category IS NULL OR p.category ILIKE filter_category)
    AND (filter_min_price IS NULL OR p.price >= filter_min_price)
    AND (filter_max_price IS NULL OR p.price <= filter_max_price)
    AND (filter_in_stock IS NULL OR (p.stock > 0) = filter_in_stock)
  ORDER BY p.embedding <=> query_vector
  LIMIT result_limit;
$$;

-- 5. After applying this migration, run the indexing script to backfill
--    embeddings for all existing products:
--
--      npx tsx api/scripts/indexProducts.ts
--
--    The script fetches every product where embedding IS NULL, generates a
--    384-dim vector using all-MiniLM-L6-v2 via Transformers.js, and writes
--    the result back to the row. Re-run it whenever new products are added
--    without embeddings.
