-- =============================================================
-- Bejeweled Jewelry E-Commerce — Complete Schema Migration
-- Run this in Supabase SQL Editor (safe to re-run, uses IF NOT EXISTS)
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES (table first — is_admin() references it)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 2. HELPER FUNCTION: is_admin()
-- ─────────────────────────────────────────────────────────────
-- Defined after profiles table so PostgreSQL can validate the body.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles RLS policies (defined after is_admin() exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id OR public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 3. PRODUCTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text           NOT NULL,
  description      text,
  price            numeric(10,2)  NOT NULL DEFAULT 0,
  stock            integer        NOT NULL DEFAULT 0,
  category         text,
  rating           numeric(3,2)   DEFAULT 0,
  images           text[]         DEFAULT '{}',
  is_featured      boolean        DEFAULT false,
  material         text,
  capacity         text,
  dimensions       text,
  weight           text,
  care             text,
  shipping_info    text,
  slug             text           UNIQUE,
  meta_title       text,
  meta_description text,
  meta_keywords    text,
  reviews          jsonb          DEFAULT '[]',
  embedding        vector(384),
  created_at       timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Products are publicly readable'
  ) THEN
    CREATE POLICY "Products are publicly readable"
      ON public.products FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admins can manage products'
  ) THEN
    CREATE POLICY "Admins can manage products"
      ON public.products FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_embedding_cosine_idx
  ON public.products USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ─────────────────────────────────────────────────────────────
-- 4. CART ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text        NOT NULL,
  quantity   integer     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can read own cart items'
  ) THEN
    CREATE POLICY "Users can read own cart items"
      ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can insert own cart items'
  ) THEN
    CREATE POLICY "Users can insert own cart items"
      ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can update own cart items'
  ) THEN
    CREATE POLICY "Users can update own cart items"
      ON public.cart_items FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can delete own cart items'
  ) THEN
    CREATE POLICY "Users can delete own cart items"
      ON public.cart_items FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. WISHLIST ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wishlist_items' AND policyname = 'Users can read own wishlist'
  ) THEN
    CREATE POLICY "Users can read own wishlist"
      ON public.wishlist_items FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wishlist_items' AND policyname = 'Users can insert own wishlist'
  ) THEN
    CREATE POLICY "Users can insert own wishlist"
      ON public.wishlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wishlist_items' AND policyname = 'Users can delete own wishlist'
  ) THEN
    CREATE POLICY "Users can delete own wishlist"
      ON public.wishlist_items FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 6. ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                  uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number        text          UNIQUE NOT NULL,
  user_id             uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name       text          NOT NULL,
  email               text          NOT NULL,
  phone               text          NOT NULL DEFAULT '',
  shipping_address    text          NOT NULL,
  city                text          NOT NULL,
  state               text          NOT NULL,
  zip_code            text          NOT NULL,
  shipping_method     text          NOT NULL CHECK (shipping_method IN ('free', 'standard', 'express')),
  payment_method      text          DEFAULT 'cod',
  status              text          NOT NULL DEFAULT 'Packed',
  status_description  text          NOT NULL DEFAULT '',
  carrier             text          NOT NULL DEFAULT '',
  tracking_code       text          NOT NULL DEFAULT '',
  origin_city         text          NOT NULL DEFAULT '',
  destination_city    text          NOT NULL DEFAULT '',
  estimated_delivery  text          NOT NULL DEFAULT '',
  order_placed_at     text          NOT NULL DEFAULT '',
  items               jsonb         NOT NULL DEFAULT '[]',
  subtotal            numeric(10,2) NOT NULL DEFAULT 0,
  shipping_cost       numeric(10,2) NOT NULL DEFAULT 0,
  tax                 numeric(10,2) NOT NULL DEFAULT 0,
  total               numeric(10,2) NOT NULL DEFAULT 0,
  timeline            jsonb         NOT NULL DEFAULT '[]',
  created_at          timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can insert their own orders'
  ) THEN
    CREATE POLICY "Users can insert their own orders"
      ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can read their own orders'
  ) THEN
    CREATE POLICY "Users can read their own orders"
      ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can update their own orders'
  ) THEN
    CREATE POLICY "Users can update their own orders"
      ON public.orders FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can update all orders'
  ) THEN
    CREATE POLICY "Admins can update all orders"
      ON public.orders FOR UPDATE USING (public.is_admin());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx     ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON public.orders (order_number);

