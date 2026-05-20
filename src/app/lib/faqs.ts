import { getSupabaseClient } from './supabase';
import type { FAQ } from '../types';

export type { FAQ };

export async function fetchFAQs(): Promise<FAQ[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('faqs')
    .select('id, question, answer, sort_order')
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
  }));
}
