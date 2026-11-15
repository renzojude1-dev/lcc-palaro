
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  Medal,
  Radio,
  Users,
  Trophy,
  ArrowRight,
  Plus,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import Notice from '../../components/common/Notice';
import EmptyState from '../../components/common/EmptyState';
import StatusPill from '../../components/common/StatusPill';

import { listRecords } from '../../services/dataService';
import { getMatches } from '../../services/matchesService';
import { formatDateTime } from '../../lib/formatters';

export default function DashboardPage() {
  const [data, setData] = useState({
    sports: [],
    teams: [],
    players: [],
    matches: [],
    audit: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const results = await Promise.all([
          listRecords('sports', { limit: 100 }),
          listRecords('teams', { limit: 100 }),
          listRecords('players', { limit: 500 }),
          getMatches({
            orderBy: 'scheduled_at',
            ascending: true,
            limit: 300,
          }),
          listRecords('audit_logs', {
            orderBy: 'created_at',
            limit: 8,
          }),
        ]);

        if (!active) return;

        const [
          sportsResult,
          teamsResult,
          playersResult,
          matchesResult,
          auditResult,
        ] = results;

        setData({
          sports: sportsResult.data || [],
          teams: teamsResult.data || [],
          players: playersResult.data || [],
          matches: matchesResult.data || [],
          audit: auditResult.data || [],
        });

        const errors = results
          .filter((result) => result.error)
          .map((result) => result.error.message);

        if (errors.length > 0) {
          setError([...new Set(errors)].join(' '));
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message || 'Unable to load the dashboard.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const matches = data.matches || [];

  const cards = [
    [
      'Sports & games',
      data.sports.length,
      Trophy,
      '/admin/sports',
    ],
    [
      'Participating teams',
      data.teams.length,
      Users,
      '/admin/teams',
    ],
    [
      'Registered athletes',
      data.players.length,
      Medal,
      '/admin/players',
    ],
    [
      'Scheduled matches',
      matches.filter((match) => match.status === 'scheduled').length,
      CalendarDays,
      '/admin/schedules',
    ],
    [
      'Live matches',
      matches.filter((match) => match.status === 'in_progress').length,
      Radio,
      '/admin/matches',
    ],
    [
      'Completed matches',
      matches.filter((match) => match.status === 'completed').length,
      ClipboardList,
      '/admin/results',
    ],
  ];

  const upcomingMatches = matches
    .filter((match) => match.status === 'scheduled')
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="EVENT CONTROL"
        title="Dashboard"
        description="A real-time overview of the LCC Palaro competition."
        actions={
          <Link to="/admin/matches" className="button button-dark">
            <Plus size={16} />
            Manage matches
          </Link>
        }
      />

      {error && <Notice type="error">{error}</Notice>}

      {loading ? (
        <LoadingState label="Loading dashboard..." />
      ) : (
        <>
          <div className="admin-stat-grid">
            {cards.map(([label, value, Icon, to]) => (
              <Link
                className="admin-stat-card"
                to={to}
                key={label}
              >
                <span className="admin-stat-icon">
                  <Icon size={19} />
                </span>

                <span className="admin-stat-value">
                  {value}
                </span>

                <span className="admin-stat-label">
                  {label}
                </span>

                <ArrowRight
                  className="admin-stat-arrow"
                  size={16}
                />
              </Link>
            ))}
          </div>

          <div className="dashboard-columns">
            <section className="admin-panel">
              <div className="panel-heading">
                <div>
                  <h2>Upcoming fixtures</h2>
                  <p>Next scheduled matches</p>
                </div>

                <Link to="/admin/schedules">
                  View all <ArrowRight size={14} />
                </Link>
              </div>

              {upcomingMatches.map((match) => (
                <div
                  className="admin-match-row"
                  key={match.id}
                >
                  <span className="admin-match-date">
                    {match.scheduled_at
                      ? new Date(
                          match.scheduled_at
                        ).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'Asia/Manila',
                        })
                      : 'TBA'}
                  </span>

                  <span>
                    <b>
                      {match.home_team?.name || 'Team TBD'} vs{' '}
                      {match.away_team?.name || 'Team TBD'}
                    </b>

                    <small>
                      {match.sport?.name || 'Sport'} ·{' '}
                      {formatDateTime(match.scheduled_at)}
                    </small>
                  </span>

                  <StatusPill status={match.status} />
                </div>
              ))}

              {upcomingMatches.length === 0 && (
                <EmptyState
                  title="No upcoming fixtures"
                  description="Create a match to start building the schedule."
                  action={
                    <Link
                      to="/admin/schedules"
                      className="button button-light"
                    >
                      Create schedule
                    </Link>
                  }
                />
              )}
            </section>

            <section className="admin-panel">
              <div className="panel-heading">
                <div>
                  <h2>Quick actions</h2>
                  <p>Common organizer tasks</p>
                </div>
              </div>

              <div className="quick-actions">
                <Link to="/admin/sports">
                  <Trophy />
                  <span>
                    <b>Add a sport or game</b>
                    <small>Configure competition rules</small>
                  </span>
                  <ArrowRight />
                </Link>

                <Link to="/admin/teams">
                  <Users />
                  <span>
                    <b>Register a team</b>
                    <small>Manage delegations</small>
                  </span>
                  <ArrowRight />
                </Link>

                <Link to="/admin/players">
                  <Medal />
                  <span>
                    <b>Register an athlete</b>
                    <small>Build team rosters</small>
                  </span>
                  <ArrowRight />
                </Link>

                <Link to="/admin/news">
                  <ClipboardList />
                  <span>
                    <b>Publish an announcement</b>
                    <small>Keep participants informed</small>
                  </span>
                  <ArrowRight />
                </Link>
              </div>
            </section>
          </div>

          <section className="admin-panel audit-preview">
            <div className="panel-heading">
              <div>
                <h2>Recent administrative activity</h2>
                <p>Latest recorded actions</p>
              </div>

              <Link to="/admin/audit-log">
                Full audit log <ArrowRight size={14} />
              </Link>
            </div>

            {data.audit.length > 0 ? (
              data.audit.map((item) => (
                <div className="audit-row" key={item.id}>
                  <span className="audit-dot" />

                  <span>
                    <b>{item.action}</b>
                    <small>
                      {item.entity_type || 'Record'} ·{' '}
                      {item.created_at
                        ? formatDateTime(item.created_at)
                        : ''}
                    </small>
                  </span>

                  <span>
                    {item.actor_email || 'Administrator'}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                title="No activity recorded yet"
                description="Important administrative actions will be logged here."
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
