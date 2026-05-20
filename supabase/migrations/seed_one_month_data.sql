-- =============================================================
-- Bejeweled Jewelry Store — One-Month Business Story Seed
-- Date range: April 20 – May 20, 2026
-- Run in Supabase SQL Editor (safe to re-run with TRUNCATE guard)
-- =============================================================

-- ─── Guard: skip if products already seeded ──────────────────
DO $guard$
BEGIN
  IF (SELECT COUNT(*) FROM public.products) > 5 THEN
    RAISE NOTICE 'Seed already applied — skipping.';
    RETURN;
  END IF;
END $guard$;

-- ═══════════════════════════════════════════════════════════
-- 1. PRODUCTS  (20 real jewelry items)
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.products
  (id, name, description, price, stock, category, rating, images, is_featured,
   material, weight, care, shipping_info, slug, meta_title, meta_description,
   meta_keywords, created_at)
VALUES
-- ── Rings ──────────────────────────────────────────────────
('11111111-0001-0001-0001-000000000001',
 'Gold Floral Cluster Ring',
 'A delicate floral cluster design set in 18k gold-plated brass. Each petal catches light beautifully, making it a statement piece for any occasion.',
 2800, 85, 'Rings', 4.7,
 ARRAY['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600'],
 true, '18k gold-plated brass', '4g',
 'Avoid water and perfume. Polish with soft cloth.',
 'Ships in 2–4 days via TCS. Free above PKR 3000.',
 'gold-floral-cluster-ring',
 'Gold Floral Cluster Ring | Bejeweled',
 'Elegant 18k gold-plated floral cluster ring. Perfect for gifting.',
 'gold ring, floral ring, women jewelry Pakistan',
 NOW() - INTERVAL '45 days'),

('11111111-0001-0001-0001-000000000002',
 'Silver Twisted Band Ring',
 'Minimalist twisted silver band crafted from 925 sterling silver. Stackable design pairs effortlessly with any look.',
 1200, 140, 'Rings', 4.5,
 ARRAY['https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600'],
 false, '925 sterling silver', '3g',
 'Store in anti-tarnish pouch. Avoid chemicals.',
 'Ships in 2–4 days.',
 'silver-twisted-band-ring',
 'Silver Twisted Band Ring | Bejeweled',
 'Minimalist stackable 925 sterling silver twisted band ring.',
 'silver ring, twisted band, stackable ring',
 NOW() - INTERVAL '40 days'),

('11111111-0001-0001-0001-000000000003',
 'Amethyst Solitaire Ring',
 'A faceted amethyst stone set in a gold-plated bezel. Rich violet hue makes it a conversation starter.',
 3500, 45, 'Rings', 4.8,
 ARRAY['https://images.unsplash.com/photo-1583937443879-6b9c79a9e1fc?w=600'],
 true, 'Gold-plated brass, amethyst', '5g',
 'Avoid prolonged sun exposure to preserve stone color.',
 'Ships in 2–4 days. Express available.',
 'amethyst-solitaire-ring',
 'Amethyst Solitaire Ring | Bejeweled',
 'Stunning violet amethyst solitaire ring in gold-plated setting.',
 'amethyst ring, purple ring, gemstone ring Pakistan',
 NOW() - INTERVAL '38 days'),

-- ── Necklaces ───────────────────────────────────────────────
('11111111-0001-0001-0001-000000000004',
 'Pearl Strand Necklace',
 'Classic freshwater pearl strand on a gold-filled cable chain. Timeless elegance for weddings and formal events.',
 5500, 30, 'Necklaces', 4.9,
 ARRAY['https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=600'],
 true, 'Freshwater pearl, gold-filled chain', '12g',
 'Wipe with damp cloth after wear. Avoid perfume.',
 'Ships in 2–4 days. Gift wrapped on request.',
 'pearl-strand-necklace',
 'Freshwater Pearl Strand Necklace | Bejeweled',
 'Elegant freshwater pearl strand necklace. Perfect for brides.',
 'pearl necklace, bridal jewelry, formal necklace',
 NOW() - INTERVAL '42 days'),

('11111111-0001-0001-0001-000000000005',
 'Gold Coin Pendant Necklace',
 'Vintage-inspired hammered gold coin pendant on a 45cm box chain. Bold yet feminine.',
 2400, 75, 'Necklaces', 4.6,
 ARRAY['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600'],
 false, '18k gold-plated brass', '8g',
 'Store flat. Polish with micro-fiber cloth.',
 'Ships in 2–4 days.',
 'gold-coin-pendant-necklace',
 'Gold Coin Pendant Necklace | Bejeweled',
 'Vintage hammered gold coin pendant on a dainty box chain.',
 'gold pendant, coin necklace, layering necklace',
 NOW() - INTERVAL '35 days'),

('11111111-0001-0001-0001-000000000006',
 'Rose Quartz Drop Necklace',
 'A teardrop rose quartz pendant suspended from a delicate 40cm rhodium-plated chain. Calming and romantic.',
 3200, 55, 'Necklaces', 4.7,
 ARRAY['https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600'],
 true, 'Rose quartz, rhodium-plated brass', '7g',
 'Avoid impact. Store in velvet pouch.',
 'Ships in 2–4 days. Express available.',
 'rose-quartz-drop-necklace',
 'Rose Quartz Drop Necklace | Bejeweled',
 'Elegant teardrop rose quartz pendant on rhodium-plated chain.',
 'rose quartz necklace, pink necklace, gemstone pendant',
 NOW() - INTERVAL '30 days'),

-- ── Earrings ────────────────────────────────────────────────
('11111111-0001-0001-0001-000000000007',
 'Gold Hoop Earrings 30mm',
 'Classic 30mm polished gold hoops crafted in lightweight brass. A wardrobe staple that elevates any outfit.',
 1600, 200, 'Earrings', 4.8,
 ARRAY['https://images.unsplash.com/photo-1573408301185-9519f94816b2?w=600'],
 true, '18k gold-plated brass', '4g pair',
 'Avoid water. Store in earring holder.',
 'Ships in 2–4 days.',
 'gold-hoop-earrings-30mm',
 'Gold Hoop Earrings 30mm | Bejeweled',
 'Classic polished 30mm gold hoop earrings. Lightweight and versatile.',
 'gold hoop earrings, hoop earrings Pakistan, daily wear earrings',
 NOW() - INTERVAL '44 days'),

