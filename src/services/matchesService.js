
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { listRecords, saveRecord } from './dataService';

export const getMatches = (options = {}) =>
  listRecords('matches', {
    select: `
      *,
      sport:sports(name, category),
      home_team:teams!matches_home_team_id_fkey(
        name,
        abbreviation,
        primary_color,
        logo_url
      ),
      away_team:teams!matches_away_team_id_fkey(
        name,
        abbreviation,
        primary_color,
        logo_url
      ),
      venue:venues(name)
    `,
    orderBy: 'scheduled_at',
    ascending: true,
    ...options,
  });

export const saveMatch = (record, id) =>
  saveRecord('matches', record, id);

export async function recordScoreEvent({
  matchId,
  period = 'Match',
  eventType = 'score',
  teamId,
  delta = 1,
  note = '',
}) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: new Error('Supabase is not configured.'),
    };
  }

  if (!matchId || !teamId) {
    return {
      data: null,
      error: new Error('A match and team are required.'),
    };
  }

  if (!Number.isInteger(delta)) {
    return {
      data: null,
      error: new Error('Score change must be a whole number.'),
    };
  }

  try {
    const { data, error } = await supabase.rpc('record_score_event', {
      p_match_id: matchId,
      p_period: period,
      p_event_type: eventType,
      p_team_id: teamId,
      p_delta: delta,
      p_note: note,
    });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function finalizeMatch(matchId, winnerTeamId = null) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: new Error('Supabase is not configured.'),
    };
  }

  if (!matchId) {
    return {
      data: null,
      error: new Error('A match ID is required.'),
    };
  }

  try {
    const { data, error } = await supabase.rpc('finalize_match', {
      p_match_id: matchId,
      p_winner_team_id: winnerTeamId,
    });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}
