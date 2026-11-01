import { supabase } from '@/lib/supabase';
import { TablesInsert } from '@/types/database.types';

type PostInput = TablesInsert<'posts'>;

// replies_count is a DB column kept in sync by triggers (see scripts/replies_count_migration.sql)
// We no longer use the self-join `replies:posts(count)` because having two FK refs from posts→posts
// (parent_id and reply_to_id) causes a "multiple relationships" error in Supabase's schema cache.

export const fetchPosts = async () => {
  const { data } = await supabase
    .from('posts')
    .select('*, user:profiles(*)')
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .throwOnError();
  return data;
};

export const createPost = async (newPost: PostInput) => {
  const { data } = await supabase
    .from('posts')
    .insert(newPost)
    .select('*')
    .throwOnError();
  return data;
};

export const getPostById = async (id: string) => {
  const { data } = await supabase
    .from('posts')
    .select('*, user:profiles(*)')
    .eq('id', id)
    .single()
    .throwOnError();
  return data;
};

export const getPostsByUserId = async (id: string) => {
  const { data } = await supabase
    .from('posts')
    .select('*, user:profiles(*)')
    .eq('user_id', id)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .throwOnError();
  return data;
};

/** Posts the user has reposted (via the reposts junction table) */
export const getRepostedPostsByUserId = async (userId: string) => {
  const { data } = await supabase
    .from('reposts')
    .select('post:posts(*, user:profiles(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .throwOnError();
  return (data ?? []).map((r: any) => r.post).filter(Boolean);
};

export const getPostsReplies = async (id: string) => {
  const { data } = await supabase
    .from('posts')
    .select('*, user:profiles(*)')
    .eq('parent_id', id)
    .order('created_at', { ascending: false })
    .throwOnError();
  return data;
};

export const deletePost = async (id: string) => {
  await supabase.from('posts').delete().eq('id', id).throwOnError();
};

// ─── Likes ────────────────────────────────────────────────────────────────────

export const getUserLike = async (postId: string, userId: string) => {
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
};

export const likePost = async (postId: string, userId: string) => {
  await supabase
    .from('likes')
    .insert({ post_id: postId, user_id: userId })
    .throwOnError();
};

export const unlikePost = async (postId: string, userId: string) => {
  await supabase
    .from('likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .throwOnError();
};

// ─── Reposts ──────────────────────────────────────────────────────────────────

export const getUserRepost = async (postId: string, userId: string) => {
  const { data } = await supabase
    .from('reposts')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
};

export const repostPost = async (postId: string, userId: string) => {
  await supabase
    .from('reposts')
    .insert({ post_id: postId, user_id: userId })
    .throwOnError();
};

export const unrepostPost = async (postId: string, userId: string) => {
  await supabase
    .from('reposts')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .throwOnError();
};