('11111111-0001-0001-0001-000000000008',
 'Emerald Crystal Stud Earrings',
 'Faceted synthetic emerald crystals in a pavé gold-plated setting. Rich green color for festive and formal wear.',
 2200, 90, 'Earrings', 4.6,
 ARRAY['https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=600'],
 false, 'Gold-plated brass, synthetic emerald', '3g pair',
 'Avoid harsh chemicals. Clean with soft brush.',
 'Ships in 2–4 days.',
 'emerald-crystal-stud-earrings',
 'Emerald Crystal Stud Earrings | Bejeweled',
 'Sparkling synthetic emerald stud earrings in gold pavé setting.',
 'emerald earrings, crystal studs, green earrings',
 NOW() - INTERVAL '32 days'),

('11111111-0001-0001-0001-000000000009',
 'Moonstone Dangle Earrings',
 'Crescent-shaped gold-plated drops with iridescent moonstone cabochons. Bohemian meets classic.',
 2900, 60, 'Earrings', 4.9,
 ARRAY['https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600'],
 true, 'Gold-plated brass, moonstone', '5g pair',
 'Handle with care. Moonstone is delicate.',
 'Ships in 2–4 days.',
 'moonstone-dangle-earrings',
 'Moonstone Dangle Earrings | Bejeweled',
 'Iridescent moonstone dangle earrings in gold-plated crescent setting.',
 'moonstone earrings, boho earrings, dangle earrings Pakistan',
 NOW() - INTERVAL '28 days'),

-- ── Bracelets ───────────────────────────────────────────────
('11111111-0001-0001-0001-000000000010',
 'Gold Chain Bracelet',
 'Delicate 18cm gold-filled cable chain bracelet with lobster clasp. Perfect for everyday layering.',
 1800, 120, 'Bracelets', 4.7,
 ARRAY['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600'],
 false, 'Gold-filled brass', '5g',
 'Avoid pool and sea water.',
 'Ships in 2–4 days.',
 'gold-chain-bracelet',
 'Gold Chain Bracelet | Bejeweled',
 'Dainty 18cm gold-filled cable chain bracelet for everyday wear.',
 'gold bracelet, chain bracelet, layering bracelet',
 NOW() - INTERVAL '40 days'),

('11111111-0001-0001-0001-000000000011',
 'Turquoise Beaded Bracelet',
 'Hand-strung natural turquoise and gold-filled bead bracelet on elastic cord. Brings a pop of color.',
 1400, 95, 'Bracelets', 4.5,
 ARRAY['https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600'],
 false, 'Natural turquoise, gold-filled beads', '8g',
 'Remove before swimming. Store separately.',
 'Ships in 2–4 days.',
 'turquoise-beaded-bracelet',
 'Turquoise Beaded Bracelet | Bejeweled',
 'Natural turquoise and gold bead elastic bracelet. Vibrant and fun.',
 'turquoise bracelet, beaded bracelet, boho bracelet',
 NOW() - INTERVAL '25 days'),

('11111111-0001-0001-0001-000000000012',
 'Diamond-Cut Bangle Set',
 'Set of three diamond-cut bangles in silver, gold, and rose-gold. Stackable, lightweight, and timeless.',
 3800, 50, 'Bracelets', 4.8,
 ARRAY['https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600'],
 true, 'Gold-plated, silver-plated, rose-gold-plated brass', '18g set',
 'Store in separate pouches to avoid scratching.',
 'Ships in 2–4 days.',
 'diamond-cut-bangle-set',
 'Diamond-Cut Bangle Set (3pcs) | Bejeweled',
 'Set of 3 stackable diamond-cut bangles in silver, gold & rose gold.',
 'bangle set, stackable bangles, bracelet set Pakistan',
 NOW() - INTERVAL '22 days'),

-- ── Anklets ─────────────────────────────────────────────────
('11111111-0001-0001-0001-000000000013',
 'Dainty Gold Anklet',
 'Slim 25cm gold-filled anklet with a tiny star charm. Lightweight and adjustable.',
 1100, 110, 'Anklets', 4.6,
 ARRAY['https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600'],
 false, 'Gold-filled brass', '3g',
 'Avoid salt water. Polish gently.',
 'Ships in 2–4 days.',
 'dainty-gold-anklet',
 'Dainty Gold Anklet with Star Charm | Bejeweled',
 'Delicate gold-filled anklet with a tiny star charm. Adjustable.',
 'gold anklet, anklet Pakistan, star anklet',
 NOW() - INTERVAL '18 days'),

-- ── Pendants ────────────────────────────────────────────────
('11111111-0001-0001-0001-000000000014',
 'Hamsa Hand Pendant',
 'Hand-of-Fatima pendant in gold-plated brass with blue enamel eye detail. Cultural symbol of protection.',
 1900, 70, 'Pendants', 4.7,
 ARRAY['https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600'],
 false, 'Gold-plated brass, blue enamel', '6g',
 'Avoid moisture. Polish with soft cloth.',
 'Ships in 2–4 days.',
 'hamsa-hand-pendant',
 'Hamsa Hand Pendant | Bejeweled',
 'Gold-plated Hamsa hand pendant with blue enamel evil eye detail.',
 'hamsa pendant, evil eye pendant, protection jewelry',
 NOW() - INTERVAL '20 days'),

('11111111-0001-0001-0001-000000000015',
 'Crescent Moon & Star Pendant',
 'Celestial crescent moon with a pavé-set star pendant on a fine cable chain. A best-seller for gifting.',
 2100, 88, 'Pendants', 4.9,
 ARRAY['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600'],
 true, '18k gold-plated brass, cubic zirconia', '5g',
 'Avoid perfume spray directly on piece.',
 'Ships in 2–4 days. Gift wrapped on request.',
 'crescent-moon-star-pendant',
 'Crescent Moon & Star Pendant Necklace | Bejeweled',
 'Celestial crescent moon and pavé star pendant. Popular gift choice.',
 'moon pendant, star pendant, celestial jewelry Pakistan',
 NOW() - INTERVAL '15 days'),

