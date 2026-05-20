import { useEffect, useCallback } from 'react';
import { getSupabaseClient } from './supabase';
import { handleSupabaseError } from './errors';
import type { CartItem, CartRow, ProductLookupRow } from '../types';
import { useCartStore } from '../store/cartStore';

export type { CartItem };

// ─── Helpers ────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function mapRow(row: CartRow, product: ProductLookupRow | undefined): CartItem {
  const images = product?.images ?? [];
  return {
    id: row.id,
    productId: row.product_id,
    name: product?.name ?? 'Product unavailable',
    price: Number(product?.price ?? 0),
    quantity: row.quantity,
    image: images[0] ?? '',
    stock: product?.stock ?? 9999,
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────

export async function fetchCartItems(): Promise<CartItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_id, quantity')
    .eq('user_id', userId);

  if (error) handleSupabaseError(error, 'Failed to load cart');

  const cartRows = (data as CartRow[]) ?? [];

  if (cartRows.length === 0) {
    return [];
  }

  const productIds = Array.from(new Set(cartRows.map((row) => row.product_id)));
  const { data: productData, error: productError } = await supabase
    .from('products')
    .select('id, name, price, images, stock')
    .in('id', productIds);

  if (productError) handleSupabaseError(productError, 'Failed to load cart products');

  const productsById = new Map(
    ((productData as ProductLookupRow[] | null) ?? []).map((product) => [product.id, product])
  );

  return cartRows.map((row) => mapRow(row, productsById.get(row.product_id)));
}

export async function addToCart(productId: string, quantity = 1): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('You must be signed in to add items to your cart.');

  const supabase = getSupabaseClient();

  // Check if already in cart → increment quantity
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) handleSupabaseError(error, 'Failed to update cart item quantity');
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({ user_id: userId, product_id: productId, quantity });
    if (error) handleSupabaseError(error, 'Failed to add item to cart');
  }
}

export async function updateCartQuantity(cartItemId: string, quantity: number): Promise<void> {
  if (quantity < 1) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId);
  if (error) handleSupabaseError(error, 'Failed to update cart quantity');
}

export async function removeFromCart(cartItemId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId);
  if (error) handleSupabaseError(error, 'Failed to remove cart item');
}

export async function clearCart(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);
  if (error) handleSupabaseError(error, 'Failed to clear cart');
}

export function useCart() {
  const store = useCartStore();

  const refresh = useCallback(() => store.loadCart(), [store]);

  useEffect(() => {
    void store.loadCart();
    store.initRealtime();
    return () => {
      store.disposeRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    items: store.items,
    count: store.itemCount(),
    loading: store.isLoading,
    refresh,
  };
}