-- ─────────────────────────────────────────────────────────────
-- 7. REVIEWS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   text        NOT NULL,
  rating      integer     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     text        NOT NULL,
  admin_reply text,
  replied_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_select_public'
  ) THEN
    CREATE POLICY "reviews_select_public"
      ON public.reviews FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_insert_own'
  ) THEN
    CREATE POLICY "reviews_insert_own"
      ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_update_own'
  ) THEN
    CREATE POLICY "reviews_update_own"
      ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_update_admin'
  ) THEN
    CREATE POLICY "reviews_update_admin"
      ON public.reviews FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. COUPONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text          UNIQUE NOT NULL,
  discount_type  text          NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  usage_limit    integer       NOT NULL DEFAULT 0,
  used_count     integer       NOT NULL DEFAULT 0,
  status         text          NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expired')),
  expires_at     timestamptz,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Anyone can read coupons'
  ) THEN
    CREATE POLICY "Anyone can read coupons"
      ON public.coupons FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Admins can insert coupons'
  ) THEN
    CREATE POLICY "Admins can insert coupons"
      ON public.coupons FOR INSERT WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Admins can update coupons'
  ) THEN
    CREATE POLICY "Admins can update coupons"
      ON public.coupons FOR UPDATE USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Admins can delete coupons'
  ) THEN
    CREATE POLICY "Admins can delete coupons"
      ON public.coupons FOR DELETE USING (public.is_admin());
  END IF;
END $$;

INSERT INTO public.coupons (code, discount_type, discount_value, usage_limit, used_count, status) VALUES
  ('SAVE10',   'percent', 10, 100, 0, 'Active'),
  ('JEWEL20',  'percent', 20,  50, 0, 'Active'),
  ('LUXURY30', 'percent', 30,  20, 0, 'Active'),
  ('FREE5',    'fixed',    5, 100, 0, 'Active'),
  ('JEWEL10',  'percent', 10, 200, 0, 'Active')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE upper(trim(code)) = upper(trim(p_code))
      AND status = 'Active'
      AND (usage_limit = 0 OR used_count < usage_limit);

  UPDATE public.coupons
    SET status = 'Expired'
    WHERE upper(trim(code)) = upper(trim(p_code))
      AND status = 'Active'
      AND usage_limit > 0
      AND used_count >= usage_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 9. FAQS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faqs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text        NOT NULL,
  answer     text        NOT NULL,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Anyone can read faqs'
  ) THEN
    CREATE POLICY "Anyone can read faqs"
      ON public.faqs FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Admins can insert faqs'
  ) THEN
    CREATE POLICY "Admins can insert faqs"
      ON public.faqs FOR INSERT WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Admins can update faqs'
  ) THEN
    CREATE POLICY "Admins can update faqs"
      ON public.faqs FOR UPDATE USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Admins can delete faqs'
  ) THEN
    CREATE POLICY "Admins can delete faqs"
      ON public.faqs FOR DELETE USING (public.is_admin());
  END IF;
END $$;

