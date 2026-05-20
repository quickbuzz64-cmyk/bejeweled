import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import type { WishlistItem } from '../types';

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;

  // Derived
  itemCount: () => number;
  isInWishlist: (productId: string) => boolean;

  // Actions
  loadWishlist: () => Promise<void>;
  addItem: (productId: string) => Promise<'added' | 'already_exists'>;
  removeItem: (wishlistItemId: string) => Promise<void>;

  // Realtime lifecycle
  initRealtime: () => void;
  disposeRealtime: () => void;
}

let realtimeChannel: RealtimeChannel | null = null;

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: true,

  itemCount: () => get().items.length,

  isInWishlist: (productId: string) =>
    get().items.some((item) => item.productId === productId),

  loadWishlist: async () => {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ items: [], isLoading: false });
      return;
    }

    const { data: rows } = await supabase
      .from('wishlist_items')
      .select('id, product_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!rows || rows.length === 0) {
      set({ items: [], isLoading: false });
      return;
    }

    const productIds = rows.map((r) => r.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, images')
      .in('id', productIds);

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));

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

    set({ items: merged, isLoading: false });
  },

  addItem: async (productId: string) => {
    if (get().isInWishlist(productId)) return 'already_exists';

    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sign in to use your wishlist.');

    const { error } = await supabase
      .from('wishlist_items')
      .upsert({ user_id: user.id, product_id: productId }, { onConflict: 'user_id,product_id' });

    if (error) throw error;
    await get().loadWishlist();
    return 'added';
  },

  removeItem: async (wishlistItemId: string) => {
    // Optimistic update for instant UI feedback
    set((state) => ({ items: state.items.filter((i) => i.id !== wishlistItemId) }));

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', wishlistItemId);

    if (error) {
      // Revert on failure
      await get().loadWishlist();
      throw error;
    }
  },

  initRealtime: () => {
    if (realtimeChannel) return;

    const supabase = getSupabaseClient();

    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;

      realtimeChannel = supabase
        .channel('wishlist-store-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wishlist_items',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void get().loadWishlist();
          },
        )
        .subscribe();
    })();
  },

  disposeRealtime: () => {
    if (realtimeChannel) {
      void getSupabaseClient().removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },
}));
