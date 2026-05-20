/**
 * One-shot script: fills all missing product fields in Supabase.
 * Run: npx tsx --env-file=.env.local scripts/fillProductData.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SHIPPING_INFO =
  'Dispatched within 1–2 business days from our Lahore fulfilment warehouse. Standard delivery: 3–5 business days nationwide. Delivery charge: Rs 250 flat rate — FREE on orders above Rs 2,000. Cash on Delivery available.';

const products: {
  id: string;
  material: string;
  capacity: string;
  dimensions: string;
  weight: string;
  care: string;
  shipping_info: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
}[] = [
  // ── Square Glass Mug ────────────────────────────────────────────────────
  {
    id: 'ee0ac260-9efa-460f-b6f0-a4f25b9a502e',
    material: 'Borosilicate Glass, Wooden Lid, Glass Straw',
    capacity: '400ml',
    dimensions: '9 × 9 × 10 cm',
    weight: '220g',
    care: 'Hand wash recommended. Dishwasher safe (top rack only). Keep wooden lid away from prolonged water exposure. Not microwave safe.',
    shipping_info: SHIPPING_INFO,
    slug: 'square-glass-mug',
    meta_title: 'Square Glass Mug 400ml – Wooden Lid & Glass Straw | Bejeweled',
    meta_description:
      'Stylish 400ml square borosilicate glass mug with wooden lid and eco-friendly glass straw. Perfect for coffee, juice, milk, and smoothies. Shop now at Bejeweled — free delivery over Rs 2,000.',
    meta_keywords:
      'square glass mug, 400ml glass mug, borosilicate mug, wooden lid mug, glass straw mug, coffee mug Pakistan, buy mug online Pakistan',
  },

  // ── Cute Girl Transparent Glass Heat Resistant Tumbler ──────────────────
  {
    id: '8e5d1623-f692-4bc4-a7d9-c0bcd046c86b',
    material: 'Heat-Resistant Borosilicate Glass',
    capacity: '400ml',
    dimensions: '8 × 8 × 14 cm',
    weight: '180g',
    care: 'Hand wash recommended. Safe for both hot and cold beverages. Not microwave safe. Avoid sudden extreme temperature changes.',
    shipping_info: SHIPPING_INFO,
    slug: 'cute-girl-transparent-glass-heat-resistant-tumbler',
    meta_title: 'Cute Girl Heat Resistant Glass Tumbler 400ml | Bejeweled',
    meta_description:
      'Double-wall heat resistant borosilicate glass tumbler, 400ml. Lightweight and easy to clean — ideal for tea, coffee, cold drinks. Shop at Bejeweled.',
    meta_keywords:
      'heat resistant glass tumbler, transparent glass mug, double wall glass tumbler, cute glass mug Pakistan, borosilicate tumbler',
  },

  // ── 3D Creative Glass Cups Transparent Mugs ─────────────────────────────
  {
    id: 'b3a6cc0b-82e8-497b-a798-8550dee188c7',
    material: 'Borosilicate Glass',
    capacity: '300ml',
    dimensions: '10 × 8 × 9 cm',
    weight: '200g',
    care: 'Hand wash only. Avoid sudden temperature changes. Do not expose to direct flame.',
    shipping_info: SHIPPING_INFO,
    slug: '3d-creative-glass-cups-transparent-mugs',
    meta_title: '3D Creative Glass Cups – Transparent Mugs with Handle | Bejeweled',
    meta_description:
      'Unique 3D creative transparent glass mugs with handle. Heat resistant, perfect for coffee, milk, and as festival gifts. Order online at Bejeweled.',
    meta_keywords:
      '3D glass mug, creative glass cup, transparent coffee mug, heat resistant glass mug, festival gift mug Pakistan, cute glass cup',
  },

  // ── Cute Bow Glass Sipper with Straw ────────────────────────────────────
  {
    id: '00f2b77e-3019-4815-8efc-f14f8aa68a7c',
    material: 'Borosilicate Glass, Wooden Lid, Reusable Straw',
    capacity: '550ml',
    dimensions: '9 × 9 × 18 cm',
    weight: '280g',
    care: 'Hand wash recommended. Wooden lid should not be soaked in water. Straw can be cleaned with a brush. Not microwave safe.',
    shipping_info: SHIPPING_INFO,
    slug: 'cute-bow-glass-sipper-with-straw',
    meta_title: 'Cute Bow Glass Sipper Mug with Straw 550ml | Bejeweled',
    meta_description:
      'Charming bow-design glass sipper with 550ml capacity, wooden lid, and straw. Perfect for juice, coffee, or smoothies. Shop at Bejeweled — free delivery over Rs 2,000.',
    meta_keywords:
      'bow glass mug, sipper with straw, cute glass sipper, 550ml glass mug Pakistan, bow tumbler, glass water bottle',
  },

  // ── Double Wall Coffee Glass Mug ─────────────────────────────────────────
  {
    id: '6a4b7efe-faee-4e61-9064-08bf7f421069',
    material: 'Double-Wall Borosilicate Glass',
    capacity: '250ml / 350ml / 450ml',
    dimensions: 'Varies by size (approx. 8–10 cm diameter)',
    weight: '150g – 250g (varies by size)',
    care: 'Hand wash recommended. Safe for hot and cold beverages. Microwave safe. Do not use abrasive scrubbers.',
    shipping_info: SHIPPING_INFO,
    slug: 'double-wall-coffee-glass-mug',
    meta_title: 'Double Wall Coffee Glass Mug 250ml / 350ml / 450ml | Bejeweled',
    meta_description:
      'Insulating double-wall borosilicate glass coffee mug — keeps drinks hot or cold longer. Available in 250ml, 350ml, and 450ml. Shop now at Bejeweled.',
    meta_keywords:
      'double wall glass mug, double wall coffee mug, borosilicate coffee cup, heat resistant glass mug, insulated glass mug Pakistan',
  },

  // ── Rabbit Straw Glass Mug ───────────────────────────────────────────────
  {
    id: '72ffcd4b-3ad6-4f4e-b3bb-a12c4590dcb1',
    material: 'Borosilicate Glass, Silicone Sleeve',
    capacity: '500ml',
    dimensions: '8 × 8 × 22 cm',
    weight: '250g',
    care: 'Hand wash recommended. Silicone sleeve is removable for easy cleaning. Not microwave safe. Do not drop — glass body is fragile.',
    shipping_info: SHIPPING_INFO,
    slug: 'rabbit-straw-glass-mug',
    meta_title: 'Rabbit Straw Glass Mug 500ml with Silicone Sleeve | Bejeweled',
    meta_description:
      'Adorable rabbit-design glass tumbler with straw and protective silicone sleeve. 500ml capacity — perfect for home, office, or school. Shop at Bejeweled.',
    meta_keywords:
      'rabbit glass mug, straw glass tumbler, silicone sleeve glass bottle, cute water bottle Pakistan, 500ml glass tumbler',
  },
];

async function run() {
  console.log(`Updating ${products.length} products...\n`);

  for (const { id, ...fields } of products) {
    const { data, error } = await supabase
      .from('products')
      .update(fields)
      .eq('id', id)
      .select('id, name')
      .single();

    if (error) {
      console.error(`  ✗ ${id}: ${error.message}`);
    } else {
      console.log(`  ✓ ${data.name}`);
    }
  }

  console.log('\nDone.');
}

void run();
