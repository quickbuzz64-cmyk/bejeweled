/**
 * One-time (or re-runnable) script to backfill product embeddings.
 *
 * Usage:
 *   npx tsx api/scripts/indexProducts.ts
 *
 * Requires these env vars (set them in .env.local or export before running):
 *   VITE_SUPABASE_URL  (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../lib/embeddings';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing env vars. Set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('[indexProducts] Fetching products with no embedding…');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, category')
    .is('embedding', null);

  if (error) {
    console.error('[indexProducts] Failed to fetch products:', error.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('[indexProducts] All products already have embeddings. Nothing to do.');
    return;
  }

  console.log(`[indexProducts] Found ${products.length} product(s) to index.\n`);

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const text = [
      product.name,
      product.description ?? '',
      product.category ? `Category: ${product.category}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    const embedding = await generateEmbedding(text);

    const { error: updateError } = await supabase
      .from('products')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', product.id);

    if (updateError) {
      console.error(`[indexProducts] Failed to update ${product.name}:`, updateError.message);
    } else {
      console.log(`Indexed ${i + 1}/${products.length}: ${product.name}`);
    }
  }

  console.log('\n[indexProducts] Done.');
}

main().catch((err) => {
  console.error('[indexProducts] Unhandled error:', err);
  process.exit(1);
});
