
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import StatusPill from '../../components/common/StatusPill';
import Notice from '../../components/common/Notice';

import { listRecords } from '../../services/dataService';
import { formatDateTime, titleCase } from '../../lib/formatters';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    try {
      const select =
        kind === 'matches'
          ? '*, sport:sports(name), home_team:teams!matches_home_team_id_fkey(name,abbreviation,logo_url), away_team:teams!matches_away_team_id_fkey(name,abbreviation,logo_url), venue:venues(name)'
          : kind === 'players'
            ? '*, team:teams(name)'
            : '*';

      const result = await listRecords(table, {
        select,
        filters: { id },
        limit: 1,
      });

      if (result.error) {
        throw result.error;
      }

      setRecord(result.data?.[0] || null);
    } catch (err) {
      setRecord(null);
      setError(err?.message || 'Unable to load this record.');
    } finally {
      setLoading(false);
    }
  }, [id, kind, table]);

  useEffect(() => {
    let active = true;

    async function loadRecord() {
      setLoading(true);
      setError('');

      try {
        const select =
          kind === 'matches'
            ? '*, sport:sports(name), home_team:teams!matches_home_team_id_fkey(name,abbreviation,logo_url), away_team:teams!matches_away_team_id_fkey(name,abbreviation,logo_url), venue:venues(name)'
            : kind === 'players'
              ? '*, team:teams(name)'
              : '*';

        const result = await listRecords(table, {
          select,
          filters: { id },
          limit: 1,
        });

        if (result.error) throw result.error;

        if (active) {
          setRecord(result.data?.[0] || null);
        }
      } catch (err) {
        if (active) {
          setRecord(null);
          setError(err?.message || 'Unable to load this record.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecord();

    return () => {
      active = false;
    };
  }, [id, kind, table]);

  useRealtimeTable(table, load);

  if (loading) {
    return (
      <div className="container page-container">
        <LoadingState />
      </div>
    );
  }

  if (error) {
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

          <div className="match-detail-score">
            <div>
              <span className="detail-team-logo">
                {record.home_team?.logo_url ? (
                  <img
                    src={record.home_team.logo_url}
                    alt={`${record.home_team.name || 'Home team'} logo`}
                  />
                ) : (
                  <Trophy size={30} />
                )}
              </span>

              <h2>{record.home_team?.name || 'TBD'}</h2>
              <small>HOME</small>
            </div>

            <div className="detail-score-numbers">
              <strong>{record.home_score ?? '—'}</strong>
              <span>:</span>
              <strong>{record.away_score ?? '—'}</strong>
            </div>

            <div>
              <span className="detail-team-logo">
                {record.away_team?.logo_url ? (
                  <img
                    src={record.away_team.logo_url}
                    alt={`${record.away_team.name || 'Away team'} logo`}
                  />
                ) : (
                  <Trophy size={30} />
                )}
              </span>

              <h2>{record.away_team?.name || 'TBD'}</h2>
              <small>AWAY</small>
            </div>
          </div>

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
            {record.status === 'in_progress'
              ? 'This match is currently in progress. The scoreboard updates when official score events are recorded.'
              : record.status === 'completed'
                ? 'This match has been marked complete by the organizers.'
                : 'Match updates and official results will appear here.'}
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
