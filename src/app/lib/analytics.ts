import { getSupabaseClient } from './supabase';
import { handleSupabaseError } from './errors';

export interface AnalyticsOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  city: string;
  email: string;
  customerName: string;
  createdAt: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  activeUsers: number;
  averageOrderValue: number;
  averageRating: number;
  totalReviews: number;
}

export interface RevenueTrendData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  ordersCount: number;
  revenue: number;
  avgRating: number;
  reviewCount: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabaseClient();

  try {
    // Get revenue and order metrics
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total, created_at, user_id');

    if (ordersError) throw ordersError;

    // Get customer count
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' });

    if (profilesError) throw profilesError;

    // Get review metrics
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating');

    if (reviewsError) throw reviewsError;

    const totalRevenue = (orders || []).reduce((sum: number, o: any) => sum + Number(o.total), 0);
    const totalOrders = orders?.length || 0;
    const totalCustomers = profiles?.length || 0;

    // Calculate active users (users who made orders in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsersSet = new Set(
      (orders || [])
        .filter((o: any) => new Date(o.created_at) > thirtyDaysAgo)
        .map((o: any) => o.user_id)
    );
    const activeUsers = activeUsersSet.size;

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate average rating
    const totalRating = (reviews || []).reduce((sum: number, r: any) => sum + r.rating, 0);
    const averageRating = reviews && reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      totalCustomers,
      activeUsers,
      averageOrderValue: Math.round(averageOrderValue),
      averageRating: Number(averageRating.toFixed(2)),
      totalReviews: reviews?.length || 0,
    };
  } catch (error) {
    handleSupabaseError(error as any, 'Failed to load dashboard metrics');
    return {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      activeUsers: 0,
      averageOrderValue: 0,
      averageRating: 0,
      totalReviews: 0,
    };
  }
}

export async function getRevenueTrend(days: number = 30): Promise<RevenueTrendData[]> {
  const supabase = getSupabaseClient();

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at');

    if (error) throw error;

    // Group orders by date
    const trendMap = new Map<string, { revenue: number; orders: number }>();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      trendMap.set(dateKey, { revenue: 0, orders: 0 });
    }

    // Aggregate orders
    for (const order of orders || []) {
      const dateKey = new Date(order.created_at).toISOString().split('T')[0];
      const existing = trendMap.get(dateKey);
      if (existing) {
        existing.revenue += Number(order.total);
        existing.orders += 1;
      }
    }

    return Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue),
      orders: data.orders,
    }));
  } catch (error) {
    handleSupabaseError(error as any, 'Failed to load revenue trend');
    return [];
  }
}

export async function getTopProducts(limit: number = 5): Promise<TopProduct[]> {
  const supabase = getSupabaseClient();

  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('items');

    if (ordersError) throw ordersError;

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('product_id, rating');

    if (reviewsError) throw reviewsError;

    // Aggregate product metrics from orders
    const productMetrics = new Map<string, { name: string; count: number; revenue: number }>();

    for (const order of orders || []) {
      const items = (order.items as any[]) || [];
      for (const item of items) {
        const existing = productMetrics.get(item.product_id) || {
          name: item.product_name || 'Unknown Product',
          count: 0,
          revenue: 0,
        };
        existing.count += item.quantity;
        existing.revenue += item.subtotal;
        productMetrics.set(item.product_id, existing);
      }
    }

    // Calculate review metrics per product
    const reviewMetrics = new Map<string, { total: number; count: number }>();
    for (const review of reviews || []) {
      const existing = reviewMetrics.get(review.product_id) || { total: 0, count: 0 };
      existing.total += review.rating;
      existing.count += 1;
      reviewMetrics.set(review.product_id, existing);
    }

    // Build top products array
    const topProducts: TopProduct[] = Array.from(productMetrics.entries()).map(([id, metrics]) => {
      const reviewData = reviewMetrics.get(id);
      return {
        id,
        name: metrics.name,
        ordersCount: metrics.count,
        revenue: Math.round(metrics.revenue),
        avgRating: reviewData ? Number((reviewData.total / reviewData.count).toFixed(2)) : 0,
        reviewCount: reviewData?.count || 0,
      };
    });

    return topProducts.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  } catch (error) {
    handleSupabaseError(error as any, 'Failed to load top products');
    return [];
  }
}

export async function getProductAverageRating(productId: string): Promise<number> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);

    if (error) throw error;

    if (!data || data.length === 0) return 0;

    const average = data.reduce((sum: number, review: any) => sum + review.rating, 0) / data.length;
    return Number(average.toFixed(2));
  } catch (error) {
    handleSupabaseError(error as any, 'Failed to load product rating');
    return 0;
  }
}

export async function fetchAllOrdersForAnalytics(): Promise<AnalyticsOrder[]> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, total, status, city, email, customer_name, created_at, items')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id as string,
      orderNumber: (row.order_number as string) || (row.id as string),
      total: Number(row.total) || 0,
      status: (row.status as string) || 'Processing',
      city: (row.city as string) || '',
      email: (row.email as string) || '',
      customerName: (row.customer_name as string) || '',
      createdAt: row.created_at as string,
      items: (Array.isArray(row.items) ? row.items : []).map((item: Record<string, unknown>) => ({
        productId: (item['productId'] as string) || (item['product_id'] as string) || '',
        name: (item['name'] as string) || '',
        price: Number(item['price']) || 0,
        quantity: Number(item['quantity']) || 1,
      })),
    }));
  } catch (error) {
    handleSupabaseError(error as any, 'Failed to load analytics orders');
    return [];
  }
}
