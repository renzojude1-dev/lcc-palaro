
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Clock3 } from 'lucide-react';

import StatusPill from '../common/StatusPill';
import { formatDateTime } from '../../lib/formatters';
import { supabase } from '../../lib/supabase';

function isBasketball(match) {
  const name = String(
    match.sport?.name || match.sport_name || ''
  ).toLowerCase();

  return name.includes('basketball');
}

function isVolleyball(match) {
  const name = String(
    match.sport?.name || match.sport_name || ''
  ).toLowerCase();

  return name.includes('volleyball');
}

function formatClock(seconds) {
  if (seconds === null || seconds === undefined) return '--:--';

  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remaining
  ).padStart(2, '0')}`;
}

function getClockValue(liveState, now) {
  if (!liveState) return null;

  let seconds = Number(liveState.game_clock_seconds ?? 0);

  if (liveState.clock_running && liveState.updated_at) {
    const updatedAt = new Date(liveState.updated_at).getTime();

    if (!Number.isNaN(updatedAt)) {
      const elapsed = Math.floor(
        Math.max(0, now - updatedAt) / 1000
      );

      seconds = Math.max(0, seconds - elapsed);
    }
  }

  return seconds;
}

function getPeriodLabel(period) {
  return (
    period.period_label ||
    `Period ${period.period_number}`
  );
}

function getSetWinner(period) {
  const home = Number(period.home_score || 0);
  const away = Number(period.away_score || 0);
  const number = Number(period.period_number);

  if (home === away) return null;

  const target = number === 3 ? 15 : 25;

  if (
    Math.max(home, away) >= target &&
    Math.abs(home - away) >= 2
  ) {
    return home > away ? 'home' : 'away';
  }

  return null;
}

function getSetsWon(periods) {
  return periods.reduce(
    (total, period) => {
      const winner = getSetWinner(period);

      if (winner === 'home') total.home += 1;
      if (winner === 'away') total.away += 1;

      return total;
    },
    { home: 0, away: 0 }
  );
}

export default function MatchCard({ match }) {
  const home = match.home_team || {};
  const away = match.away_team || {};

  const [periodScores, setPeriodScores] = useState([]);
  const [liveState, setLiveState] = useState(null);
  const [clockNow, setClockNow] = useState(Date.now());

  const status = String(match.status || '').toLowerCase();
  const showScore = [
    'completed',
    'in_progress',
    'paused',
  ].includes(status);

  const basketball = isBasketball(match);
  const volleyball = isVolleyball(match);

  useEffect(() => {
    let active = true;

    async function loadMatchDetails() {
      const [periodResult, liveResult] = await Promise.all([
        supabase
          .from('match_period_scores')
          .select('id, period_number, period_label, home_score, away_score')
          .eq('match_id', match.id)
          .order('period_number', { ascending: true }),

        supabase
          .from('match_live_state')
          .select('*')
          .eq('match_id', match.id)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (!periodResult.error) {
        setPeriodScores(periodResult.data || []);
      }

      if (!liveResult.error) {
        setLiveState(liveResult.data || null);
      }
    }

    loadMatchDetails();

    const periodChannel = supabase
      .channel(`match-card-periods-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_period_scores',
          filter: `match_id=eq.${match.id}`,
        },
        loadMatchDetails
      )
      .subscribe();

    const liveChannel = supabase
      .channel(`match-card-live-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_live_state',
          filter: `match_id=eq.${match.id}`,
        },
        loadMatchDetails
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(periodChannel);
      supabase.removeChannel(liveChannel);
    };
  }, [match.id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const sortedPeriods = [...periodScores].sort(
    (a, b) => Number(a.period_number) - Number(b.period_number)
  );

  const setsWon = getSetsWon(sortedPeriods);

  const currentPeriod = Number(liveState?.current_period || 1);
  const quarterLabel =
    currentPeriod <= 4
      ? `Q${currentPeriod}`
      : `OT${currentPeriod - 4}`;

  const clockValue = getClockValue(liveState, clockNow);

  const venue =
    typeof match.venue === 'object'
      ? match.venue?.name
      : match.venue;

  return (
    <Link className="match-card" to={`/matches/${match.id}`}>
      <div className="match-card-top">
        <span>{match.sport?.name || match.sport_name || 'Competition'}</span>
        <StatusPill status={match.status} />
      </div>

      {match.division && (
        <div className="match-division">
          {match.division}
        </div>
      )}

      <div className="match-teams">
        <div className="match-team">
          <span
            className="team-emblem"
            style={{
              '--team-color': home.primary_color || '#e8ad2e',
            }}
          >
            {home.logo_url ? (
              <img
                src={home.logo_url}
                alt={`${home.name || 'Home team'} logo`}
              />
            ) : (
              (home.abbreviation || home.name || 'TBD').slice(0, 3)
            )}
          </span>

          <b>{home.name || 'TBD'}</b>
        </div>

        <div className="match-score">
          {showScore ? (
            <>
              <strong>
                {volleyball ? setsWon.home : match.home_score ?? 0}
              </strong>
              <span>:</span>
              <strong>
                {volleyball ? setsWon.away : match.away_score ?? 0}
              </strong>
            </>
          ) : (
            <span className="vs-label">VS</span>
          )}
        </div>

        <div className="match-team">
          <span
            className="team-emblem"
            style={{
              '--team-color': away.primary_color || '#8793a7',
            }}
          >
            {away.logo_url ? (
              <img
                src={away.logo_url}
                alt={`${away.name || 'Away team'} logo`}
              />
            ) : (
              (away.abbreviation || away.name || 'TBD').slice(0, 3)
            )}
          </span>

          <b>{away.name || 'TBD'}</b>
        </div>
      </div>

      {basketball && (
        <div className="match-live-period">
          <strong>{quarterLabel}</strong>
          <span>
            <Clock3 size={13} />
            {formatClock(clockValue)}
          </span>
          <small>
            {status === 'in_progress'
              ? 'TIME LEFT'
              : status === 'paused'
                ? 'PAUSED'
                : status === 'completed'
                  ? 'FINAL'
                  : 'GAME CLOCK'}
          </small>
        </div>
      )}

      {sortedPeriods.length > 0 && (
        <div className="match-period-scores">
          {volleyball && (
            <div className="match-period-heading">
              SET-BY-SET SCORE
              <span>
                {setsWon.home}–{setsWon.away} SETS
              </span>
            </div>
          )}

          {sortedPeriods.map((period) => {
            const winner = volleyball ? getSetWinner(period) : null;

            return (
              <span
                className="match-period-score-row"
                key={period.id || period.period_number}
              >
                <b>{getPeriodLabel(period)}</b>
                <strong>
                  {period.home_score}–{period.away_score}
                </strong>
                {winner && (
                  <small>
                    {winner === 'home'
                      ? home.abbreviation || home.name
                      : away.abbreviation || away.name}{' '}
                    won
                  </small>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="match-card-meta">
        <span>
          <CalendarDays size={14} />
          {formatDateTime(match.scheduled_at)}
        </span>

        <span>
          <MapPin size={14} />
          {venue || 'Venue TBA'}
        </span>
      </div>

      <div className="match-card-open-hint">
        View match details <span>→</span>
      </div>
    </Link>
  );
}
