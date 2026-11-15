
import React from 'react';
import { Trophy } from 'lucide-react';
import './TournamentBracket.css';

const ROUND_NAMES = {
  1: 'Round 1',
  2: 'Quarterfinals',
  3: 'Semifinals',
  4: 'Championship',
};

function getRoundName(round, totalRounds) {
  if (round === totalRounds) return 'Championship';
  if (round === totalRounds - 1) return 'Semifinals';
  if (round === totalRounds - 2 && totalRounds >= 4) {
    return 'Quarterfinals';
  }

  return ROUND_NAMES[round] || `Round ${round}`;
}

function TeamRow({ team, score, winner }) {
  const name =
    typeof team === 'string'
      ? team
      : team?.name || team?.team_name || 'TBD';

  return (
    <div className={`tb-team ${winner ? 'tb-winner' : ''}`}>
      <span className="tb-team-name">{name}</span>
      <span className="tb-score">
        {score ?? (team ? '—' : '')}
      </span>
    </div>
  );
}

function MatchCard({ match, roundIndex, matchIndex, totalRounds }) {
  const home = match.home;
  const away = match.away;

  const homeScore = match.home_score;
  const awayScore = match.away_score;

  const completed =
    match.status === 'completed' ||
    (homeScore != null && awayScore != null && match.winner);

  const homeWinner =
    completed &&
    (match.winner === home ||
      match.winner === home?.id ||
      (homeScore != null && awayScore != null && homeScore > awayScore));

  const awayWinner =
    completed &&
    (match.winner === away ||
      match.winner === away?.id ||
      (homeScore != null && awayScore != null && awayScore > homeScore));

  return (
    <article
      className={`tb-match ${roundIndex === totalRounds - 1 ? 'tb-final' : ''}`}
      aria-label={`Round ${roundIndex + 1}, match ${matchIndex + 1}`}
    >
      <div className="tb-match-top">
        <span>Match {matchIndex + 1}</span>
        <span className={`tb-status ${completed ? 'is-complete' : ''}`}>
          {completed ? 'FINAL' : match.status || 'UPCOMING'}
        </span>
      </div>

      <TeamRow
        team={home}
        score={homeScore}
        winner={homeWinner}
      />

      <div className="tb-team-divider" />

      <TeamRow
        team={away}
        score={awayScore}
        winner={awayWinner}
      />
    </article>
  );
}

export default function TournamentBracket({
  rounds = [],
  title = 'Tournament Bracket',
  subtitle = 'Road to the championship',
  loading = false,
  emptyMessage = 'No bracket matchups are available yet.',
}) {
  if (loading) {
    return <div className="tb-message">Loading tournament bracket...</div>;
  }

  if (!rounds.length) {
    return (
      <div className="tb-message">
        <Trophy size={30} />
        <strong>{title}</strong>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <section className="tb-section">
      <header className="tb-heading">
        <div>
          <span className="tb-eyebrow">TOURNAMENT</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="tb-trophy">
          <Trophy size={25} />
        </div>
      </header>

      <div className="tb-scroll">
        <div
          className="tb-rounds"
          style={{ '--round-count': rounds.length }}
        >
          {rounds.map((matches, roundIndex) => (
            <section className="tb-round" key={`round-${roundIndex}`}>
              <h3 className="tb-round-heading">
                {getRoundName(roundIndex + 1, rounds.length)}
              </h3>

              <div className="tb-round-matches">
                {matches.map((match, matchIndex) => (
                  <MatchCard
                    key={match.id || `${roundIndex}-${matchIndex}`}
                    match={match}
                    roundIndex={roundIndex}
                    matchIndex={matchIndex}
                    totalRounds={rounds.length}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <footer className="tb-footer">
        <span className="tb-legend-dot" />
        Winners advance to the next round when results are finalized.
      </footer>
    </section>
  );
}
