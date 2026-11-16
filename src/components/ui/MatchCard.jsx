
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';

import StatusPill from '../common/StatusPill';
import { formatDateTime } from '../../lib/formatters';
import { supabase } from '../../lib/supabase';

function formatDivision(division) {
  if (!division) return '';

  const value = String(division).trim().toLowerCase();

  if (value === 'boys' || value === 'boys division') {
    return 'BOYS DIVISION';
  }

  if (value === 'girls' || value === 'girls division') {
    return 'GIRLS DIVISION';
  }

  return String(division).trim().toUpperCase();
}

export default function MatchCard({ match }) {
  const home = match.home_team;
  const away = match.away_team;

  const [periodScores, setPeriodScores] = useState([]);

  const divisionLabel = formatDivision(match.division);

  const showScore =
    match.status === 'completed' ||
    match.status === 'in_progress' ||
    match.status === 'paused';

  useEffect(() => {
    let active = true;

    async function loadPeriodScores() {
      const { data, error } = await supabase
        .from('match_period_scores')
        .select('period_number, period_label, home_score, away_score')
        .eq('match_id', match.id)
        .order('period_number', { ascending: true });

      if (!error && active) {
        setPeriodScores(data || []);
      }
    }

    loadPeriodScores();

    const channel = supabase
      .channel(`match-card-periods-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_period_scores',
          filter: `match_id=eq.${match.id}`,
        },
        () => {
          loadPeriodScores();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  return (
    <Link className="match-card" to={`/matches/${match.id}`}>
      <div className="match-card-top">
        <span>{match.sport?.name || 'Competition'}</span>
        <StatusPill status={match.status} />
      </div>

      {divisionLabel && (
        <div className="match-division">
          {divisionLabel}
        </div>
      )}

      <div className="match-teams">
        <div className="match-team">
          <span
            className="team-emblem"
            style={{
              '--team-color': home?.primary_color || '#e8ad2e',
            }}
          >
            {home?.logo_url ? (
              <img
                src={home.logo_url}
                alt={`${home.name || 'Home team'} logo`}
              />
            ) : (
              (home?.abbreviation || home?.name || 'TBD').slice(0, 3)
            )}
          </span>

          <b>{home?.name || 'TBD'}</b>
        </div>

        <div className="match-score">
          {showScore ? (
            <>
              <strong>{match.home_score ?? 0}</strong>
              <span>:</span>
              <strong>{match.away_score ?? 0}</strong>
            </>
          ) : (
            <span className="vs-label">VS</span>
          )}
        </div>

        <div className="match-team">
          <span
            className="team-emblem"
            style={{
              '--team-color': away?.primary_color || '#8793a7',
            }}
          >
            {away?.logo_url ? (
              <img
                src={away.logo_url}
                alt={`${away.name || 'Away team'} logo`}
              />
            ) : (
              (away?.abbreviation || away?.name || 'TBD').slice(0, 3)
            )}
          </span>

          <b>{away?.name || 'TBD'}</b>
        </div>
      </div>

      {periodScores.length > 0 && (
        <div className="match-period-scores">
          {periodScores.map((period) => (
            <span key={period.period_number}>
              {period.period_label}: {period.home_score}–{period.away_score}
            </span>
          ))}
        </div>
      )}

      <div className="match-card-meta">
        <span>
          <CalendarDays size={14} />
          {formatDateTime(match.scheduled_at)}
        </span>

        <span>
          <MapPin size={14} />
          {match.venue?.name || 'Venue TBA'}
        </span>
      </div>
    </Link>
  );
}
