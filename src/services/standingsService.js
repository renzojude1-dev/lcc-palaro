
import { listRecords } from './dataService';

export const getStandings = (options = {}) =>
  listRecords('standings', {
    select: `
      *,
      team:teams(
        name,
        abbreviation,
        primary_color,
        logo_url
      ),
      sport:sports(name)
    `,
    orderBy: 'points',
    ascending: false,
    ...options,
  });

export function calculateStandings(
  matches = [],
  teamIds = [],
  {
    winPoints = 3,
    drawPoints = 1,
    lossPoints = 0,
  } = {}
) {
  const rows = Object.fromEntries(
    teamIds.map((id) => [
      id,
      {
        team_id: id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        scored: 0,
        conceded: 0,
        difference: 0,
      },
    ])
  );

  const completedMatches = matches.filter(
    (match) => match.status === 'completed'
  );

  for (const match of completedMatches) {
    const home = rows[match.home_team_id];
    const away = rows[match.away_team_id];

    if (
      !home ||
      !away ||
      match.home_score == null ||
      match.away_score == null
    ) {
      continue;
    }

    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);

    if (
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore)
    ) {
      continue;
    }

    home.played++;
    away.played++;

    home.scored += homeScore;
    home.conceded += awayScore;

    away.scored += awayScore;
    away.conceded += homeScore;

    if (homeScore > awayScore) {
      home.wins++;
      home.points += winPoints;

      away.losses++;
      away.points += lossPoints;
    } else if (homeScore < awayScore) {
      away.wins++;
      away.points += winPoints;

      home.losses++;
      home.points += lossPoints;
    } else {
      home.draws++;
      away.draws++;

      home.points += drawPoints;
      away.points += drawPoints;
    }
  }

  return Object.values(rows)
    .map((row) => ({
      ...row,
      difference: row.scored - row.conceded,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.difference - a.difference ||
        b.scored - a.scored
    );
}
