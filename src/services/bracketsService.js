
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export async function generateBracket({
  sportId,
  stageId,
  teamIds,
  format = 'single_elimination',
}) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: new Error(
        'Supabase is not configured. Check your environment variables.'
      ),
    };
  }

  if (
    !sportId ||
    !stageId ||
    !Array.isArray(teamIds) ||
    teamIds.length < 2
  ) {
    return {
      data: null,
      error: new Error(
        'A sport, stage, and at least two teams are required.'
      ),
    };
  }

  try {
    const { data, error } = await supabase.rpc('generate_bracket', {
      p_sport_id: sportId,
      p_stage_id: stageId,
      p_team_ids: teamIds,
      p_format: format,
    });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}
