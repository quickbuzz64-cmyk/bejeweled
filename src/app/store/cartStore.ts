import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import {
  fetchCartItems,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
} from '../lib/cart';
import type { CartItem, Coupon } from '../types';

interface ProductInfo {
  name: string;
  price: number;
  image: string;
  stock?: number;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;

  // Coupon
  appliedCoupon: Coupon | null;
  appliedDiscount: number;
  applyCoupon: (coupon: Coupon, discount: number) => void;
  clearCoupon: () => void;

  // Derived
  itemCount: () => number;
  total: () => number;

  // Actions
  loadCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, product?: ProductInfo) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  setItems: (items: CartItem[]) => void;

  // Realtime lifecycle
  initRealtime: () => void;
  disposeRealtime: () => void;
}

let realtimeChannel: RealtimeChannel | null = null;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  appliedCoupon: null,
  appliedDiscount: 0,

  applyCoupon: (coupon, discount) => set({ appliedCoupon: coupon, appliedDiscount: discount }),

  clearCoupon: () => set({ appliedCoupon: null, appliedDiscount: 0 }),
  isLoading: true,
  error: null,

  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  loadCart: async () => {
    try {
      const items = await fetchCartItems();
      set({ items, isLoading: false, error: null });
    } catch {
      set({ items: [], isLoading: false, error: null });
    }
  },

  addItem: async (productId, quantity = 1, product) => {
    // Optimistic update for instant UI feedback
    const prev = get().items;
    if (product) {
      const stock = product.stock ?? 9999;
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, stock);
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: newQty } : i,
          ),
        }));
      } else {
        set((state) => ({
          items: [
            ...state.items,
            { id: `opt-${productId}`, productId, name: product.name, price: product.price, image: product.image, quantity: Math.min(quantity, stock), stock },
          ],
        }));
      }
    }
    try {
      await addToCart(productId, quantity);
      await get().loadCart(); // sync real row ID quietly in background
    } catch (error) {
      set({ items: prev });
      throw error;
    }
  },

  removeItem: async (itemId) => {
    const prev = get().items;
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
    try {
      await removeFromCart(itemId);
    } catch (error) {
      set({ items: prev });
      throw error;
    }
  },

  updateQuantity: async (itemId, qty) => {
    if (qty < 1) return;
    const prev = get().items;
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i)),
    }));
    try {
      await updateCartQuantity(itemId, qty);
    } catch (error) {
      set({ items: prev });
      throw error;
    }
  },

  clearCart: async () => {
    await clearCart();
    set({ items: [], appliedCoupon: null, appliedDiscount: 0 });
  },

  setItems: (items) => set({ items }),

  initRealtime: () => {
    if (realtimeChannel) return;

    const supabase = getSupabaseClient();

    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;

      realtimeChannel = supabase
        .channel('cart-store-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart_items',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void get().loadCart();
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
