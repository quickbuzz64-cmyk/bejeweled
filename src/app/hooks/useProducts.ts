import { useEffect, useState } from 'react';
import {
  getFeaturedProducts,
  getProductById,
  getProducts,
  subscribeToProducts,
  type ProductCard,
  type ProductDetailData,
  unsubscribeFromProducts,
} from '../lib/products';

type ProductHookState<T> = {
  data: T;
  error: string | null;
  loading: boolean;
};

export function useProducts(options?: { featuredOnly?: boolean; limit?: number }) {
  const [state, setState] = useState<ProductHookState<ProductCard[]>>({
    data: [],
    error: null,
    loading: true,
  });

  const loadProducts = async () => {
    try {
      const data = options?.featuredOnly
        ? await getFeaturedProducts(options.limit)
        : await getProducts();

      setState({ data, error: null, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load products right now.';
      setState({ data: [], error: message, loading: false });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const runLoadProducts = async () => {
      try {
        const data = options?.featuredOnly
          ? await getFeaturedProducts(options.limit)
          : await getProducts();

        if (!isMounted) {
          return;
        }

        setState({ data, error: null, loading: false });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to load products right now.';
        setState({ data: [], error: message, loading: false });
      }
    };

    void runLoadProducts();

    let channel: ReturnType<typeof subscribeToProducts> | null = null;

    try {
      channel = subscribeToProducts(() => {
        void runLoadProducts();
      });
    } catch {
      channel = null;
    }

    return () => {
      isMounted = false;
      if (channel) {
        unsubscribeFromProducts(channel);
      }
    };
  }, [options?.featuredOnly, options?.limit]);

  return {
    ...state,
    refetch: loadProducts,
  };
}

export function useProduct(productId?: string) {
  const [state, setState] = useState<ProductHookState<ProductDetailData | null>>({
    data: null,
    error: null,
    loading: true,
  });

  const loadProduct = async () => {
    if (!productId) {
      setState({ data: null, error: 'Product not found.', loading: false });
      return;
    }

    try {
      const data = await getProductById(productId);
      setState({ data, error: null, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load this product right now.';
      setState({ data: null, error: message, loading: false });
    }
  };

  useEffect(() => {
    if (!productId) {
      setState({ data: null, error: 'Product not found.', loading: false });
      return;
    }

    let isMounted = true;

    const runLoadProduct = async () => {
      try {
        const data = await getProductById(productId);

        if (!isMounted) {
          return;
        }

        setState({ data, error: null, loading: false });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to load this product right now.';
        setState({ data: null, error: message, loading: false });
      }
    };

    void runLoadProduct();

    let channel: ReturnType<typeof subscribeToProducts> | null = null;

    try {
      channel = subscribeToProducts(() => {
        void runLoadProduct();
      });
    } catch {
      channel = null;
    }

    return () => {
      isMounted = false;
      if (channel) {
        unsubscribeFromProducts(channel);
      }
    };
  }, [productId]);

  return {
    ...state,
    refetch: loadProduct,
  };
}