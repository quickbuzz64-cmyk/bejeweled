import { getSupabaseClient } from './supabase';
import { handleSupabaseError } from './errors';

export interface Review {
  id: string;
  product_id: string;
  product_name?: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export async function getReviewsForProduct(productId: string): Promise<Review[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'Failed to load reviews');
  return (data ?? []) as Review[];
}

export async function submitReview(
  productId: string,
  rating: number,
  comment: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to submit a review');

  const meta = user.user_metadata ?? {};
  const firstName = (meta.first_name as string) || '';
  const lastName = (meta.last_name as string) || '';
  const userName = firstName
    ? `${firstName} ${lastName}`.trim()
    : user.email?.split('@')[0] || 'Customer';

  const { error } = await supabase.from('reviews').insert({
    product_id: productId,
    user_id: user.id,
    user_name: userName,
    rating,
    comment,
  });

  if (error) {
    if (error.code === '23505') throw new Error('You have already reviewed this product');
    handleSupabaseError(error, 'Failed to submit review');
  }
}

export async function getCurrentUserReviewForProduct(productId: string): Promise<Review | null> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('user_id', user.id)
    .maybeSingle();

  return (data as Review) ?? null;
}

export async function getAllReviewsForAdmin(): Promise<Review[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*, products(name)')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'Failed to load reviews');

  return (data ?? []).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    product_name: (row.products as { name?: string } | null)?.name ?? '',
    user_id: row.user_id,
    user_name: row.user_name,
    rating: row.rating,
    comment: row.comment,
    admin_reply: row.admin_reply,
    replied_at: row.replied_at,
    created_at: row.created_at,
  }));
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('reviews')
    .update({ admin_reply: reply, replied_at: new Date().toISOString() })
    .eq('id', reviewId);

  if (error) handleSupabaseError(error, 'Failed to save reply');
}

export async function deleteReview(reviewId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) handleSupabaseError(error, 'Failed to delete review');
}
