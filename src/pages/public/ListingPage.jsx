
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Search,
  Filter,
  Trophy,
  Medal,
  Gamepad2,
  Dumbbell,
  Sparkles,
  ChevronRight,
  Users,
  RotateCcw,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import Notice from '../../components/common/Notice';
import MatchCard from '../../components/ui/MatchCard';
import StatusPill from '../../components/common/StatusPill';

import { listRecords } from '../../services/dataService';
import { getMatches } from '../../services/matchesService';
import { getTeams } from '../../services/teamsService';
import { getPlayers } from '../../services/playersService';
import { getStandings } from '../../services/standingsService';

import {
  formatDateTime,
  titleCase,
} from '../../lib/formatters';

const config = {
  sports: {
    title: 'Sports & Board Games',
    desc: 'Explore the competitions featured at LCC Palaro.',
    table: 'sports',
  },
  teams: {
    title: 'Participating Teams',
    desc: 'Discover the delegations representing the LCC community.',
  },
  athletes: {
    title: 'Athletes',
    desc: 'Meet the athletes competing across Palaro events.',
  },
  schedule: {
    title: 'Match Schedule',
    desc: 'Find upcoming fixtures, venues, and match times.',
  },
  results: {
    title: 'Match Results',
    desc: 'Browse completed games and official results.',
  },
  brackets: {
    title: 'Tournament Brackets',
    desc: 'Follow each tournament stage from opening round to final.',
    table: 'tournament_stages',
  },
  standings: {
    title: 'Rankings & Standings',
    desc: 'Track team performance as results are finalized.',
  },
  news: {
    title: 'News & Announcements',
    desc: 'Updates and important information from the Palaro organizers.',
    table: 'announcements',
    filters: { status: 'published' },
  },
  about: {
    title: 'About LCC Palaro',
    desc: 'A celebration of campus spirit, teamwork, and friendly competition.',
  },
};

const gold = '#f2bd48';
const navy = '#101827';

