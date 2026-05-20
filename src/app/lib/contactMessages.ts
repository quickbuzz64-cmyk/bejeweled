import { getSupabaseClient } from './supabase';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/** Called by the public-facing Contact page to save a new inquiry. */
export async function submitContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('contact_messages').insert({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    subject: data.subject.trim(),
    message: data.message.trim(),
  });
  if (error) throw error;
}

/** Fetches all contact messages ordered newest-first (admin only). */
export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('contact_messages')
    .select('id, name, email, subject, message, is_read, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContactMessage[];
}

/** Marks a single message as read (admin only). */
export async function markMessageAsRead(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('contact_messages')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

/** Permanently deletes a message (admin only). */
export async function deleteContactMessage(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
