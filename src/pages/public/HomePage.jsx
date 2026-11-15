import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Radio,
  CalendarDays,
  ArrowRight,
  MapPin,
  RefreshCw,
  Swords,
  Medal,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

import { getTeams } from '../../services/teamsService';
import { getMatches } from '../../services/matchesService';
import { supabase } from '../../lib/supabase';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';

function getMatchDate(match) {
  return (
    match.scheduled_at ||
    match.start_time ||
    match.match_date ||
    match.date ||
    null
  );
}

function formatDate(value) {
  if (!value) return 'Schedule TBD';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatus(status) {
  const value = String(status || 'scheduled').toLowerCase();

  if (value === 'in_progress') return 'LIVE';
  if (value === 'paused') return 'PAUSED';
  if (['completed', 'finished'].includes(value)) return 'FINAL';

  if (['cancelled', 'postponed'].includes(value)) {
    return value.toUpperCase();
  }

  return 'UPCOMING';
}

function isVolleyball(match) {
  const sport = String(
    match.sport?.name || match.sport_name || ''
  ).toLowerCase();

  return sport.includes('volleyball');
}

function getTeamAbbreviation(team, fallback = 'TEAM') {
  const abbreviation =
    team?.abbreviation ||
    team?.short_name ||
    team?.acronym ||
    team?.team_code ||
    team?.code;

  if (abbreviation) {
    return String(abbreviation).trim().toUpperCase();
  }

  const name = String(team?.name || '').trim();

  if (!name) return fallback;

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return initials || fallback;
}

function getSetWinner(period) {
  const home = Number(period.home_score || 0);
  const away = Number(period.away_score || 0);

  if (home === away) return null;

  const setNumber = Number(period.period_number);
  const target = setNumber === 5 ? 15 : 25;

  if (
    Math.max(home, away) >= target &&
    Math.abs(home - away) >= 2
  ) {
    return home > away ? 'home' : 'away';
  }

  return null;
}

function calculateSetsWon(periods) {
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

function TeamLogo({ team, size = 'md' }) {
  const sizeClass =
    size === 'hero'
      ? 'logo-hero'
      : size === 'lg'
        ? 'logo-lg'
        : 'logo-md';

  const iconSize = size === 'hero' ? 42 : size === 'lg' ? 28 : 18;

  return (
    <div
      className={`home-team-logo-wrapper ${sizeClass}`}
      style={{
        '--team-color': team?.primary_color || '#3b82f6',
      }}
    >
      {team?.logo_url ? (
        <img
          src={team.logo_url}
          alt={`${team.name || 'Team'} logo`}
          className="home-team-logo-img"
          loading="lazy"
        />
      ) : (
        <Trophy size={iconSize} className="logo-icon" />
      )}
    </div>
  );
}

function VolleyballBreakdown({
  match,
  periods = [],
  homeAbbr = 'HOME',
  awayAbbr = 'AWAY',
}) {
  const sortedPeriods = [...periods].sort(
    (a, b) =>
      Number(a.period_number) - Number(b.period_number)
  );

  const sets = calculateSetsWon(sortedPeriods);

  const status = String(match.status || '').toLowerCase();
  const isLive = ['in_progress', 'paused'].includes(status);
  const isFinal = ['completed', 'finished'].includes(status);

  const activeSet = sortedPeriods.find((period) => {
    const home = Number(period.home_score || 0);
    const away = Number(period.away_score || 0);

    return (
      !getSetWinner(period) &&
      (home > 0 || away > 0)
    );
  });

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        background: 'rgba(30, 41, 59, 0.045)',
        border: '1px solid rgba(100, 116, 139, 0.15)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          gap: 8,
        }}
      >
        <strong
          style={{
            fontSize: 11,
            letterSpacing: '1px',
          }}
        >
          VOLLEYBALL SET SCORE
        </strong>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#2563eb',
          }}
        >
          {isFinal ? 'FINAL SETS' : isLive ? 'LIVE SETS' : 'RESULTS'}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderRadius: 8,
          background: '#17243b',
          color: '#fff',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 10, opacity: 0.75 }}>
            SETS WON
          </div>

          <div style={{ fontSize: 23, fontWeight: 800 }}>
            {sets.home}

            <span style={{ opacity: 0.55, padding: '0 8px' }}>
              -
            </span>

            {sets.away}
          </div>
        </div>

        <div
          style={{
            fontSize: 10,
            textAlign: 'right',
            opacity: 0.8,
          }}
        >
          BEST OF 5
          <br />
          FIRST TO 3 SETS
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '0.8fr 1fr 1fr 1fr',
          gap: 5,
          alignItems: 'center',
        }}
      >
        {['SET', homeAbbr, awayAbbr, 'RESULT'].map((heading) => (
          <div
            key={heading}
            style={{
              fontSize: 9,
              fontWeight: 800,
              textAlign: 'center',
              color: '#64748b',
              padding: '4px 0',
            }}
          >
            {heading}
          </div>
        ))}

        {sortedPeriods.map((period) => {
          const winner = getSetWinner(period);
          const setNumber = Number(period.period_number);

          const home = Number(period.home_score || 0);
          const away = Number(period.away_score || 0);

          const isCurrent =
            isLive &&
            !winner &&
            activeSet?.period_number === period.period_number;

          const hasScore = home > 0 || away > 0;

          return (
            <React.Fragment key={period.id || setNumber}>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '7px 2px',
                  borderRadius: 5,
                  background: isCurrent ? '#dbeafe' : 'transparent',
                  color: isCurrent ? '#1d4ed8' : '#475569',
                }}
              >
                S{setNumber}

                {isCurrent && (
                  <div style={{ fontSize: 8 }}>LIVE</div>
                )}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 800,
                  padding: 7,
                  borderRadius: 5,
                  background: winner === 'home' ? '#dcfce7' : '#fff',
                  color: winner === 'home' ? '#166534' : '#17243b',
                }}
              >
                {hasScore ? home : '—'}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 800,
                  padding: 7,
                  borderRadius: 5,
                  background: winner === 'away' ? '#dcfce7' : '#fff',
                  color: winner === 'away' ? '#166534' : '#17243b',
                }}
              >
                {hasScore ? away : '—'}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 9,
                  fontWeight: 800,
                  color: winner
                    ? '#15803d'
                    : isCurrent
                      ? '#2563eb'
                      : '#94a3b8',
                }}
              >
                {winner
                  ? winner === 'home'
                    ? `${homeAbbr} WON`
                    : `${awayAbbr} WON`
                  : isCurrent
                    ? 'IN PROGRESS'
                    : hasScore
                      ? '—'
                      : 'PENDING'}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {activeSet && isLive && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid #cbd5e1',
            textAlign: 'center',
            fontSize: 12,
            color: '#334155',
          }}
        >
          Current: <strong>{activeSet.period_label}</strong>
          {' — '}
          <strong>
            {Number(activeSet.home_score || 0)}
            {' - '}
            {Number(activeSet.away_score || 0)}
          </strong>
        </div>
      )}

      {sortedPeriods.length === 0 && (
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#64748b',
            margin: 8,
          }}
        >
          No set scores recorded yet.
        </p>
      )}
    </div>
  );
}

