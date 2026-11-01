import { supabase } from '@/lib/supabase';
import { TablesInsert, TablesUpdate } from '@/types/database.types';

export const getProfileById = async (id: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .throwOnError();
  return data;
};

export const upsertProfile = async (profile: TablesInsert<'profiles'>) => {
  const { data } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select('*')
    .single()
    .throwOnError();
  return data;
};

export const updateProfile = async (
  id: string,
  updatedProfile: TablesUpdate<'profiles'>
) => {
  const { data } = await supabase
    .from('profiles')
    .update(updatedProfile)
    .eq('id', id)
    .select('*')
    .single()
    .throwOnError();
  return data;
};

// ─── Follows ──────────────────────────────────────────────────────────────────

export const getIsFollowing = async (followerId: string, followingId: string) => {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
};

export const followUser = async (followerId: string, followingId: string) => {
  await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId })
    .throwOnError();
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .throwOnError();
};

/** People who follow a given user */
export const getFollowers = async (userId: string) => {
  const { data } = await supabase
    .from('follows')
    .select('follower:profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId)
    .throwOnError();
  return (data ?? []).map((r: any) => r.follower);
};

/** People a given user is following */
export const getFollowing = async (userId: string) => {
  const { data } = await supabase
    .from('follows')
    .select('following:profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId)
    .throwOnError();
  return (data ?? []).map((r: any) => r.following);
};