-- ── Sets / Bridal ───────────────────────────────────────────
('11111111-0001-0001-0001-000000000016',
 'Bridal Kundan Choker Set',
 'Statement Kundan choker with matching earrings and maang tikka. Handcrafted with real Kundan stones and meenakari enamel work.',
 12500, 15, 'Bridal Sets', 5.0,
 ARRAY['https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=600'],
 true, 'Gold-plated brass, Kundan stones, meenakari enamel', '85g set',
 'Store in padded box. Dry clean only.',
 'Ships in 3–5 days. Express available.',
 'bridal-kundan-choker-set',
 'Bridal Kundan Choker Set | Bejeweled',
 'Handcrafted Kundan choker with earrings and maang tikka. Bridal perfection.',
 'bridal jewelry set, Kundan choker, Pakistani bridal jewelry',
 NOW() - INTERVAL '50 days'),

('11111111-0001-0001-0001-000000000017',
 'Mehndi Bangles Set (12 pcs)',
 'Set of 12 hand-painted mehndi bangles with intricate lacework in green and gold. Essential for mehndi ceremonies.',
 2600, 40, 'Bridal Sets', 4.7,
 ARRAY['https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600'],
 false, 'Lac, gold-painted', '45g',
 'Handle gently. Lac bangles can crack on hard impact.',
 'Ships in 2–4 days.',
 'mehndi-bangles-set-12pcs',
 'Mehndi Bangles Set 12pcs | Bejeweled',
 'Traditional hand-painted lac mehndi bangles set of 12 in green & gold.',
 'mehndi bangles, lac bangles, mehndi ceremony jewelry',
 NOW() - INTERVAL '30 days'),

-- ── Hair & Accessories ──────────────────────────────────────
('11111111-0001-0001-0001-000000000018',
 'Gold Tikka Maang Hair Chain',
 'Delicate maang tikka with a cascading hair chain and pearl drops. Elegant for weddings and formal events.',
 4200, 25, 'Hair Accessories', 4.8,
 ARRAY['https://images.unsplash.com/photo-1583937443879-6b9c79a9e1fc?w=600'],
 true, 'Gold-plated brass, freshwater pearls', '22g',
 'Store flat. Avoid tangling hair chain.',
 'Ships in 2–4 days.',
 'gold-tikka-maang-hair-chain',
 'Gold Tikka Maang Hair Chain with Pearls | Bejeweled',
 'Elegant gold maang tikka with cascading hair chain and pearl drops.',
 'maang tikka, hair chain, bridal hair jewelry Pakistan',
 NOW() - INTERVAL '35 days'),

('11111111-0001-0001-0001-000000000019',
 'Crystal Hair Pins Set (6 pcs)',
 'Set of 6 assorted crystal-studded bobby pins in gold and silver finishes. Great for updos and gifting.',
 900, 180, 'Hair Accessories', 4.4,
 ARRAY['https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600'],
 false, 'Gold & silver-plated brass, crystal', '15g',
 'Keep dry. Store in provided bag.',
 'Ships in 2–4 days.',
 'crystal-hair-pins-set-6pcs',
 'Crystal Hair Pins Set 6 pcs | Bejeweled',
 'Set of 6 assorted crystal bobby pins in gold and silver. Gift-ready.',
 'hair pins, crystal pins, bobby pins Pakistan',
 NOW() - INTERVAL '12 days'),