const sportStyle = {
  page: {
    maxWidth: 'none',
    margin: 0,
    padding: '0 0 72px',
    color: '#f8fafc',
    background: '#0b111d',
    minHeight: '100vh',
  },
  hero: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(220px, .65fr)',
    alignItems: 'center',
    gap: 30,
    overflow: 'hidden',
    padding: 'clamp(30px, 6vw, 76px) max(24px, calc((100% - 1120px) / 2))',
    background: 'linear-gradient(120deg, #111c30 0%, #101827 60%, #1d293b 100%)',
    borderBottom: '1px solid #2a3548',
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: gold,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '2px',
  },
  title: {
    margin: '22px 0 16px',
    maxWidth: 650,
    fontSize: 'clamp(36px, 5.5vw, 66px)',
    lineHeight: 1.02,
    letterSpacing: '-2.5px',
    fontWeight: 950,
    color: '#ffffff',
  },
  paragraph: {
    maxWidth: 490,
    color: '#b2bdcd',
    fontSize: 14,
    lineHeight: 1.9,
    margin: 0,
  },
  heroStats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 22,
    marginTop: 28,
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 650,
  },
  art: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    minHeight: 250,
  },
  artCircle: {
    display: 'grid',
    placeItems: 'center',
    width: 'min(220px, 75%)',
    aspectRatio: '1',
    borderRadius: '50%',
    color: gold,
    background: 'radial-gradient(circle, #29364b 0%, #172236 62%, #121b2a 100%)',
    border: '1px solid #465168',
    boxShadow: '0 0 0 22px rgba(255,255,255,.025), 0 0 0 44px rgba(255,255,255,.018)',
  },
  artTag: {
    position: 'absolute',
    right: '3%',
    bottom: 10,
    padding: '10px 15px',
    background: gold,
    color: '#172033',
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: '1.5px',
    transform: 'rotate(-4deg)',
  },
  section: {
    maxWidth: 1120,
    margin: '0 auto',
    padding: '38px 24px 0',
  },
  sectionTop: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'end',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 23,
  },
  sectionLabel: {
    display: 'block',
    color: gold,
    fontSize: 10,
    fontWeight: 850,
    letterSpacing: '2px',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 'clamp(23px, 3vw, 31px)',
    letterSpacing: '-.8px',
    fontWeight: 850,
    margin: 0,
  },
  sectionDescription: {
    margin: '8px 0 0',
    color: '#9ba8bb',
    fontSize: 13,
  },
  count: {
    color: '#c6cfdd',
    fontSize: 12,
    padding: '9px 12px',
    border: '1px solid #303b4e',
    borderRadius: 7,
    background: '#141d2c',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  search: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: '1 1 260px',
    minWidth: 0,
    minHeight: 47,
    padding: '0 15px',
    borderRadius: 8,
    border: '1px solid #354154',
    background: '#151f30',
    color: '#9ba8bb',
  },
  input: {
    width: '100%',
    minWidth: 0,
    outline: 'none',
    border: 0,
    background: 'transparent',
    color: '#f8fafc',
    fontSize: 13,
  },
  filter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 45,
    padding: '0 12px',
    color: '#e2e8f0',
    background: '#151f30',
    border: '1px solid #354154',
    borderRadius: 8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 285px), 1fr))',
    gap: 15,
  },
  card: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    minWidth: 0,
    padding: '20px 17px',
    color: '#f8fafc',
    textDecoration: 'none',
    background: 'linear-gradient(145deg, #182335, #131c2b)',
    border: '1px solid #303b4e',
    borderRadius: 12,
    transition: 'transform .18s ease, border-color .18s ease, background .18s ease',
  },
  iconBox: {
    flex: '0 0 54px',
    width: 54,
    height: 54,
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    color: gold,
    background: '#273044',
    border: '1px solid #414a5a',
    borderRadius: 10,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardLabel: {
    display: 'block',
    color: gold,
    fontSize: 9,
    fontWeight: 850,
    letterSpacing: '1.1px',
    marginBottom: 7,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 1.35,
    fontWeight: 800,
    margin: 0,
    overflowWrap: 'anywhere',
  },
  cardDescription: {
    color: '#a2aec0',
    fontSize: 11,
    lineHeight: 1.6,
    margin: '7px 0 0',
  },
  cardArrow: {
    flex: '0 0 auto',
    color: '#9ba8bb',
  },
  bottomLine: {
    height: 3,
    width: 34,
    marginTop: 12,
    background: gold,
    borderRadius: 4,
  },
};

function getRecordName(record, type) {
  if (type === 'athletes') {
    return (
      `${record.first_name || ''} ${record.last_name || ''}`.trim() ||
      'Unnamed athlete'
    );
  }

  return record.name || record.title || 'Untitled record';
}