INSERT INTO public.faqs (question, answer, sort_order) VALUES
  (
    'What materials are your jewelry pieces made from?',
    'Our jewelry is crafted from 925 sterling silver, 18K gold-plated brass, and genuine gemstones. Each piece is hypoallergenic and nickel-free, making it safe for sensitive skin.',
    1
  ),
  (
    'What is your return and exchange policy?',
    'We accept returns within 30 days of delivery. Items must be unworn, in original packaging with tags attached. Custom or engraved pieces cannot be returned. Contact us at hello@bejeweled.store to initiate a return.',
    2
  ),
  (
    'How do I care for my jewelry?',
    'Store your jewelry in a cool, dry place away from direct sunlight. Avoid contact with perfume, lotions, and water. Clean gently with a soft cloth. Remove jewelry before swimming or exercising.',
    3
  ),
  (
    'Do you offer gift wrapping?',
    'Yes! All orders come in our signature Bejeweled gift box at no extra charge. You can add a personalized message during checkout.',
    4
  ),
  (
    'How long does shipping take?',
    'Standard shipping takes 5–7 business days within Pakistan. Express shipping (2–3 days) is available. Free shipping on orders over PKR 3,000.',
    5
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 10. BLOG POSTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title            text        NOT NULL,
  slug             text        NOT NULL UNIQUE,
  content          text        NOT NULL DEFAULT '',
  excerpt          text,
  meta_title       text,
  meta_description text,
  tags             text[]      DEFAULT '{}',
  featured_image   text,
  status           text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx
  ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_created_idx
  ON public.blog_posts (status, created_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Anyone can read published blog posts'
  ) THEN
    CREATE POLICY "Anyone can read published blog posts"
      ON public.blog_posts FOR SELECT
      USING (status = 'published' OR auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Authenticated users can manage blog posts'
  ) THEN
    CREATE POLICY "Authenticated users can manage blog posts"
      ON public.blog_posts FOR ALL
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 11. CHAT LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_message      text        NOT NULL,
  assistant_message text        NOT NULL,
  intent            text        NOT NULL DEFAULT 'general',
  tools_used        text[]      NOT NULL DEFAULT '{}',
  model_used        text        NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_logs_created_idx ON public.chat_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS chat_logs_user_idx    ON public.chat_logs (user_id);

ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_logs' AND policyname = 'admin_select_chat_logs'
  ) THEN
    CREATE POLICY "admin_select_chat_logs"
      ON public.chat_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_logs' AND policyname = 'admin_delete_chat_logs'
  ) THEN
    CREATE POLICY "admin_delete_chat_logs"
      ON public.chat_logs FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Allow the API (service role) to insert chat logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_logs' AND policyname = 'service_insert_chat_logs'
  ) THEN
    CREATE POLICY "service_insert_chat_logs"
      ON public.chat_logs FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 12. CONTACT MESSAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text        NOT NULL,
  subject    text        NOT NULL,
  message    text        NOT NULL,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'public_insert_contact_messages'
  ) THEN
    CREATE POLICY "public_insert_contact_messages"
      ON public.contact_messages FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'admin_select_contact_messages'
  ) THEN
    CREATE POLICY "admin_select_contact_messages"
      ON public.contact_messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'admin_update_contact_messages'
  ) THEN
    CREATE POLICY "admin_update_contact_messages"
      ON public.contact_messages FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'admin_delete_contact_messages'
  ) THEN
    CREATE POLICY "admin_delete_contact_messages"
      ON public.contact_messages FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 13. SEO METADATA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type      text        NOT NULL CHECK (entity_type IN ('product', 'page')),
  entity_id        text        NOT NULL,
  meta_title       text,
  meta_description text,
  keywords         text[],
  tags             text[],
  og_title         text,
  og_description   text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_metadata_entity_unique UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS seo_metadata_entity_idx
  ON public.seo_metadata (entity_type, entity_id);

ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'seo_metadata' AND policyname = 'Anyone can read seo_metadata'
  ) THEN
    CREATE POLICY "Anyone can read seo_metadata"
      ON public.seo_metadata FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'seo_metadata' AND policyname = 'Authenticated users can manage seo_metadata'
  ) THEN
    CREATE POLICY "Authenticated users can manage seo_metadata"
      ON public.seo_metadata FOR ALL USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 14. STORAGE BUCKET POLICIES
-- Run after creating the 'bejeweled-images' bucket in the
-- Supabase Dashboard → Storage (set to Public, 10MB limit,
-- allowed types: image/jpeg, image/png, image/webp, image/gif)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Public can read bejeweled images'
  ) THEN
    CREATE POLICY "Public can read bejeweled images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'bejeweled-images');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Authenticated users can upload bejeweled images'
  ) THEN
    CREATE POLICY "Authenticated users can upload bejeweled images"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'bejeweled-images' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Authenticated users can delete bejeweled images'
  ) THEN
    CREATE POLICY "Authenticated users can delete bejeweled images"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'bejeweled-images' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================================
-- END OF MIGRATION
-- =============================================================