('11111111-0001-0001-0001-000000000020',
 'Sapphire Blue Drop Earrings',
 'Oval synthetic sapphire drops in a vintage gold-plated claw setting. Bold color meets timeless design.',
 2700, 65, 'Earrings', 4.6,
 ARRAY['https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=600'],
 false, 'Gold-plated brass, synthetic sapphire', '6g pair',
 'Avoid harsh chemicals. Store in pouch.',
 'Ships in 2–4 days.',
 'sapphire-blue-drop-earrings',
 'Sapphire Blue Drop Earrings | Bejeweled',
 'Oval synthetic sapphire drop earrings in vintage gold-plated setting.',
 'sapphire earrings, blue earrings, drop earrings Pakistan',
 NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 2. COUPONS
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.coupons
  (code, discount_type, discount_value, usage_limit, used_count, status, expires_at, created_at)
VALUES
  ('WELCOME10',  'percent', 10,  200, 87,  'Active',  NOW() + INTERVAL '60 days',  NOW() - INTERVAL '30 days'),
  ('SAVE10',     'percent', 10,  500, 214, 'Active',  NOW() + INTERVAL '90 days',  NOW() - INTERVAL '45 days'),
  ('BRIDE20',    'percent', 20,  50,  18,  'Active',  NOW() + INTERVAL '30 days',  NOW() - INTERVAL '20 days'),
  ('FLASH15',    'percent', 15,  100, 100, 'Expired', NOW() - INTERVAL '5 days',   NOW() - INTERVAL '35 days'),
  ('PKR500OFF',  'fixed',   500, 150, 63,  'Active',  NOW() + INTERVAL '45 days',  NOW() - INTERVAL '25 days'),
  ('EID30',      'percent', 30,  80,  72,  'Expired', NOW() - INTERVAL '2 days',   NOW() - INTERVAL '18 days'),
  ('FIRST100',   'fixed',   100, 300, 41,  'Active',  NOW() + INTERVAL '120 days', NOW() - INTERVAL '10 days'),
  ('SUMMER25',   'percent', 25,  60,  9,   'Active',  NOW() + INTERVAL '15 days',  NOW() - INTERVAL '3 days')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 3. FAQs
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.faqs (question, answer, sort_order, created_at)
SELECT q, a, ord, NOW() - INTERVAL '40 days'
FROM (VALUES
  ('What materials do you use in your jewelry?',
   'We use high-quality 18k gold-plated brass, 925 sterling silver, and genuine semi-precious stones including amethyst, moonstone, rose quartz, and turquoise.',
   1),
  ('Is your jewelry suitable for sensitive skin?',
   'Our sterling silver pieces are hypoallergenic. Gold-plated items may cause reactions in highly sensitive individuals. We recommend nickel-free alternatives for sensitive skin.',
   2),
  ('How long does shipping take?',
   'Standard delivery takes 3–5 working days via TCS Courier. Express (1–2 days) is available at checkout for an additional fee.',
   3),
  ('Do you offer free shipping?',
   'Yes! Orders above PKR 3,000 qualify for free standard shipping within Pakistan.',
   4),
  ('What is your return policy?',
   'We accept returns within 7 days of delivery for unopened, undamaged items. Custom and bridal pieces are non-returnable.',
   5),
  ('Can I exchange a product?',
   'Yes, exchanges are accepted within 14 days for size or style swaps, subject to stock availability. Contact us at hello@bejeweled.store.',
   6),
  ('How do I care for gold-plated jewelry?',
   'Keep away from water, perfume, and chemicals. Wipe with a soft cloth after wearing and store in an anti-tarnish pouch.',
   7),
  ('Do you offer gift wrapping?',
   'Yes! Select "Gift wrap" at checkout. We include a handwritten note card at no extra charge.',
   8),
  ('Can I track my order?',
   'Absolutely. Once shipped you will receive a TCS tracking code via email and SMS. You can also track in your Dashboard under Orders.',
   9),
  ('Do you ship internationally?',
   'Currently we ship within Pakistan only. International shipping is on our roadmap — sign up for updates!',
   10),
  ('How do I find my ring size?',
   'Use a string or strip of paper to measure your finger circumference in mm. Divide by 3.14 to get the diameter. Our size chart is available on every ring product page.',
   11),
  ('Are your gemstones real?',
   'We clearly label each product. Natural stones (turquoise, moonstone, rose quartz) are genuine. Emerald and sapphire stones in our collection are high-quality synthetic crystals.',
   12)
) AS t(q, a, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.faqs LIMIT 1);

-- ═══════════════════════════════════════════════════════════
-- 4. BLOG POSTS
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.blog_posts
  (title, slug, content, excerpt, meta_title, meta_description,
   tags, status, created_at, updated_at)
VALUES
(
  'How to Layer Necklaces Like a Pro',
  'how-to-layer-necklaces-like-a-pro',
  E'Layering necklaces is one of the easiest ways to elevate your everyday look — but it can quickly go wrong if you don''t know the rules.\n\n## Start with lengths\n\nThe golden rule: vary your chain lengths. A choker (35–40cm), a princess length (45–50cm), and a matinee length (56cm) create perfect visual separation.\n\n## Mix textures\n\nCombine a delicate cable chain with a chunkier box chain or a beaded strand. The contrast keeps each piece visible.\n\n## Pick a focal pendant\n\nChoose one statement pendant — like our **Gold Coin Pendant Necklace** — and let the other chains play supporting roles.\n\n## Stick to a metal family\n\nMixing gold, silver, and rose gold at the same time can look chaotic. Pick two metals maximum for a cohesive stack.\n\n## Pro tip\n\nPut on your longest chain first to avoid tangling. Use a necklace layering clasp to keep everything in place throughout the day.',
  'Master the art of layering necklaces with our expert tips on length, texture, and metal mixing.',
  'How to Layer Necklaces | Bejeweled Blog',
  'Learn how to layer necklaces like a stylist with tips on lengths, textures, and metal tones.',
  ARRAY['jewelry tips', 'styling', 'necklaces', 'fashion'],
  'published',
  NOW() - INTERVAL '28 days',
  NOW() - INTERVAL '28 days'
),
(
  'The Complete Guide to Caring for Gold-Plated Jewelry',
  'caring-for-gold-plated-jewelry',
  E'Gold-plated jewelry is a brilliant way to enjoy the look of gold without the price tag — but it does need a little extra love.\n\n## What is gold plating?\n\nGold plating is a thin layer of gold (usually 0.5–2.5 microns) deposited onto a base metal like brass. Our pieces use 18k gold plating for maximum warmth and durability.\n\n## The enemies of plated jewelry\n\n- **Water** — especially chlorinated and salt water\n- **Perfume and hairspray** — the alcohol strips the plating\n- **Sweat** — regular exposure accelerates tarnishing\n- **Hard surfaces** — scratches remove the plating unevenly\n\n## Daily care routine\n\n1. Put your jewelry on *after* applying perfume and cosmetics\n2. Remove it before washing hands, swimming, or exercising\n3. Wipe with a soft, lint-free cloth after each wear\n4. Store in an anti-tarnish pouch or a compartmentalised jewelry box\n\n## Reviving tarnished pieces\n\nMix a few drops of mild dish soap in warm water. Dip a soft toothbrush and gently scrub. Rinse quickly and dry immediately with a cloth.',
  'Keep your gold-plated jewelry gleaming with our complete care and storage guide.',
  'Gold-Plated Jewelry Care Guide | Bejeweled Blog',
  'Everything you need to know to keep your gold-plated jewelry shining for longer.',
  ARRAY['jewelry care', 'gold plated', 'maintenance', 'tips'],
  'published',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days'
),
(
  'Top 5 Jewelry Trends for 2026',
  'top-5-jewelry-trends-2026',
  E'Each year brings a new set of jewelry obsessions. Here are the five trends dominating 2026.\n\n## 1. Celestial Everything\n\nMoons, stars, suns — celestial motifs continue their reign. Our **Crescent Moon & Star Pendant** sold out twice already this season.\n\n## 2. Quiet Luxury Minimalism\n\nDiscreet, understated pieces in solid precious metals. Think slim bands, subtle chains, and clean silhouettes.\n\n## 3. Gemstone Maximalism\n\nOn the opposite end, bold gemstone cocktail rings and layered beaded necklaces are having a major moment.\n\n## 4. Mixed Metals\n\nThe old "one metal only" rule is officially broken. Layering gold and silver is now intentional and chic.\n\n## 5. Heritage Craftsmanship\n\nKundan, meenakari, and filigree work are being celebrated on global runways — and in Pakistani fashion circles especially.',
  'From celestial motifs to heritage Kundan, discover the top 5 jewelry trends shaping 2026.',
  'Top 5 Jewelry Trends 2026 | Bejeweled Blog',
  'Explore the biggest jewelry trends of 2026: celestial, quiet luxury, gemstone maximalism, and more.',
  ARRAY['trends', '2026', 'fashion', 'jewelry'],
  'published',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '12 days'
),
(
  'How to Choose the Perfect Bridal Jewelry Set',
  'how-to-choose-bridal-jewelry',
  E'Your bridal jewelry is worn once but remembered forever. Here''s how to choose a set you''ll love in every photograph.\n\n## Start with the neckline\n\nYour outfit''s neckline dictates your necklace choice:\n- **Deep V or sweetheart** → pendant or layered chains\n- **High neck or collared** → statement earrings only\n- **Off-shoulder or strapless** → choker or collar necklace\n\n## Coordinate, don''t match\n\nGone are the days of perfectly matchy sets. Mix a Kundan choker with pearl drop earrings for visual depth.\n\n## Consider the event\n\nFor nikkah: understated, elegant. For baraat: statement pieces that photograph well. For walima: refined and lighter.\n\n## Your skin tone matters\n\n- **Warm/olive skin** → gold, amber, coral stones\n- **Cool/fair skin** → silver, white gold, sapphire, pearl\n\n## Budget wisely\n\nInvest in one hero piece — usually the necklace — and build around it with more affordable earrings and bangles.',
  'A complete guide to choosing your bridal jewelry set — from neckline matching to budget planning.',
  'How to Choose Bridal Jewelry | Bejeweled Blog',
  'Everything you need to know to select the perfect bridal jewelry for your nikkah, baraat, and walima.',
  ARRAY['bridal', 'wedding', 'jewelry guide', 'styling'],
  'published',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),
(
  'Gift Guide: The Best Jewelry Gifts Under PKR 3000',
  'jewelry-gifts-under-pkr-3000',
  E'Looking for a meaningful gift that won''t break the bank? Here are our top picks under PKR 3,000.\n\n## For the minimalist\n**Silver Twisted Band Ring (PKR 1,200)** — clean lines, stackable, universally loved.\n\n## For the bohemian\n**Turquoise Beaded Bracelet (PKR 1,400)** — colourful and casual with a natural touch.\n\n## For the romantic\n**Crystal Hair Pins Set (PKR 900)** — a sweet, practical gift that never goes out of style.\n\n## For the fashion-forward\n**Gold Hoop Earrings 30mm (PKR 1,600)** — a wardrobe staple every woman needs.\n\n## For the star-gazer\n**Crescent Moon & Star Pendant (PKR 2,100)** — our most-gifted piece of the season.\n\nAll orders above PKR 3,000 ship free. Bundle two gifts and hit the threshold easily!',
  'The best jewelry gifts under PKR 3,000 for every personality. Free shipping on orders above PKR 3,000.',
  'Best Jewelry Gifts Under PKR 3000 | Bejeweled',
  'Top jewelry gift picks under PKR 3,000 — perfect for birthdays, Eid, and special occasions.',
  ARRAY['gift guide', 'budget gifts', 'Eid gifts', 'birthday gifts'],
  'draft',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 5. CONTACT MESSAGES  (30 messages over the month)
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.contact_messages (name, email, subject, message, is_read, created_at)
VALUES
('Ayesha Malik',      'ayesha.malik@gmail.com',    'Order not delivered',        'I placed order BJ-2604-0001 on April 22nd and still haven''t received it. TCS tracking shows "Out for delivery" for 3 days. Please help!',                              true,  NOW() - INTERVAL '28 days'),
('Sara Ahmed',        'sara.ahmed@hotmail.com',     'Ring size question',         'Hi, I want to order the Gold Floral Cluster Ring but I''m between sizes 6 and 7. Do you have half sizes available?',                                                    true,  NOW() - INTERVAL '27 days'),
('Fatima Hussain',    'fatima.h@yahoo.com',         'Bridal set inquiry',         'Hello, I am getting married in June and would like to order the Bridal Kundan Choker Set. Can I get it in a slightly darker gold tone? Also is customisation possible?', true,  NOW() - INTERVAL '26 days'),
('Mahrukh Khan',      'mahrukh.k@gmail.com',        'Discount code not working',  'I tried SAVE10 at checkout but it says "invalid code". My cart total is PKR 4,500. Please advise.',                                                                       true,  NOW() - INTERVAL '25 days'),
('Zainab Iqbal',      'zainab.iqbal@gmail.com',     'Pearl necklace authenticity','Are the pearls in the Pearl Strand Necklace real freshwater pearls or synthetic? I want to buy it as an anniversary gift.',                                               true,  NOW() - INTERVAL '24 days'),
('Noor Siddiqui',     'noor.s@live.com',            'Exchange request',           'I received the Moonstone Dangle Earrings and love them but one post is slightly bent. Can I exchange them?',                                                              true,  NOW() - INTERVAL '23 days'),
('Amna Baig',         'amna.baig@gmail.com',        'Gift wrapping query',        'Do you offer gift wrapping? I want to send the Crescent Moon pendant directly to my friend in Islamabad as a birthday gift.',                                             true,  NOW() - INTERVAL '22 days'),
('Hina Rehman',       'hina.r@gmail.com',           'Bulk order for bridesmaids', 'We need 8 pieces of the Gold Chain Bracelet for bridesmaid gifts. Can you do a group discount?',                                                                         false, NOW() - INTERVAL '21 days'),
('Sana Tariq',        'sana.tariq@outlook.com',     'International shipping',     'Do you ship to the UK? I would love to gift my mum the Bridal Kundan set for her birthday.',                                                                               true,  NOW() - INTERVAL '20 days'),
('Rabia Chaudhry',    'rabia.c@gmail.com',          'Care instructions',          'I accidentally got my Gold Hoop Earrings wet in the rain. Are they ruined? How can I restore them?',                                                                       true,  NOW() - INTERVAL '19 days'),
('Mehreen Nasir',     'mehreen.n@gmail.com',         'Wrong item received',        'I ordered the Emerald Crystal Studs (order BJ-2604-0045) but received the Sapphire Blue Drop Earrings instead. Please help me get the correct item.',                     false, NOW() - INTERVAL '18 days'),
('Samia Javed',       'samia.j@yahoo.com',          'Restock inquiry',            'The Amethyst Solitaire Ring is showing out of stock. When will it be back? It''s perfect for my mom''s birthday.',                                                         true,  NOW() - INTERVAL '17 days'),
('Asma Pervez',       'asma.p@gmail.com',           'Payment failed',             'I tried to pay via JazzCash but the payment failed and money was deducted. Order BJ-2605-0007. Please refund or confirm the order.',                                        false, NOW() - INTERVAL '16 days'),
('Iqra Shahid',       'iqra.s@hotmail.com',         'Necklace length',            'Is the Pearl Strand Necklace adjustable? I prefer a shorter length around 40cm.',                                                                                          true,  NOW() - INTERVAL '15 days'),
('Lubna Qureshi',     'lubna.q@gmail.com',          'Allergy concern',            'I have a nickel allergy. Are your gold-plated pieces nickel-free? I''m interested in the Rose Quartz Drop Necklace.',                                                       true,  NOW() - INTERVAL '14 days'),
('Sundas Ali',        'sundas.ali@gmail.com',        'Order status',               'My order BJ-2605-0012 has been in "Packed" status for 5 days. When will it ship?',                                                                                         true,  NOW() - INTERVAL '13 days'),
('Rukhsana Dar',      'rukhsana.d@live.com',         'Instagram giveaway',         'Hi, I saw your giveaway on Instagram but the link to enter didn''t work. Can you share the correct link?',                                                                  true,  NOW() - INTERVAL '12 days'),
('Hafsa Mirza',       'hafsa.m@gmail.com',           'Mehndi bangles colour',      'Are the Mehndi Bangles available in red and gold instead of green and gold? I''m having a mehndi on June 14th.',                                                            false, NOW() - INTERVAL '11 days'),
('Sadia Butt',        'sadia.butt@gmail.com',        'Tikka sizing',               'I have a small forehead. Will the Gold Tikka Maang Hair Chain look good or is it too big?',                                                                                 true,  NOW() - INTERVAL '10 days'),
('Maryam Waseem',     'maryam.w@outlook.com',        'Collaboration inquiry',      'I am a fashion blogger with 80K Instagram followers. I would love to collaborate on a paid partnership. Please contact me.',                                                 false, NOW() - INTERVAL '9 days'),
('Nadia Farouk',      'nadia.f@gmail.com',           'Damaged packaging',          'The box arrived crushed and the Diamond-Cut Bangle Set had a dent. The packaging is not protective enough for courier.',                                                     true,  NOW() - INTERVAL '8 days'),
('Tasleem Akhtar',    'tasleem.a@yahoo.com',         'Order cancellation',         'I want to cancel order BJ-2605-0031 placed an hour ago. I ordered the wrong size.',                                                                                          true,  NOW() - INTERVAL '7 days'),
('Kiran Nawaz',       'kiran.n@gmail.com',           'Receipt needed',             'Can you email me a proper VAT receipt for my order BJ-2605-0019? I need it for expense claims.',                                                                             false, NOW() - INTERVAL '6 days'),
('Bushra Malik',      'bushra.m@gmail.com',          'Product recommendation',     'I am looking for a gift under PKR 2,000 for a colleague''s farewell. She likes minimalist style. What would you recommend?',                                                 true,  NOW() - INTERVAL '5 days'),
('Gulnaz Fatima',     'gulnaz.f@hotmail.com',        'Earring post size',          'Are the stud posts on the Emerald Crystal Studs standard 0.8mm butterfly? I have sensitive ears.',                                                                           false, NOW() - INTERVAL '4 days'),
('Zara Yousuf',       'zara.y@gmail.com',            'Wholesale pricing',          'I run a small boutique in Lahore and would like to stock Bejeweled pieces. Do you offer wholesale pricing?',                                                                  false, NOW() - INTERVAL '3 days'),
('Naila Sohail',      'naila.s@gmail.com',           'Website issue on mobile',    'Your checkout button doesn''t respond properly on iPhone Safari iOS 18. I couldn''t complete my purchase.',                                                                   false, NOW() - INTERVAL '2 days'),
('Rimsha Aslam',      'rimsha.a@live.com',           'Delivery time estimate',     'I''m ordering the Crystal Hair Pins as a birthday gift for May 25th. Will standard shipping arrive by then if I order today?',                                                false, NOW() - INTERVAL '1 day'),
('Amira Hanif',       'amira.h@gmail.com',           'Missing item in parcel',     'My order BJ-2605-0055 arrived but the Dainty Gold Anklet was missing from the box. Only the Gold Hoops were included.',                                                       false, NOW() - INTERVAL '12 hours'),
('Saba Rana',         'saba.rana@gmail.com',         'Size chart location',        'I can''t find the ring size chart on the product page. Could you point me to it or share the sizes?',                                                                         false, NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 6. SEO METADATA  (one entry per key page)
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.seo_metadata
  (entity_type, entity_id, meta_title, meta_description, keywords, og_title, og_description, tags, updated_at)
SELECT entity_type, entity_id, meta_title, meta_description, keywords, og_title, og_description, tags, NOW() - INTERVAL '5 days'
FROM (VALUES
  ('page', 'home',
   'Bejeweled — Exquisite Jewelry for Every Occasion | Pakistan',
   'Shop handcrafted rings, necklaces, earrings and bridal sets. Premium quality jewelry delivered across Pakistan.',
   ARRAY['jewelry Pakistan', 'gold rings', 'bridal jewelry', 'pearl necklace', 'earrings online'],
   'Bejeweled — Exquisite Jewelry for Every Occasion',
   'Discover handcrafted rings, necklaces, earrings and bridal sets. Premium jewelry delivered across Pakistan.',
   ARRAY['jewelry', 'Pakistan', 'online store']),
  ('page', 'shop',
   'Shop All Jewelry | Bejeweled — Rings, Necklaces, Earrings',
   'Browse our full collection of rings, necklaces, earrings, bracelets and bridal sets. Free shipping above PKR 3,000.',
   ARRAY['buy jewelry online Pakistan', 'gold necklace', 'silver earrings', 'gemstone ring'],
   'Shop All Jewelry | Bejeweled',
   'Browse rings, necklaces, earrings and bridal sets. Free shipping above PKR 3,000.',
   ARRAY['shop', 'collection', 'jewelry']),
  ('page', 'about',
   'About Bejeweled | Our Story & Craft',
   'Learn about Bejeweled — a Lahore-based jewelry brand crafting premium pieces with passion and pride since 2022.',
   ARRAY['about Bejeweled', 'jewelry brand Pakistan', 'Lahore jewelry'],
   'About Bejeweled | Our Story',
   'A Lahore-based jewelry brand crafting premium pieces with passion and pride.',
   ARRAY['about', 'brand story', 'Lahore']),
  ('page', 'blog',
   'Bejeweled Blog — Jewelry Tips, Trends & Style Guides',
   'Read our latest articles on jewelry care, styling tips, and the latest trends in Pakistani fashion jewelry.',
   ARRAY['jewelry blog', 'jewelry tips', 'fashion trends Pakistan', 'styling guide'],
   'Bejeweled Blog — Jewelry Tips & Trends',
   'Jewelry care tips, styling guides and trend reports for the modern Pakistani woman.',
   ARRAY['blog', 'tips', 'trends']),
  ('page', 'contact',
   'Contact Bejeweled | Get in Touch',
   'Have a question or need help with your order? Contact our support team at hello@bejeweled.store or WhatsApp us.',
   ARRAY['contact Bejeweled', 'jewelry support Pakistan', 'customer service'],
   'Contact Bejeweled',
   'Reach out to our team for order support, custom requests, and wholesale inquiries.',
   ARRAY['contact', 'support', 'help'])
) AS t(entity_type, entity_id, meta_title, meta_description, keywords, og_title, og_description, tags)
ON CONFLICT (entity_type, entity_id) DO UPDATE
  SET meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      keywords = EXCLUDED.keywords,
      og_title = EXCLUDED.og_title,
      og_description = EXCLUDED.og_description,
      updated_at = NOW();

-- ═══════════════════════════════════════════════════════════
-- 7. CHAT LOGS  (AI conversations across the month)
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.chat_logs
  (user_message, assistant_message, intent, created_at)
VALUES
-- Day 1–5
('Do you have gold rings under PKR 3000?',                           'Yes! The Gold Floral Cluster Ring (PKR 2,800) is a beautiful option. It''s 18k gold-plated with a delicate floral design. Shall I add it to your cart?',                                     'product_query',       NOW() - INTERVAL '30 days'),
('What is the price of the Pearl Strand Necklace?',                  'The Pearl Strand Necklace is priced at PKR 5,500. It''s made with freshwater pearls on a gold-filled chain — perfect for weddings or formal events.',                                          'product_query',       NOW() - INTERVAL '29 days 22 hours'),
('Do you ship to Karachi?',                                          'Absolutely! We deliver across all major cities in Pakistan via TCS Courier. Standard delivery to Karachi takes 3–5 working days.',                                                              'shipping_query',      NOW() - INTERVAL '29 days'),
('How do I care for silver jewelry?',                                'Store your silver pieces in an anti-tarnish pouch. Avoid water, perfume, and chemicals. A soft polishing cloth restores shine in seconds.',                                                    'care_advice',         NOW() - INTERVAL '28 days 20 hours'),
('Can I use the SAVE10 coupon?',                                     'SAVE10 gives you 10% off your entire order with no minimum. Just enter it at checkout!',                                                                                                       'coupon_query',        NOW() - INTERVAL '28 days'),
-- Day 6–10
('Is the Amethyst Ring in stock?',                                   'Yes, the Amethyst Solitaire Ring is available in stock right now. It''s a gorgeous violet gemstone set in gold-plated brass — one of our most loved pieces!',                                  'product_query',       NOW() - INTERVAL '27 days'),
('What''s your return policy?',                                      'We accept returns within 7 days of delivery for undamaged, unopened items. Custom and bridal pieces are non-returnable. Need to start a return?',                                              'order_support',       NOW() - INTERVAL '26 days 18 hours'),
('I want something for a wedding gift under PKR 5000',               'Great choice! The Crescent Moon & Star Pendant (PKR 2,100) and Gold Hoop Earrings (PKR 1,600) make a beautiful gift bundle well under PKR 5,000 — and we gift wrap for free!',               'product_recommendation', NOW() - INTERVAL '26 days'),
('Does the Gold Coin Pendant come with a chain?',                    'Yes! The Gold Coin Pendant Necklace comes complete with a 45cm box chain included.',                                                                                                          'product_query',       NOW() - INTERVAL '25 days 12 hours'),
('How long does express shipping take?',                             'Express shipping delivers within 1–2 working days. You can select it at checkout. It''s available for an additional fee depending on your location.',                                         'shipping_query',      NOW() - INTERVAL '25 days'),
-- Day 11–15
('Are moonstone earrings available?',                                'Yes! Our Moonstone Dangle Earrings (PKR 2,900) are in stock. Crescent-shaped gold drops with iridescent moonstone — absolutely stunning!',                                                    'product_query',       NOW() - INTERVAL '24 days 16 hours'),
('Can I track my order?',                                            'Yes! Once your order ships you''ll receive a TCS tracking code by email and SMS. You can also track it in your Dashboard under "Orders".',                                                     'order_support',       NOW() - INTERVAL '24 days'),
('I''m allergic to nickel. What can I buy?',                        'Our 925 sterling silver pieces are the safest choice for nickel allergies. The Silver Twisted Band Ring is a great starting point!',                                                          'care_advice',         NOW() - INTERVAL '23 days 14 hours'),
('Do you have bangles?',                                             'We have the Diamond-Cut Bangle Set (set of 3, PKR 3,800) in gold, silver, and rose gold — they''re stackable and very popular. Also check out the Mehndi Bangles Set!',                       'product_query',       NOW() - INTERVAL '23 days'),
('How do I choose a ring size?',                                     'Wrap a soft strip of paper around your finger and mark where it overlaps. Measure the length in mm — that''s your circumference. Divide by 3.14 for diameter. A full size chart is on each product page!', 'care_advice', NOW() - INTERVAL '22 days 10 hours'),
-- Day 16–20
('Recommend something for an anniversary gift',                      'For an anniversary, the Rose Quartz Drop Necklace (PKR 3,200) is a romantic choice — rose quartz symbolises love! Or the Pearl Strand Necklace for a classic touch.',                        'product_recommendation', NOW() - INTERVAL '22 days'),
('What''s the BRIDE20 code for?',                                    'BRIDE20 gives brides-to-be 20% off their entire order! It''s perfect for bridal sets and mehndi jewelry. Add it at checkout.',                                                               'coupon_query',         NOW() - INTERVAL '21 days'),
('Is the Bridal Kundan Set available?',                              'Yes, the Bridal Kundan Choker Set (PKR 12,500) is available and it''s absolutely stunning — handcrafted with real Kundan stones and meenakari enamel work.',                                  'product_query',        NOW() - INTERVAL '21 days 8 hours'),
('Do you gift wrap?',                                                'We do! Select "Gift wrap" at checkout and we''ll include a handwritten note card — completely free of charge.',                                                                               'order_support',        NOW() - INTERVAL '20 days'),
('What is the difference between gold plated and gold filled?',      'Gold-plated has a thin layer of gold (0.5–2.5 microns) over brass. Gold-filled has a much thicker layer (typically 100x more gold) and lasts significantly longer. We use 18k gold plating for our pieces.', 'care_advice', NOW() - INTERVAL '19 days 18 hours'),
-- Day 21–25
('Can I buy hair pins?',                                             'Yes! The Crystal Hair Pins Set (6 pcs, PKR 900) is a beautiful option — gold and silver finishes with crystal details. Very popular as a gift!',                                             'product_query',       NOW() - INTERVAL '19 days'),
('Is there free shipping?',                                          'Yes! Orders above PKR 3,000 qualify for free standard shipping anywhere in Pakistan.',                                                                                                       'shipping_query',      NOW() - INTERVAL '18 days 12 hours'),
('Show me earrings under PKR 2000',                                  'Within your budget, the Gold Hoop Earrings 30mm (PKR 1,600) and Emerald Crystal Stud Earrings (PKR 2,200) are both gorgeous options. The hoops are a wardrobe staple!',                       'product_query',       NOW() - INTERVAL '18 days'),
('I want to buy a gift for my sister''s birthday',                   'Lovely! How about the Crescent Moon & Star Pendant (PKR 2,100) — it''s our most-gifted piece right now, and we''ll gift wrap it for free with a handwritten note.',                          'product_recommendation', NOW() - INTERVAL '17 days'),
('My order hasn''t arrived yet',                                     'I''m sorry to hear that! Please share your order number and I''ll look into it for you. In the meantime you can check your TCS tracking code sent to your email.',                           'order_support',       NOW() - INTERVAL '16 days 6 hours'),
-- Day 26–30
('What anklets do you have?',                                        'We have the Dainty Gold Anklet (PKR 1,100) — a slim 25cm gold-filled chain with a tiny star charm. Adjustable and very elegant!',                                                            'product_query',       NOW() - INTERVAL '15 days'),
('Can I cancel my order?',                                           'Orders can be cancelled within 1 hour of placement. After that, the order enters processing. Please contact our support team at hello@bejeweled.store immediately.',                          'order_support',       NOW() - INTERVAL '14 days 20 hours'),
('Tell me about your Hamsa pendant',                                 'The Hamsa Hand Pendant (PKR 1,900) is a gold-plated brass Hand-of-Fatima with a beautiful blue enamel evil eye detail. A meaningful cultural symbol of protection and good fortune.',        'product_query',       NOW() - INTERVAL '13 days'),
('Are your gemstones real?',                                         'We label everything clearly! Natural stones in our collection include turquoise, moonstone, and rose quartz. Emerald and sapphire stones are high-quality synthetic crystals.',               'product_query',       NOW() - INTERVAL '12 days 14 hours'),
('What is the maang tikka made of?',                                 'The Gold Tikka Maang Hair Chain is crafted from gold-plated brass with freshwater pearl drops. It weighs 22g and ships in 2–4 days.',                                                        'product_query',       NOW() - INTERVAL '11 days'),
('Do you offer wholesale?',                                          'For wholesale and boutique partnership inquiries, please email us at hello@bejeweled.store with your business details and the items you''re interested in.',                                  'general',             NOW() - INTERVAL '10 days 10 hours'),
('WELCOME10 is not working',                                         'WELCOME10 is a one-time use code for first orders. If it''s not working, it may have already been used on this account. Try SAVE10 for 10% off any order!',                                  'coupon_query',        NOW() - INTERVAL '9 days'),
('How do I care for my moonstone earrings?',                         'Moonstone is delicate — avoid hard surfaces and store in a padded pouch. Clean gently with a dry soft cloth. Never use ultrasonic cleaners on moonstone.',                                   'care_advice',         NOW() - INTERVAL '8 days 8 hours'),
('I''m looking for a turquoise bracelet',                            'The Turquoise Beaded Bracelet (PKR 1,400) is exactly what you need — natural turquoise beads with gold-filled accents on elastic cord. Easy to wear and very boho!',                        'product_query',       NOW() - INTERVAL '7 days'),
('Does the bangle set come in different sizes?',                     'The Diamond-Cut Bangle Set is one-size-fits-most, designed for standard adult wrists. If you have a petite or larger wrist, feel free to contact us before ordering.',                      'product_query',       NOW() - INTERVAL '6 days 18 hours'),
('Is COD available?',                                                'Yes! Cash on Delivery is available for all orders across Pakistan.',                                                                                                                         'order_support',       NOW() - INTERVAL '5 days'),
('What is the delivery time for Lahore?',                            'Standard delivery to Lahore takes 2–3 working days. Express can be as fast as next day!',                                                                                                   'shipping_query',      NOW() - INTERVAL '4 days 12 hours'),
('Can you recommend earrings for a wedding?',                        'For weddings, the Moonstone Dangle Earrings (PKR 2,900) or the Emerald Crystal Studs (PKR 2,200) are both stunning. The moonstones look magical in wedding photography!',                   'product_recommendation', NOW() - INTERVAL '3 days'),
('I want to buy the crystal hair pins as a gift',                    'Great choice! The Crystal Hair Pins Set (PKR 900) is a lovely gift. We''ll gift wrap it beautifully and include a personalised note card for free.',                                        'product_recommendation', NOW() - INTERVAL '2 days 6 hours'),
('What''s your most popular item?',                                  'Our best-sellers right now are the Crescent Moon & Star Pendant (PKR 2,100), the Gold Hoop Earrings (PKR 1,600), and the Moonstone Dangle Earrings (PKR 2,900). All available now!',        'product_query',       NOW() - INTERVAL '1 day'),
('Do you have rose gold jewelry?',                                   'The Diamond-Cut Bangle Set includes a rose-gold-plated bangle alongside gold and silver ones — a beautiful trio!',                                                                           'product_query',       NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;