function MatchCard({ match, periodScores = [] }) {
  const home = match.home_team || {};
  const away = match.away_team || {};

  const homeAbbr = getTeamAbbreviation(home, 'HOME');
  const awayAbbr = getTeamAbbreviation(away, 'AWAY');

  const status = String(match.status || 'scheduled').toLowerCase();
  const isLive = status === 'in_progress';
  const isPaused = status === 'paused';
  const isFinal = ['completed', 'finished'].includes(status);

  const volleyball = isVolleyball(match);

  const sportName =
    match.sport?.name || match.sport_name || 'Sports Event';

  const venue =
    typeof match.venue === 'object'
      ? match.venue?.name || 'TBD Venue'
      : match.venue || match.location || 'TBD Venue';

  const sets = volleyball
    ? calculateSetsWon(periodScores)
    : null;

  return (
    <article
      className={`home-match-card ${isLive ? 'live-border' : ''}`}
    >
      <div className="home-match-top">
        <span
          className={`home-match-status ${
            isLive
              ? 'live'
              : isPaused
                ? 'paused'
                : isFinal
                  ? 'final'
                  : 'upcoming'
          }`}
        >
          {isLive && <span className="home-live-dot" />}
          {getStatus(status)}
        </span>

        <span className="home-match-sport">{sportName}</span>
      </div>

      <div className="home-match-teams-container">
        <div className="home-match-team-row">
          <div className="team-info">
            <TeamLogo team={home} size="md" />

            <span className="home-match-team-name">
              {homeAbbr}
            </span>
          </div>

          <strong className={`home-match-score ${isLive ? 'score-highlight' : ''}`}>
            {volleyball
              ? sets.home
              : match.home_score ??
                (isLive || isPaused || isFinal ? 0 : '—')}
          </strong>
        </div>

        <div className="home-match-team-row">
          <div className="team-info">
            <TeamLogo team={away} size="md" />

            <span className="home-match-team-name">
              {awayAbbr}
            </span>
          </div>

          <strong className={`home-match-score ${isLive ? 'score-highlight' : ''}`}>
            {volleyball
              ? sets.away
              : match.away_score ??
                (isLive || isPaused || isFinal ? 0 : '—')}
          </strong>
        </div>
      </div>

      {volleyball && (
        <VolleyballBreakdown
          match={match}
          periods={periodScores}
          homeAbbr={homeAbbr}
          awayAbbr={awayAbbr}
        />
      )}

      {volleyball && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#64748b',
            textAlign: 'right',
            marginTop: 7,
          }}
        >
          MAIN SCORE = SETS WON
        </div>
      )}

      <div className="home-match-info">
        <span>
          <CalendarDays size={14} />
          {formatDate(getMatchDate(match))}
        </span>

        <span>
          <MapPin size={14} />
          {venue}
        </span>
      </div>

      <Link
        to={`/matches/${match.id}`}
        className="home-match-action"
      >
        <span>
          {isLive
            ? 'View Live Score'
            : isPaused
              ? 'View Match Score'
              : isFinal
                ? 'Match Summary'
                : 'View Match Details'}
        </span>

        <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export default function HomePage() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [periodScores, setPeriodScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [teamResult, matchResult] = await Promise.all([
        getTeams({ limit: 200 }),
        getMatches({ limit: 200 }),
      ]);

      if (teamResult.error) {
        throw new Error(teamResult.error.message);
      }

      if (matchResult.error) {
        throw new Error(matchResult.error.message);
      }

      const teamData = teamResult.data || [];
      const matchData = matchResult.data || [];

      setTeams(teamData);
      setMatches(matchData);

      const volleyballMatches = matchData.filter(isVolleyball);

      if (volleyballMatches.length > 0) {
        const ids = volleyballMatches.map((match) => match.id);

        const { data, error: periodError } = await supabase
          .from('match_period_scores')
          .select('*')
          .in('match_id', ids)
          .order('period_number', { ascending: true });

        if (periodError) throw periodError;

        const grouped = {};

        (data || []).forEach((period) => {
          if (!grouped[period.match_id]) {
            grouped[period.match_id] = [];
          }

          grouped[period.match_id].push(period);
        });

        setPeriodScores(grouped);
      } else {
        setPeriodScores({});
      }

      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load teams and matches.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const intervalId = window.setInterval(() => {
      loadData(true);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  const liveMatches = matches.filter((match) =>
    ['in_progress', 'paused'].includes(
      String(match.status || '').toLowerCase()
    )
  );

  const upcomingMatches = matches
    .filter((match) =>
      ['scheduled', 'upcoming', 'pending'].includes(
        String(match.status || '').toLowerCase()
      )
    )
    .sort((a, b) => {
      const dateA = getMatchDate(a);
      const dateB = getMatchDate(b);

      if (!dateA) return 1;
      if (!dateB) return -1;

      return new Date(dateA) - new Date(dateB);
    });

  const completedMatches = matches
    .filter((match) =>
      ['completed', 'finished'].includes(
        String(match.status || '').toLowerCase()
      )
    )
    .sort((a, b) => {
      const dateA = getMatchDate(a);
      const dateB = getMatchDate(b);

      if (!dateA) return 1;
      if (!dateB) return -1;

      return new Date(dateB) - new Date(dateA);
    });

  const renderMatches = (items) => (
    <div className="home-matches-grid">
      {items.slice(0, 4).map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          periodScores={periodScores[match.id] || []}
        />
      ))}
    </div>
  );

  return (
    <main className="simple-home">
      
<header className="palaro-header">
  <div className="palaro-light palaro-light-left" />
  <div className="palaro-light palaro-light-right" />

  <div className="palaro-hero-content">
    <div className="palaro-institution">
      <div className="palaro-institution-seal">
        LCC
      </div>

      <div>
        <strong>LIPA CITY COLLEGES</strong>
        <span>STUDENT AFFAIRS OFFICE</span>
        <span>CENTRAL STUDENT GOVERNMENT</span>
      </div>
    </div>

    <div className="palaro-title-banner">
      <span className="palaro-title-text">
        LCC <em>PALARO</em>
      </span>
      <span className="palaro-flame"></span>
    </div>

    <p className="palaro-motto">
      CONQUER. SHAPING LCCIAN EXCELLENCE
      <br />
      THROUGH SPORTS AND COLLABORATION
    </p>

    <div className="palaro-year">
      <span />
      2026
      <span />
    </div>
  </div>
</header>


      {/* COMPETING TEAMS */}
      <section className="home-teams-section featured-teams-section">
        <div className="home-section-heading teams-heading-hero">
          <div>
            <span className="home-eyebrow eyebrow-highlight">
              <Sparkles size={16} />
              CHAMPIONSHIP CONTENDERS
            </span>

            <h2 className="teams-hero-title">COMPETING TEAMS</h2>

            <p className="teams-hero-sub">
              Select your team to check stats, schedule, and roster
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : error && teams.length === 0 ? (
          <p className="home-error">{error}</p>
        ) : teams.length > 0 ? (
          <div className="home-teams-grid featured-teams-grid">
            {teams.map((team) => (
              <Link
                to={`/teams/${team.id}`}
                className="home-team-card featured-team-card"
                key={team.id}
                style={{
                  '--team-color': team.primary_color || '#3b82f6',
                }}
              >
                <div className="team-card-glow" />

                <TeamLogo team={team} size="hero" />

                <div className="home-team-card-info">
                  <h2>{team.name || 'Unnamed Team'}</h2>

                  <span className="home-team-link">
                    Explore Team Roster
                    <ChevronRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No teams available"
            description="Team logos and profiles will appear here once registered."
          />
        )}
      </section>

      {/* LIVE SCORES */}
      <section className="home-games-section" id="live-scores">
        <div className="home-section-heading home-games-heading">
          <div>
            <span className="home-eyebrow live-eyebrow">
              <Radio size={14} className="pulse-icon" />
              MATCH CENTER
            </span>

            <h2>
              Live Games <span className="home-blue-dot">.</span>
            </h2>
          </div>

          <button
            type="button"
            className="home-refresh"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'home-spinning' : ''}
            />

            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : liveMatches.length > 0 ? (
          renderMatches(liveMatches)
        ) : (
          <div className="home-no-live">
            <span className="home-no-live-icon">
              <Swords size={28} />
            </span>

            <div>
              <strong>No active games right now.</strong>

              <p>
                Check out upcoming schedules to plan your next match day.
              </p>
            </div>
          </div>
        )}

        <div className="home-view-all">
          <Link to="/schedule" className="btn-secondary">
            View all matches <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* UPCOMING MATCHES */}
      <section className="home-games-section">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">
              <CalendarDays size={14} />
              SCHEDULE
            </span>

            <h2>
              Upcoming Matches <span className="home-blue-dot">.</span>
            </h2>
          </div>

          <Link to="/schedule" className="home-heading-link">
            Full Schedule <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <LoadingState />
        ) : upcomingMatches.length > 0 ? (
          renderMatches(upcomingMatches)
        ) : (
          <div className="home-empty-message">
            No upcoming games scheduled yet.
          </div>
        )}
      </section>

      {/* RECENT RESULTS */}
      <section className="home-games-section">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">
              <Medal size={14} />
              SCOREBOARD
            </span>

            <h2>
              Recent Results <span className="home-blue-dot">.</span>
            </h2>
          </div>

          <Link to="/results" className="home-heading-link">
            All Results <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <LoadingState />
        ) : completedMatches.length > 0 ? (
          renderMatches(completedMatches)
        ) : (
          <div className="home-empty-message">
            No completed matches found.
          </div>
        )}
      </section>

      {error && teams.length > 0 && (
        <p className="home-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}