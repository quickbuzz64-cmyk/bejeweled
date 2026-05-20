import { useEffect, useState } from 'react';
import { getSupabaseClient } from './supabase';
import type { WishlistItem } from '../types';

export type { WishlistItem };

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: rows } = await supabase
        .from('wishlist_items')
        .select('id, product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!rows || rows.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const productIds = rows.map((r) => r.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, images')
        .in('id', productIds);

      const productMap = new Map(
        (products ?? []).map((p) => [p.id, p])
      );

      const merged: WishlistItem[] = rows
        .map((row) => {
          const product = productMap.get(row.product_id);
          if (!product) return null;
          return {
            id: row.id,
            productId: row.product_id,
            name: product.name,
            price: product.price,
            image: product.images?.[0] ?? '',
          };
        })
        .filter(Boolean) as WishlistItem[];

      setItems(merged);
      setLoading(false);
    }

    void load();

    // Realtime subscription
    const channel = supabase
      .channel('wishlist_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_items' }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading };
}

export async function addToWishlist(productId: string) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to use your wishlist.');

  const { error } = await supabase
    .from('wishlist_items')
    .upsert({ user_id: user.id, product_id: productId }, { onConflict: 'user_id,product_id' });

  if (error) throw error;
}

export async function removeFromWishlist(wishlistItemId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', wishlistItemId);

  if (error) throw error;
}

export async function getWishlistCount(): Promise<number> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from('wishlist_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return count ?? 0;
}
