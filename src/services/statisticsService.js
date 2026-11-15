
import { listRecords, saveRecord } from './dataService';

export const getPlayerStats = (options = {}) =>
  listRecords('player_match_stats', {
    select: '*, player:players(first_name,last_name,team_id)',
    ...options,
  });

export const getBestPlayerSelections = (options = {}) =>
  listRecords('best_player_selections', {
    select: `
      *,
      player:players(first_name,last_name,photo_url),
      match:matches(
        scheduled_at,
        sport:sports(name)
      )
    `,
    ...options,
  });

export const saveBestPlayer = (record, id) =>
  saveRecord('best_player_selections', record, id);

export function rankCandidates(
  stats = [],
  weights = {
    points: 1,
    rebounds: 1,
    assists: 1,
    steals: 2,
    blocks: 2,
  }
) {
  return stats
    .map((row) => ({
      ...row,
      calculated_score: Object.entries(weights).reduce(
        (sum, [key, weight]) =>
          sum + (Number(row[key]) || 0) * weight,
        0
      ),
    }))
    .sort(
      (a, b) => b.calculated_score - a.calculated_score
    );
}
