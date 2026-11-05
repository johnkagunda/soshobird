import { supabase } from '@/lib/supabase';

/** Save a game score and update best_game_score on the profile if it's higher */
export async function saveGameScore(userId: string, score: number): Promise<void> {
  // Insert the score record
  await supabase
    .from('game_scores')
    .insert({ user_id: userId, score })
    .throwOnError();

  // Update best score on profile if this score is higher
  await supabase.rpc('update_best_game_score', { p_user_id: userId, p_score: score });
}

/** Get a user's best score */
export async function getBestScore(userId: string): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('best_game_score')
    .eq('id', userId)
    .single();
  return data?.best_game_score ?? 0;
}

/** Get top 10 leaderboard */
export async function getLeaderboard() {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, best_game_score')
    .gt('best_game_score', 0)
    .order('best_game_score', { ascending: false })
    .limit(10);
  return data ?? [];
}
