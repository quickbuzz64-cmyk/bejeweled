import { getSupabaseClient } from './supabase';

export interface ChatLog {
  id: string;
  user_id: string | null;
  user_message: string;
  assistant_message: string;
  intent: string;
  tools_used: string[];
  model_used: string;
  created_at: string;
}

export async function fetchChatLogs(limit = 200): Promise<ChatLog[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chat_logs')
    .select('id, user_id, user_message, assistant_message, intent, tools_used, model_used, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ChatLog[];
}

export async function deleteChatLog(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('chat_logs').delete().eq('id', id);
  if (error) throw error;
}
