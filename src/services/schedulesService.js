
import { listRecords, saveRecord } from './dataService';
import { roundRobin } from '../lib/utils';

export const getVenues = (options = {}) =>
  listRecords('venues', {
    orderBy: 'name',
    ascending: true,
    ...options,
  });

export const saveVenue = (record, id) =>
  saveRecord('venues', record, id);

export function generateRoundRobinMatches({
  teams = [],
  sportId,
  venueId = null,
  startsAt,
  minutes = 90,
}) {
  if (!Array.isArray(teams) || teams.length < 2) {
    return [];
  }

  if (!sportId) {
    throw new Error('Please select a sport.');
  }

  const start = new Date(startsAt);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Please provide a valid starting date and time.');
  }

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error('Match duration must be greater than zero.');
  }

  const rounds = roundRobin(teams);
  const records = [];
  let matchIndex = 0;

  rounds.forEach((games, roundIndex) => {
    games.forEach((game) => {
      const scheduledAt = new Date(
        start.getTime() + matchIndex * minutes * 60_000
      );

      records.push({
        sport_id: sportId,
        home_team_id: game.home.id,
        away_team_id: game.away.id,
        venue_id: venueId,
        scheduled_at: scheduledAt.toISOString(),
        round_name: `Round ${roundIndex + 1}`,
        status: 'scheduled',
      });

      matchIndex++;
    });
  });

  return records;
}