function getSearchableText(record) {
  return [
    record.name,
    record.title,
    record.first_name,
    record.last_name,
    record.abbreviation,
    record.description,
    record.delegation,
    record.course,
    record.position,
    record.category,
    record.sport?.name,
    record.team?.name,
    record.home_team?.name,
    record.away_team?.name,
    record.venue?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getSportIcon(record) {
  const text = [
    record.name,
    record.title,
    record.category,
    record.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    text.includes('chess') ||
    text.includes('board') ||
    text.includes('scrabble')
  ) {
    return Gamepad2;
  }

  if (
    text.includes('fitness') ||
    text.includes('weightlifting') ||
    text.includes('gym')
  ) {
    return Dumbbell;
  }

  if (
    text.includes('basketball') ||
    text.includes('volleyball') ||
    text.includes('football') ||
    text.includes('badminton')
  ) {
    return Trophy;
  }

  return Medal;
}

export default function ListingPage({ type: routeType }) {
  const params = useParams();
  const type = routeType || params.type || 'sports';
  const pageConfig = config[type] || config.sports;
  const isSportsPage = type === 'sports';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sportId, setSportId] = useState('all');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let result;

      if (type === 'teams') {
        result = await getTeams({ limit: 200 });
      } else if (type === 'athletes') {
        result = await getPlayers({ limit: 200 });
      } else if (type === 'schedule' || type === 'results') {
        result = await getMatches({ limit: 300 });
      } else if (type === 'standings') {
        result = await getStandings({ limit: 200 });
      } else {
        result = await listRecords(pageConfig.table || 'tournament_stages', {
          filters: pageConfig.filters || {},
          limit: 200,
          orderBy: 'created_at',
        });
      }

      if (result?.error) throw result.error;

      setRows(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || 'Unable to load records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [type, pageConfig]);

  useEffect(() => {
    let active = true;

    async function fetchRecords() {
      setLoading(true);
      setError('');

      try {
        let result;

        if (type === 'teams') {
          result = await getTeams({ limit: 200 });
        } else if (type === 'athletes') {
          result = await getPlayers({ limit: 200 });
        } else if (type === 'schedule' || type === 'results') {
          result = await getMatches({ limit: 300 });
        } else if (type === 'standings') {
          result = await getStandings({ limit: 200 });
        } else {
          result = await listRecords(pageConfig.table || 'tournament_stages', {
            filters: pageConfig.filters || {},
            limit: 200,
            orderBy: 'created_at',
          });
        }

        if (result?.error) throw result.error;

        if (active) {
          setRows(Array.isArray(result?.data) ? result.data : []);
        }
      } catch (err) {
        if (active) {
          setRows([]);
          setError(err?.message || 'Unable to load records. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchRecords();

    return () => {
      active = false;
    };
  }, [type, pageConfig]);

  const availableSports = useMemo(() => {
    const sports = new Map();

    rows.forEach((record) => {
      if (record.sport?.name && record.sport_id) {
        sports.set(record.sport_id, record.sport);
      }
    });

    return [...sports.entries()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((record) => {
      const matchesSearch = getSearchableText(record).includes(
        search.trim().toLowerCase()
      );

      const matchesStatus =
        status === 'all' || record.status === status;

      const matchesSport =
        sportId === 'all' ||
        String(record.sport_id) === String(sportId);

      const matchesResults =
        type !== 'results' || record.status === 'completed';

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSport &&
        matchesResults
      );
    });
  }, [rows, search, status, sportId, type]);

  const statusOptions =
    type === 'results'
      ? ['completed']
      : ['scheduled', 'in_progress', 'paused', 'postponed', 'cancelled'];

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setSportId('all');
  };

  if (type === 'about') {
    return (
      <div className="container page-container">
        <PageHeader
          eyebrow="LCC PALARO"
          title={pageConfig.title}
          description={pageConfig.desc}
        />

        <div className="prose-card">
          <h2>Competition with purpose</h2>
          <p>
            LCC Palaro brings the Lipa City Colleges community together
            through sports, board games, and shared school pride. This
            event hub makes schedules, results, team information, and
            announcements easy to find.
          </p>
          <p>
            Event dates, competition rules, and official details will be
            published here by authorized organizers as they are confirmed.
          </p>
          <Link to="/schedule" className="button button-dark">
            View the schedule <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (isSportsPage) {
    return (
      <main style={sportStyle.page}>
        <section style={sportStyle.hero}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={sportStyle.eyebrow}>
              <Sparkles size={14} />
              LIPA CITY COLLEGES · OFFICIAL EVENT HUB
            </span>

            <h1 style={sportStyle.title}>
              PLAY WITH
              <br />
              <span style={{ color: gold }}>PRIDE.</span>
            </h1>

            <p style={sportStyle.paragraph}>
              Celebrate skill, teamwork, and campus spirit.
              Find your competition and be part of the LCC Palaro.
            </p>

            <div style={sportStyle.heroStats}>
              <div style={sportStyle.stat}>
                <Trophy size={18} color={gold} />
                <span>Sports &amp; board games</span>
              </div>
              <div style={sportStyle.stat}>
                <Users size={18} color={gold} />
                <span>One LCC community</span>
              </div>
            </div>
          </div>

          <div style={sportStyle.art} aria-hidden="true">
            <div style={sportStyle.artCircle}>
              <Trophy size={94} strokeWidth={1.15} />
            </div>
            <div style={sportStyle.artTag}>LCC PALARO</div>
          </div>
        </section>

        <section style={sportStyle.section}>
          <div style={sportStyle.sectionTop}>
            <div>
              <span style={sportStyle.sectionLabel}>THE LINEUP</span>
              <h2 style={sportStyle.sectionTitle}>Find your competition.</h2>
              <p style={sportStyle.sectionDescription}>
                Explore the available sports and board games.
              </p>
            </div>

            <span style={sportStyle.count}>
              {loading ? 'Loading competitions…' : `${filteredRows.length} competitions`}
            </span>
          </div>

          {error && <Notice>{error}</Notice>}

          <div style={sportStyle.toolbar}>
            <label style={sportStyle.search}>
              <Search size={18} />
              <input
                style={sportStyle.input}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search sports and board games..."
                aria-label="Search sports and board games"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    border: 0,
                    background: 'transparent',
                    color: '#aab5c6',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={15} />
                </button>
              )}
            </label>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <EmptyState
              title="Unable to load competitions"
              description="Please check your connection and try again."
              action={
                <button
                  type="button"
                  className="button button-dark"
                  onClick={loadRecords}
                >
                  Try again
                </button>
              }
            />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title={search ? 'No matching competitions' : 'No competitions published yet'}
              description={
                search
                  ? 'Try another search term.'
                  : 'Sports and board games will appear here once organizers add them.'
              }
              action={
                search && (
                  <button
                    type="button"
                    className="button button-dark"
                    onClick={clearFilters}
                  >
                    Clear search
                  </button>
                )
              }
            />
          ) : (
            <div style={sportStyle.grid}>
              {filteredRows.map((record, index) => {
                const name = getRecordName(record, type);
                const SportIcon = getSportIcon(record);
                const description =
                  record.description ||
                  (record.category && titleCase(record.category)) ||
                  record.abbreviation ||
                  'Discover this competition';

                return (
                  <Link
                    key={record.id}
                    to={`/sports/${record.id}`}
                    style={sportStyle.card}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.transform = 'translateY(-3px)';
                      event.currentTarget.style.borderColor = gold;
                      event.currentTarget.style.background = '#1c293c';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform = 'translateY(0)';
                      event.currentTarget.style.borderColor = '#303b4e';
                      event.currentTarget.style.background =
                        'linear-gradient(145deg, #182335, #131c2b)';
                    }}
                  >
                    <span style={sportStyle.iconBox}>
                      {record.logo_url ? (
                        <img
                          src={record.logo_url}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <SportIcon size={28} strokeWidth={1.6} />
                      )}
                    </span>

                    <div style={sportStyle.cardBody}>
                      <span style={sportStyle.cardLabel}>
                        COMPETITION {String(index + 1).padStart(2, '0')}
                      </span>

                      <h3 style={sportStyle.cardTitle}>{name}</h3>
                      <p style={sportStyle.cardDescription}>{description}</p>
                      <div style={sportStyle.bottomLine} />
                    </div>

                    <span style={sportStyle.cardArrow}>
                      <ChevronRight size={21} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="container page-container">
      <PageHeader
        eyebrow="LCC PALARO"
        title={pageConfig.title}
        description={pageConfig.desc}
      />

      {error && <Notice>{error}</Notice>}

      <div className="listing-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${pageConfig.title.toLowerCase()}…`}
            aria-label={`Search ${pageConfig.title.toLowerCase()}`}
          />
        </label>

        {(type === 'schedule' || type === 'results') && (
          <>
            <label className="select-field">
              <Filter size={16} />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by match status"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <select
                value={sportId}
                onChange={(event) => setSportId(event.target.value)}
                aria-label="Filter by sport"
              >
                <option value="all">All sports</option>
                {availableSports.map(([id, sport]) => (
                  <option value={id} key={id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          title="Unable to load information"
          description="Please check your connection and try again."
          action={
            <button
              type="button"
              className="button button-dark"
              onClick={loadRecords}
            >
              Try again
            </button>
          }
        />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          title={
            search || status !== 'all' || sportId !== 'all'
              ? 'No matching records'
              : 'Nothing published yet'
          }
          description={
            search || status !== 'all' || sportId !== 'all'
              ? 'Try another search term or clear your filters.'
              : 'Official information will appear here once organizers add and publish records.'
          }
          action={
            (search || status !== 'all' || sportId !== 'all') && (
              <button
                type="button"
                className="button button-dark"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <>
          {(type === 'schedule' || type === 'results') && (
            <div className="match-grid">
              {filteredRows.map((match) => (
                <MatchCard match={match} key={match.id} />
              ))}
            </div>
          )}

          {type === 'standings' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Played</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>For</th>
                    <th>Against</th>
                    <th>Diff</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((record, index) => (
                    <tr key={record.id}>
                      <td>
                        <span className={`rank rank-${index + 1}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td>
                        <b>{record.team?.name || 'Team'}</b>
                        <small className="cell-sub">
                          {record.sport?.name || ''}
                        </small>
                      </td>
                      <td>{record.played ?? 0}</td>
                      <td>{record.wins ?? 0}</td>
                      <td>{record.draws ?? 0}</td>
                      <td>{record.losses ?? 0}</td>
                      <td>{record.scored ?? 0}</td>
                      <td>{record.conceded ?? 0}</td>
                      <td>{record.difference ?? 0}</td>
                      <td><b>{record.points ?? 0}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === 'news' && (
            <div className="news-grid">
              {filteredRows.map((announcement) => (
                <article className="news-card" key={announcement.id}>
                  {announcement.image_url && (
                    <img
                      src={announcement.image_url}
                      alt={announcement.title || 'Announcement'}
                    />
                  )}
                  <span className="eyebrow">ANNOUNCEMENT</span>
                  <h3>{announcement.title}</h3>
                  <p>{announcement.body}</p>
                  <small>{formatDateTime(announcement.published_at)}</small>
                </article>
              ))}
            </div>
          )}

          {!['schedule', 'results', 'standings', 'news'].includes(type) && (
            <div className="directory-grid">
              {filteredRows.map((record) => {
                const name = getRecordName(record, type);

                const detailPath =
                  type === 'teams'
                    ? `/teams/${record.id}`
                    : type === 'athletes'
                      ? `/athletes/${record.id}`
                      : null;

                const content = (
                  <>
                    <span
                      className="directory-symbol"
                      style={{
                        '--team-color': record.primary_color || '#edb83e',
                      }}
                    >
                      {record.logo_url ? (
                        <img src={record.logo_url} alt="" />
                      ) : record.first_name ? (
                        `${record.first_name[0]}${record.last_name?.[0] || ''}`
                      ) : (
                        (record.abbreviation || name || 'LCC').slice(0, 3)
                      )}
                    </span>

                    <div>
                      <h3>{name}</h3>
                      <p>
                        {record.delegation ||
                          record.course ||
                          (record.category && titleCase(record.category)) ||
                          record.position ||
                          record.description ||
                          record.abbreviation ||
                          'LCC Palaro'}
                      </p>
                      {record.status && <StatusPill status={record.status} />}
                    </div>

                    <ArrowRight size={17} />
                  </>
                );

                return detailPath ? (
                  <Link
                    className="directory-card"
                    to={detailPath}
                    key={record.id}
                  >
                    {content}
                  </Link>
                ) : (
                  <article className="directory-card" key={record.id}>
                    {content}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
