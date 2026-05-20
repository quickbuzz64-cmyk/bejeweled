-- Add payment_method column to orders table
-- COD (Cash on Delivery) orders have 4% government tax; Stripe orders do not.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cod';
