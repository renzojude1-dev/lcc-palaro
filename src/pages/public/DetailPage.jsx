
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Trophy,
  Users,
  Clock3,
  Medal,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import StatusPill from '../../components/common/StatusPill';
import Notice from '../../components/common/Notice';

import { listRecords } from '../../services/dataService';
import { formatDateTime, titleCase } from '../../lib/formatters';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { supabase } from '../../lib/supabase';

function isBasketball(record) {
  const name = String(
    record?.sport?.name || record?.sport_name || ''
  ).toLowerCase();

  return name.includes('basketball');
}

function isVolleyball(record) {
  const name = String(
    record?.sport?.name || record?.sport_name || ''
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

function getSetWinner(period) {
  const home = Number(period.home_score || 0);
  const away = Number(period.away_score || 0);
  const setNumber = Number(period.period_number);

  if (home === away) return null;

  const target = setNumber === 3 ? 15 : 25;

  if (
    Math.max(home, away) >= target &&
    Math.abs(home - away) >= 2
  ) {
    return home > away ? 'home' : 'away';
  }

  return null;
}

function getSetsWon(periods = []) {
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

function getPeriodLabel(period) {
  return (
    period.period_label ||
    `Period ${period.period_number}`
  );
}

function getCurrentPeriodLabel(record, liveState) {
  if (!liveState) return null;

  const number = Number(liveState.current_period || 1);

  if (isBasketball(record)) {
    return number <= 4 ? `Q${number}` : `OT${number - 4}`;
  }

  if (isVolleyball(record)) {
    return `Set ${number}`;
  }

  const matchingPeriod = record.periodScores?.find(
    (period) => Number(period.period_number) === number
  );

  return matchingPeriod
    ? getPeriodLabel(matchingPeriod)
    : `Period ${number}`;
}

export default function DetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const pathname = location.pathname;

  const isMatch = pathname.startsWith('/matches/');
  const kind = pathname.startsWith('/sports/')
    ? 'sports'
    : pathname.startsWith('/teams/')
      ? 'teams'
      : isMatch
        ? 'matches'
        : 'players';

  const table = kind === 'players' ? 'players' : kind;

  const [record, setRecord] = useState(null);
  const [periodScores, setPeriodScores] = useState([]);
  const [liveState, setLiveState] = useState(null);

  const [clockNow, setClockNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    try {
      const select =
        kind === 'matches'
          ? '*, sport:sports(name), home_team:teams!matches_home_team_id_fkey(name,abbreviation,logo_url,primary_color), away_team:teams!matches_away_team_id_fkey(name,abbreviation,logo_url,primary_color), venue:venues(name)'
          : kind === 'players'
            ? '*, team:teams(name)'
            : '*';

      const result = await listRecords(table, {
        select,
        filters: { id },
        limit: 1,
      });

      if (result.error) throw result.error;

      setRecord(result.data?.[0] || null);
    } catch (err) {
      setRecord(null);
      setError(err?.message || 'Unable to load this record.');
    } finally {
      setLoading(false);
    }
  }, [id, kind, table]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useRealtimeTable(table, load);

  // Load period scores and the live clock for match details.
  useEffect(() => {
    if (!isMatch || !id) return undefined;

    let active = true;

    async function loadMatchScoring() {
      const [periodResult, liveResult] = await Promise.all([
        supabase
          .from('match_period_scores')
          .select('*')
          .eq('match_id', id)
          .order('period_number', { ascending: true }),

        supabase
          .from('match_live_state')
          .select('*')
          .eq('match_id', id)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (periodResult.error) {
        setError(periodResult.error.message);
      } else {
        setPeriodScores(periodResult.data || []);
      }

      if (!liveResult.error) {
        setLiveState(liveResult.data || null);
      }
    }

    loadMatchScoring();

    const periodChannel = supabase
      .channel(`match-detail-periods-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_period_scores',
          filter: `match_id=eq.${id}`,
        },
        loadMatchScoring
      )
      .subscribe();

    const liveChannel = supabase
      .channel(`match-detail-live-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_live_state',
          filter: `match_id=eq.${id}`,
        },
        loadMatchScoring
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(periodChannel);
      supabase.removeChannel(liveChannel);
    };
  }, [id, isMatch]);

  // Update the visible clock once per second.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container page-container">
        <LoadingState />
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="container page-container">
        <Notice type="error">{error}</Notice>
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="container page-container">
        <EmptyState
          title="Record not found"
          description="This page may have been removed or is not published."
          action={
            <Link to="/" className="button button-dark">
              Return home
            </Link>
          }
        />
      </div>
    );
  }

  if (kind === 'matches') {
    const home = record.home_team || {};
    const away = record.away_team || {};

    const basketball = isBasketball(record);
    const volleyball = isVolleyball(record);

    const sortedPeriods = [...periodScores].sort(
      (a, b) =>
        Number(a.period_number) - Number(b.period_number)
    );

    const setsWon = getSetsWon(sortedPeriods);
    const clockValue = getClockValue(liveState, clockNow);

    const currentPeriod = Number(
      liveState?.current_period || 1
    );

    const currentPeriodLabel = getCurrentPeriodLabel(
      { ...record, periodScores: sortedPeriods },
      liveState
    );

    const isLive = record.status === 'in_progress';
    const isPaused = record.status === 'paused';
    const isFinal = ['completed', 'finished'].includes(
      String(record.status || '').toLowerCase()
    );

    return (
      <div className="container page-container">
        <Link to="/schedule" className="back-link">
          <ArrowLeft size={16} />
          Back to schedule
        </Link>

        <PageHeader
          eyebrow={record.sport?.name || 'MATCH CENTER'}
          title={record.round_name || 'Match details'}
          description={formatDateTime(record.scheduled_at)}
        />

        <div className="match-detail-card">
          <div className="match-detail-top">
            <span>{record.sport?.name || 'Competition'}</span>
            <StatusPill status={record.status} />
          </div>

          {record.division && (
            <p className="match-division">
              {record.division}
            </p>
          )}

          <div className="match-detail-score">
            <div>
              <span
                className="detail-team-logo"
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
                  <Trophy size={30} />
                )}
              </span>

              <h2>{home.name || 'TBD'}</h2>
              <small>{home.abbreviation || 'HOME'}</small>
            </div>

            <div className="detail-score-numbers">
              <strong>
                {volleyball
                  ? setsWon.home
                  : record.home_score ?? '—'}
              </strong>
              <span>:</span>
              <strong>
                {volleyball
                  ? setsWon.away
                  : record.away_score ?? '—'}
              </strong>
            </div>

            <div>
              <span
                className="detail-team-logo"
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
                  <Trophy size={30} />
                )}
              </span>

              <h2>{away.name || 'TBD'}</h2>
              <small>{away.abbreviation || 'AWAY'}</small>
            </div>
          </div>

          {volleyball && (
            <div className="match-detail-period-panel">
              <div className="match-detail-period-heading">
                <div>
                  <span className="match-detail-eyebrow">
                    VOLLEYBALL
                  </span>
                  <h3>Set-by-set results</h3>
                </div>

                <span className="match-detail-format">
                  BEST OF 3
                </span>
              </div>

              <div className="match-detail-set-summary">
                <span>SETS WON</span>
                <strong>
                  {setsWon.home} – {setsWon.away}
                </strong>
                <small>First team to win 2 sets wins the match</small>
              </div>

              <div className="match-detail-period-table">
                <div className="match-detail-period-row table-heading">
                  <span>SET</span>
                  <span>{home.abbreviation || 'HOME'}</span>
                  <span>{away.abbreviation || 'AWAY'}</span>
                  <span>RESULT</span>
                </div>

                {[1, 2, 3].map((setNumber) => {
                  const period = sortedPeriods.find(
                    (item) =>
                      Number(item.period_number) === setNumber
                  );

                  const homeScore = Number(
                    period?.home_score || 0
                  );
                  const awayScore = Number(
                    period?.away_score || 0
                  );

                  const winner = period
                    ? getSetWinner(period)
                    : null;

                  const hasScore =
                    homeScore > 0 || awayScore > 0;

                  const isCurrent =
                    isLive &&
                    currentPeriod === setNumber &&
                    !winner;

                  return (
                    <div
                      className={`match-detail-period-row ${
                        isCurrent ? 'is-current-period' : ''
                      }`}
                      key={setNumber}
                    >
                      <span>
                        Set {setNumber}
                        {isCurrent && <small>LIVE</small>}
                      </span>

                      <strong
                        className={
                          winner === 'home' ? 'period-winner' : ''
                        }
                      >
                        {hasScore ? homeScore : '—'}
                      </strong>

                      <strong
                        className={
                          winner === 'away' ? 'period-winner' : ''
                        }
                      >
                        {hasScore ? awayScore : '—'}
                      </strong>

                      <span className="period-result">
                        {winner === 'home'
                          ? `${home.abbreviation || 'HOME'} WON`
                          : winner === 'away'
                            ? `${away.abbreviation || 'AWAY'} WON`
                            : isCurrent
                              ? 'IN PROGRESS'
                              : hasScore
                                ? '—'
                                : 'PENDING'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="match-detail-scoring-note">
                Sets 1 and 2 are played to 25 points. The deciding
                third set is played to 15 points. A team must win
                by at least 2 points.
              </p>
            </div>
          )}

          {basketball && (
            <div className="match-detail-live-panel">
              <div>
                <span className="match-detail-eyebrow">
                  BASKETBALL GAME CLOCK
                </span>
                <strong className="match-detail-quarter">
                  {currentPeriod <= 4
                    ? `Q${currentPeriod}`
                    : `OT${currentPeriod - 4}`}
                </strong>
              </div>

              <div className="match-detail-clock">
                <Clock3 size={19} />
                <strong>{formatClock(clockValue)}</strong>
                <span>
                  {isLive
                    ? 'TIME LEFT'
                    : isPaused
                      ? 'PAUSED'
                      : isFinal
                        ? 'FINAL'
                        : 'GAME CLOCK'}
                </span>
              </div>
            </div>
          )}

          {!volleyball && sortedPeriods.length > 0 && (
            <div className="match-detail-period-panel">
              <div className="match-detail-period-heading">
                <div>
                  <span className="match-detail-eyebrow">
                    MATCH BREAKDOWN
                  </span>
                  <h3>
                    {basketball
                      ? 'Quarter-by-quarter score'
                      : 'Period-by-period score'}
                  </h3>
                </div>

                {currentPeriodLabel && (isLive || isPaused) && (
                  <span className="match-detail-format">
                    CURRENT: {currentPeriodLabel}
                  </span>
                )}
              </div>

              <div className="match-detail-period-table">
                <div className="match-detail-period-row table-heading">
                  <span>PERIOD</span>
                  <span>{home.abbreviation || 'HOME'}</span>
                  <span>{away.abbreviation || 'AWAY'}</span>
                  <span>STATUS</span>
                </div>

                {sortedPeriods.map((period) => {
                  const number = Number(period.period_number);
                  const isCurrent =
                    (isLive || isPaused) &&
                    number === currentPeriod;

                  return (
                    <div
                      className={`match-detail-period-row ${
                        isCurrent ? 'is-current-period' : ''
                      }`}
                      key={period.id || number}
                    >
                      <span>
                        {getPeriodLabel(period)}
                        {isCurrent && <small>LIVE</small>}
                      </span>

                      <strong>{period.home_score ?? 0}</strong>
                      <strong>{period.away_score ?? 0}</strong>

                      <span className="period-result">
                        {isCurrent
                          ? isPaused
                            ? 'PAUSED'
                            : 'IN PROGRESS'
                          : 'RECORDED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="match-detail-meta">
            <span>
              <CalendarDays />
              {formatDateTime(record.scheduled_at)}
            </span>

            <span>
              <MapPin />
              {record.venue?.name || 'Venue to be announced'}
            </span>

            <span>
              <Users />
              {record.round_name || 'Tournament match'}
            </span>
          </div>

          <div className="detail-note">
            {isLive
              ? 'This match is currently in progress. Scores and period information update as the organizers record them.'
              : isPaused
                ? 'This match is currently paused. The latest recorded scores are shown above.'
                : isFinal
                  ? 'This match has been marked complete by the organizers. The breakdown above shows the recorded results.'
                  : 'Match updates and official results will appear here once the match begins.'}
          </div>
        </div>
      </div>
    );
  }

  const name =
    kind === 'players'
      ? `${record.first_name || ''} ${record.last_name || ''}`.trim()
      : record.name || 'Untitled record';

  const backPath =
    kind === 'players'
      ? '/athletes'
      : `/${kind}`;

  const image =
    record.logo_url ||
    record.photo_url ||
    record.banner_url;

  return (
    <div className="container page-container">
      <Link to={backPath} className="back-link">
        <ArrowLeft size={16} />
        Back to {kind === 'players' ? 'athletes' : kind}
      </Link>

      <PageHeader
        eyebrow={titleCase(kind)}
        title={name || 'Player details'}
        description={
          record.description ||
          record.bio ||
          record.delegation ||
          record.course ||
          record.position ||
          ''
        }
      />

      <div className="detail-content-card">
        {image && (
          <img
            className="detail-cover"
            src={image}
            alt={`${name || 'Record'} image`}
          />
        )}

        <div className="detail-card-body">
          {record.status && (
            <StatusPill status={record.status} />
          )}

          <p>
            {record.description ||
              record.bio ||
              'Official details for this entry will be provided by event organizers.'}
          </p>

          {record.team?.name && (
            <p>
              <b>Team:</b> {record.team.name}
            </p>
          )}

          {record.category && (
            <p>
              <b>Category:</b> {titleCase(record.category)}
            </p>
          )}

          {record.abbreviation && (
            <p>
              <b>Abbreviation:</b> {record.abbreviation}
            </p>
          )}

          {record.eligibility_status && (
            <p>
              <b>Eligibility:</b>{' '}
              {titleCase(record.eligibility_status)}
            </p>
          )}

          {record.jersey_number != null && (
            <p>
              <b>Jersey number:</b> {record.jersey_number}
            </p>
          )}

          {record.coach_name && (
            <p>
              <b>Coach / representative:</b> {record.coach_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
