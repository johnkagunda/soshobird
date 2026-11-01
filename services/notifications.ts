import { supabase } from '@/lib/supabase';

export type NotificationItem = {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'follow' | 'post';
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  post: {
    id: string;
    content: string;
  } | null;
};

/**
 * Fetch all notifications for a user, newest first.
 * Joins actor profile + post content for display.
 */
export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `*,
       actor:profiles!actor_id(id, full_name, username, avatar_url),
       post:posts!post_id(id, content)`
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  // If the join hint fails (table not yet in schema cache), fall back to bare select
  if (error) {
    const { data: bare, error: bareError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (bareError) throw bareError;
    return (bare ?? []) as NotificationItem[];
  }
  return (data ?? []) as NotificationItem[];
}

/** Mark a single notification as read */
export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

/** Mark every unread notification for a user as read */
export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}
