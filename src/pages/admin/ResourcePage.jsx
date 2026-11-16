
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Save, RefreshCw,
} from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import Notice from '../../components/common/Notice';
import {
  listRecords, saveRecord, deleteRecord, uploadImage,
} from '../../services/dataService';
import { validateImage, required } from '../../lib/validation';
import { supabase } from '../../lib/supabase';
import { generateBracket } from '../../services/bracketsService';
import { titleCase, formatDateTime } from '../../lib/formatters';

const resources = {
  sports: {
    title: 'Sports & board games',
    description: 'Configure the competitions available in the event.',
    table: 'sports',
    fields: [
      ['name', 'Sport / game name', 'text', true],
      ['category', 'Category', 'select', true, ['team_sport', 'individual_sport', 'board_game', 'esport']],
      ['description', 'Description', 'textarea'],
      ['competition_format', 'Competition format', 'select', false, ['single_elimination', 'double_elimination', 'round_robin', 'group_knockout']],
      ['scoring_method', 'Scoring method', 'text'],
      ['status', 'Status', 'select', true, ['draft', 'published', 'archived']],
    ],
  },

  teams: {
    title: 'Teams',
    description: 'Manage delegations, branding, and registration status.',
    table: 'teams',
    fields: [
      ['name', 'Team name', 'text', true],
      ['abbreviation', 'Abbreviation', 'text', true],
      ['primary_color', 'Primary color', 'color'],
      ['delegation', 'Course / department / delegation', 'text'],
      ['coach_name', 'Coach or representative', 'text'],
      ['status', 'Registration status', 'select', true, ['draft', 'registered', 'approved', 'withdrawn']],
      ['logo_url', 'Team logo', 'image'],
      ['banner_url', 'Team banner', 'image'],
    ],
  },

  players: {
    title: 'Athletes & players',
    description: 'Register athletes and manage eligibility and team assignments.',
    table: 'players',
    fields: [
      ['first_name', 'First name', 'text', true],
      ['last_name', 'Last name', 'text', true],
      ['team_id', 'Team', 'team-select'],
      ['jersey_number', 'Jersey number', 'number'],
      ['position', 'Position', 'text'],
      ['course', 'Course / department', 'text'],
      ['eligibility_status', 'Eligibility', 'select', true, ['pending', 'eligible', 'ineligible']],
      ['public_profile', 'Show public profile', 'checkbox'],
      ['photo_url', 'Player photo', 'image'],
    ],
  },

  matches: {
    title: 'Matches & live scores',
    description: 'Create matches, enter venue names, and manage match schedules and scores.',
    table: 'matches',
    fields: [
      ['sport_id', 'Sport', 'sport-select', true],
      ['division', 'Division', 'select', true, ['Boys', 'Girls', 'Mixed', 'Open']],
      ['schedule_label', 'Game label', 'text'],
      ['home_team_id', 'Home team', 'team-select', true],
      ['away_team_id', 'Away team', 'team-select', true],
      ['scheduled_at', 'Scheduled date and time', 'datetime-local'],
      ['venue_name', 'Venue', 'text'],
      ['round_name', 'Round / stage', 'text'],
      ['status', 'Match status', 'select', true, ['scheduled', 'in_progress', 'paused', 'completed', 'postponed', 'cancelled']],
      ['home_score', 'Home score', 'number'],
      ['away_score', 'Away score', 'number'],
      ['is_published', 'Publish match publicly', 'checkbox'],
    ],
  },

  schedules: {
    title: 'Schedule management',
    description: 'Create and update fixtures, game labels, venues, and schedules.',
    table: 'matches',
    fields: [
      ['sport_id', 'Sport', 'sport-select', true],
      ['division', 'Division', 'select', true, ['Boys', 'Girls', 'Mixed', 'Open']],
      ['schedule_label', 'Game label', 'text'],
      ['home_team_id', 'Home team', 'team-select', true],
      ['away_team_id', 'Away team', 'team-select', true],
      ['scheduled_at', 'Date and time', 'datetime-local'],
      ['venue_name', 'Venue', 'text'],
      ['round_name', 'Round / stage', 'text'],
      ['status', 'Status', 'select', true, ['scheduled', 'postponed', 'cancelled']],
    ],
  },

  news: {
    title: 'News & announcements',
    description: 'Draft and publish updates for participants and spectators.',
    table: 'announcements',
    fields: [
      ['title', 'Announcement title', 'text', true],
      ['body', 'Body content', 'textarea', true],
      ['status', 'Publication status', 'select', true, ['draft', 'published', 'archived']],
      ['published_at', 'Publish date and time', 'datetime-local'],
      ['image_url', 'Featured image', 'image'],
    ],
  },

  settings: {
    title: 'Website settings',
    description: 'Control the event identity and public-facing information.',
    table: 'event_settings',
    single: true,
    fields: [
      ['event_title', 'Event title', 'text', true],
      ['academic_year', 'Academic year', 'text'],
      ['tagline', 'Theme / tagline', 'text'],
      ['event_dates_label', 'Event dates display', 'text'],
      ['primary_color', 'Primary color', 'color'],
      ['contact_email', 'Contact email', 'email'],
      ['logo_url', 'Website logo', 'image'],
      ['hero_image_url', 'Homepage hero image', 'image'],
    ],
  },

  'best-player': {
    title: 'Best Player of the Game',
    description: 'Record the official player selection for a completed match.',
    table: 'best_player_selections',
    fields: [
      ['match_id', 'Match ID', 'text', true],
      ['player_id', 'Player ID', 'text', true],
      ['selection_method', 'Selection method', 'select', true, ['manual', 'statistics']],
      ['reason', 'Reason / performance summary', 'textarea'],
      ['status', 'Status', 'select', true, ['draft', 'published']],
    ],
  },

  'audit-log': {
    title: 'Audit log',
    description: 'Review the history of important administrative actions.',
    table: 'audit_logs',
    readonly: true,
    fields: [],
  },

  brackets: {
    title: 'Tournament brackets',
    description: 'Review tournament stages and configured competition formats.',
    table: 'tournament_stages',
    fields: [
      ['sport_id', 'Sport ID', 'text', true],
      ['name', 'Stage name', 'text', true],
      ['stage_order', 'Stage order', 'number', true],
      ['format', 'Competition format', 'select', true, ['single_elimination', 'double_elimination', 'round_robin', 'group_knockout']],
      ['status', 'Status', 'select', true, ['draft', 'published', 'completed']],
    ],
  },

  standings: {
    title: 'Standings',
    description: 'Review stored standings and competition results.',
    table: 'standings',
    readonly: true,
    fields: [],
  },
};

const readonlyColumns = {
  'audit-log': [
    ['action', 'Action'],
    ['entity_type', 'Entity'],
    ['actor_email', 'Administrator'],
    ['created_at', 'Date'],
  ],

  standings: [
    ['team_id', 'Team ID'],
    ['sport_id', 'Sport ID'],
    ['played', 'Played'],
    ['won', 'Won'],
    ['drawn', 'Drawn'],
    ['lost', 'Lost'],
    ['points', 'Points'],
  ],
};

function inputValue(key, value) {
  if (value == null) return '';

  if (key === 'scheduled_at' || key === 'published_at') {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  return value;
}

function recordName(row) {
  return row.name ||
    row.title ||
    [row.first_name, row.last_name].filter(Boolean).join(' ') ||
    'this record';
}

function GenericResourcePage({ resource = 'sports' }) {
  const cfg = resources[resource] || resources.sports;

  const [rows, setRows] = useState([]);
  const [sports, setSports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [files, setFiles] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const previews = useRef([]);

  const isMatchResource =
    resource === 'matches' || resource === 'schedules';

  const clearPreviews = useCallback(() => {
    previews.current.forEach((url) => URL.revokeObjectURL(url));
    previews.current = [];
  }, []);

  useEffect(() => () => clearPreviews(), [clearPreviews]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await listRecords(cfg.table, {
        orderBy: 'created_at',
        limit: 500,
      });

      if (result.error) throw result.error;

      setRows(
        cfg.single
          ? (result.data || []).slice(0, 1)
          : result.data || []
      );
    } catch (err) {
      setRows([]);
      setError(err.message || `Unable to load ${cfg.title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [cfg.table, cfg.title, cfg.single]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Load dropdown options and venues directly from the database.
  const loadOptions = useCallback(async () => {
    const [sportResult, teamResult, venueResult] = await Promise.all([
      listRecords('sports', {
        orderBy: 'name',
        ascending: true,
        limit: 500,
      }),
      listRecords('teams', {
        orderBy: 'name',
        ascending: true,
        limit: 500,
      }),
      listRecords('venues', {
        orderBy: 'name',
        ascending: true,
        limit: 500,
      }),
    ]);

    if (sportResult.error) throw sportResult.error;
    if (teamResult.error) throw teamResult.error;
    if (venueResult.error) throw venueResult.error;

    setSports(sportResult.data || []);
    setTeams(teamResult.data || []);
    setVenues(venueResult.data || []);
  }, []);

  useEffect(() => {
    if (isMatchResource || resource === 'players') {
      loadOptions().catch((err) => {
        setError(err.message || 'Unable to load dropdown options.');
      });
    }
  }, [resource, isMatchResource, loadOptions, refreshKey]);

  // Resolve the typed venue name to a venue UUID.
  async function resolveVenueId(venueName) {
    const name = String(venueName || '').trim();

    if (!name) return null;

    const existingVenue = venues.find(
      (venue) => venue.name?.toLowerCase() === name.toLowerCase()
    );

    if (existingVenue) return existingVenue.id;

    const { data, error: insertError } = await supabase
      .from('venues')
      .insert({
        name,
        is_active: true,
      })
      .select('id, name')
      .single();

    if (!insertError && data) {
      setVenues((current) => [...current, data]);
      return data.id;
    }

    // If another request created the venue at the same time,
    // retrieve the existing record instead of failing.
    const { data: existing, error: lookupError } = await supabase
      .from('venues')
      .select('id, name')
      .ilike('name', name)
      .maybeSingle();

    if (!lookupError && existing) {
      setVenues((current) => {
        if (current.some((venue) => venue.id === existing.id)) {
          return current;
        }

        return [...current, existing];
      });

      return existing.id;
    }

    throw insertError || lookupError || new Error('Unable to save the venue.');
  }

  async function begin(row = null) {
    clearPreviews();

    const initial = {};

    cfg.fields.forEach(([key]) => {
      let value = row?.[key];

      if (key === 'primary_color') value = value || '#eab83e';
      if (key === 'public_profile') value = value ?? true;
      if (key === 'is_published') value = value ?? false;

      if (key === 'scheduled_at' || key === 'published_at') {
        value = inputValue(key, value);
      }

      if (key === 'venue_name' && row?.venue_id) {
        value = venues.find((venue) => venue.id === row.venue_id)?.name || '';
      }

      initial[key] = value ?? '';
    });

    // If the venue list has not loaded yet, retrieve the venue for this record.
    if (isMatchResource && row?.venue_id && !initial.venue_name) {
      const { data, error: venueError } = await supabase
        .from('venues')
        .select('id, name')
        .eq('id', row.venue_id)
        .maybeSingle();

      if (!venueError && data) {
        initial.venue_name = data.name || '';

        setVenues((current) => {
          if (current.some((venue) => venue.id === data.id)) {
            return current;
          }

          return [...current, data];
        });
      }
    }

    setForm(initial);
    setFiles({});
    setError('');
    setNotice('');
    setEditing(row?.id || 'new');
  }

  function closeForm() {
    clearPreviews();
    setEditing(null);
    setForm({});
    setFiles({});
    setError('');
  }

  function change(key, value) {
    setForm((old) => ({
      ...old,
      [key]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setError('');
    setNotice('');

    for (const [key, label, , isRequired] of cfg.fields) {
      if (isRequired) {
        const message = required(form[key], label);

        if (message) {
          setError(message);
          return;
        }
      }
    }

    if (
      isMatchResource &&
      form.home_team_id === form.away_team_id
    ) {
      setError('The home team and away team must be different.');
      return;
    }

    if (
      isMatchResource &&
      (
        !sports.some((sport) => sport.id === form.sport_id) ||
        !teams.some((team) => team.id === form.home_team_id) ||
        !teams.some((team) => team.id === form.away_team_id)
      )
    ) {
      setError('Select a valid sport and both teams from the dropdowns.');
      return;
    }

    for (const file of Object.values(files)) {
      if (file) {
        const issue = validateImage(file);

        if (issue) {
          setError(issue);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const payload = { ...form };

      // Convert the free-text venue name into a database venue UUID.
      if (isMatchResource) {
        payload.venue_id = await resolveVenueId(form.venue_name);

        // venue_name is an admin form field, not a matches table column.
        delete payload.venue_name;

        payload.schedule_label =
          String(form.schedule_label || '').trim() || null;
      }

      for (const [key, file] of Object.entries(files)) {
        if (!file) continue;

        const uploaded = await uploadImage(file, resource);

        if (uploaded.error) throw uploaded.error;

        payload[key] = uploaded.url;
      }

      for (const [key, , type] of cfg.fields) {
        if (type === 'number') {
          if (payload[key] === '' || payload[key] == null) {
            payload[key] = null;
          } else {
            const number = Number(payload[key]);

            if (
              !Number.isFinite(number) ||
              number < 0 ||
              !Number.isInteger(number)
            ) {
              throw new Error(`${key} must be a non-negative whole number.`);
            }

            payload[key] = number;
          }
        }

        if (type === 'checkbox') {
          payload[key] = Boolean(payload[key]);
        }

        if (type === 'datetime-local') {
          payload[key] = payload[key]
            ? new Date(payload[key]).toISOString()
            : null;
        }

        if (payload[key] === '') {
          payload[key] = null;
        }
      }

      const id = editing === 'new' ? null : editing;

      const result = await saveRecord(cfg.table, payload, id);

      if (result.error) throw result.error;

      closeForm();
      setNotice('Record saved successfully.');
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Unable to save the record.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    if (
      !window.confirm(
        `Delete "${recordName(row)}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setError('');
    setNotice('');

    try {
      const result = await deleteRecord(cfg.table, row.id);

      if (result.error) throw result.error;

      setNotice('Record deleted successfully.');
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Unable to delete the record.');
    }
  }

  function selectImage(key, file) {
    if (!file) return;

    const issue = validateImage(file);

    if (issue) {
      setError(issue);
      return;
    }

    setError('');

    const url = URL.createObjectURL(file);

    previews.current.push(url);

    setFiles((old) => ({
      ...old,
      [key]: file,
    }));

    change(key, url);
  }

  function renderField([key, label, type, isRequired, options]) {
    const common = {
      required: Boolean(isRequired),
      value: form[key] ?? '',
      onChange: (event) => change(key, event.target.value),
    };

    if (type === 'sport-select') {
      return (
        <select {...common}>
          <option value="">Select a sport</option>

          {sports.map((sport) => (
            <option value={sport.id} key={sport.id}>
              {sport.name}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'team-select') {
      return (
        <select {...common}>
          <option value="">Select a team</option>

          {teams.map((team) => (
            <option value={team.id} key={team.id}>
              {team.name}
              {team.abbreviation ? ` (${team.abbreviation})` : ''}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'select') {
      return (
        <select {...common}>
          <option value="">Select {label.toLowerCase()}</option>

          {(options || []).map((option) => (
            <option value={option} key={option}>
              {titleCase(option)}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return <textarea {...common} rows={4} />;
    }

    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={Boolean(form[key])}
          onChange={(event) => change(key, event.target.checked)}
        />
      );
    }

    if (type === 'image') {
      return (
        <span className="file-field">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) =>
              selectImage(key, event.target.files?.[0])
            }
          />

          {form[key] && (
            <img
              src={form[key]}
              alt={`${label} preview`}
              className="image-preview"
            />
          )}

          <small>Image file · maximum 5 MB.</small>
        </span>
      );
    }

    return (
      <input
        {...common}
        type={type || 'text'}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 1 : undefined}
      />
    );
  }

  const filtered = rows.filter((row) =>
    JSON.stringify(row)
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  let columns = cfg.readonly
    ? readonlyColumns[resource] || []
    : cfg.fields.map(([key, label]) => [key, label]).slice(0, 5);

  if (isMatchResource) {
    columns = [
      ['sport_id', 'Sport'],
      ['division', 'Division'],
      ['schedule_label', 'Game'],
      ['home_team_id', 'Home team'],
      ['away_team_id', 'Away team'],
      ['scheduled_at', 'Date and time'],
      ['venue_id', 'Venue'],
    ];
  }

  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title={cfg.title}
        description={cfg.description}
        actions={!cfg.readonly && (
          <button
            type="button"
            className="button button-dark"
            onClick={() =>
              begin(cfg.single && rows.length ? rows[0] : null)
            }
          >
            <Plus size={16} />
            {cfg.single && rows.length ? 'Edit settings' : 'Add new'}
          </button>
        )}
      />

      {notice && !editing && (
        <Notice type="success">{notice}</Notice>
      )}

      {error && <Notice type="error">{error}</Notice>}

      {editing && (
        <div className="admin-panel edit-panel">
          <div className="panel-heading">
            <div>
              <h2>
                {editing === 'new' ? 'Create record' : 'Edit record'}
              </h2>
              <p>Fields marked with * are required.</p>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={closeForm}
              aria-label="Close form"
            >
              <X />
            </button>
          </div>

          <form onSubmit={submit} className="resource-form">
            <div className="form-grid">
              {cfg.fields.map((field) => {
                const [key, label, type, isRequired] = field;
                const fullWidth =
                  type === 'textarea' || type === 'image';

                return (
                  <label
                    className={fullWidth ? 'form-field-full' : ''}
                    key={key}
                  >
                    {label}
                    {isRequired ? ' *' : ''}

                    {type === 'checkbox' ? (
                      <span className="checkbox-field">
                        {renderField(field)}
                        {key === 'is_published'
                          ? 'Publish this match publicly'
                          : 'Enable this option'}
                      </span>
                    ) : (
                      renderField(field)
                    )}
                  </label>
                );
              })}
            </div>

            {isMatchResource && (
              <p>
                Select sports and teams from the dropdowns. You can type
                any venue name directly. Date and time are optional.
                Use the Game label field for labels such as Game 1,
                Game 2, Semifinals, or Finals.
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="button button-light"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button button-dark"
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw className="spin-icon" size={16} />
                ) : (
                  <Save size={16} />
                )}

                {saving ? 'Saving…' : 'Save record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            cfg.single
              ? 'Settings have not been configured'
              : 'No records yet'
          }
          description={
            cfg.readonly
              ? 'Records will appear here when activity is recorded.'
              : 'Create your first record to begin managing this section.'
          }
          action={!cfg.readonly && (
            <button
              type="button"
              className="button button-light"
              onClick={() => begin()}
            >
              <Plus size={16} /> Create record
            </button>
          )}
        />
      ) : (
        <div className="admin-panel">
          <div className="table-toolbar">
            <label className="search-field">
              <Search size={16} />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records…"
              />
            </label>

            <span>{filtered.length} records</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}

                  {!cfg.readonly && (
                    <th className="actions-col">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    {columns.map(([key]) => {
                      let value = row[key];

                      if (isMatchResource) {
                        if (key === 'sport_id') {
                          value =
                            sports.find((item) => item.id === value)?.name ||
                            value;
                        }

                        if (key === 'home_team_id') {
                          value =
                            teams.find((item) => item.id === value)?.name ||
                            value;
                        }

                        if (key === 'away_team_id') {
                          value =
                            teams.find((item) => item.id === value)?.name ||
                            value;
                        }

                        if (key === 'venue_id') {
                          value =
                            venues.find((item) => item.id === value)?.name ||
                            '—';
                        }
                      }

                      return (
                        <td key={key}>
                          {key.includes('color') && value ? (
                            <span className="color-value">
                              <i style={{ background: value }} />
                              {value}
                            </span>
                          ) : key.endsWith('_at') && value ? (
                            formatDateTime(value)
                          ) : typeof value === 'boolean' ? (
                            value ? 'Yes' : 'No'
                          ) : (
                            String(value ?? '—').slice(0, 90)
                          )}
                        </td>
                      );
                    })}

                    {!cfg.readonly && (
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="icon-button"
                            title="Edit"
                            aria-label="Edit record"
                            onClick={() => begin(row)}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="icon-button danger-icon"
                            title="Delete"
                            aria-label="Delete record"
                            onClick={() => remove(row)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + (cfg.readonly ? 0 : 1)}
                    >
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}


// Manual bracket creator.
function ManualBracketBuilder() {
  const [sports, setSports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sportId, setSportId] = useState('');
  const [bracketName, setBracketName] = useState('');
  const [division, setDivision] = useState('Boys');
  const [teamOrder, setTeamOrder] = useState(['', '']);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [savingBracket, setSavingBracket] = useState(false);
  const [bracketError, setBracketError] = useState('');
  const [bracketNotice, setBracketNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setLoadingOptions(true);
      setBracketError('');

      try {
        const [sportResult, teamResult] = await Promise.all([
          listRecords('sports', {
            orderBy: 'name',
            ascending: true,
            limit: 500,
          }),

          listRecords('teams', {
            orderBy: 'name',
            ascending: true,
            limit: 500,
          }),
        ]);

        if (sportResult.error) throw sportResult.error;
        if (teamResult.error) throw teamResult.error;

        if (!active) return;

        setSports(sportResult.data || []);

        setTeams(
          (teamResult.data || []).filter((team) =>
            team.status !== 'withdrawn' &&
            team.registration_status !== 'withdrawn'
          )
        );
      } catch (err) {
        if (active) {
          setBracketError(
            err.message || 'Unable to load sports and teams.'
          );
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const selectedTeamIds = teamOrder.filter(Boolean);
  const selectedTeamSet = new Set(selectedTeamIds);

  function updateTeam(index, teamId) {
    setTeamOrder((current) =>
      current.map((value, currentIndex) =>
        currentIndex === index ? teamId : value
      )
    );
  }

  function addTeamSlot() {
    setTeamOrder((current) => [...current, '']);
  }

  function removeTeamSlot(index) {
    setTeamOrder((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function moveTeamSlot(index, direction) {
    setTeamOrder((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [
        next[target],
        next[index],
      ];

      return next;
    });
  }

  function getTeamName(teamId) {
    return (
      teams.find((team) => team.id === teamId)?.name ||
      'Unselected team'
    );
  }

  async function handleCreateBracket(event) {
    event.preventDefault();

    setBracketError('');
    setBracketNotice('');

    const orderedTeamIds = teamOrder.filter(Boolean);

    if (!sportId) {
      setBracketError('Please select a sport.');
      return;
    }

    if (!bracketName.trim()) {
      setBracketError('Please enter a bracket or stage name.');
      return;
    }

    if (orderedTeamIds.length < 2) {
      setBracketError('Select at least two teams.');
      return;
    }

    if (new Set(orderedTeamIds).size !== orderedTeamIds.length) {
      setBracketError('A team can only appear once in this bracket.');
      return;
    }

    setSavingBracket(true);

    let createdStageId = null;

    try {
      const existingStages = await listRecords('tournament_stages', {
        select: 'id, stage_order',
        orderBy: 'stage_order',
        ascending: false,
        limit: 500,
        filters: {
          sport_id: sportId,
        },
      });

      if (existingStages.error) throw existingStages.error;

      const nextStageOrder =
        Math.max(
          0,
          ...(existingStages.data || []).map((stage) =>
            Number(stage.stage_order || 0)
          )
        ) + 1;

      const stageResult = await saveRecord(
        'tournament_stages',
        {
          sport_id: sportId,
          name: bracketName.trim(),
          stage_order: nextStageOrder,
          format: 'single_elimination',
          status: 'draft',
          settings: {
            division,
            manually_arranged: true,
            team_order: orderedTeamIds,
          },
        },
        null
      );

      if (stageResult.error) throw stageResult.error;

      if (!stageResult.data?.id) {
        throw new Error(
          'The tournament stage was saved, but no stage ID was returned.'
        );
      }

      createdStageId = stageResult.data.id;

      const { error: entriesError } = await supabase
        .from('bracket_entries')
        .insert(
          orderedTeamIds.map((teamId, index) => ({
            stage_id: createdStageId,
            team_id: teamId,
            seed: index + 1,
            group_name: division,
          }))
        );

      if (entriesError) throw entriesError;

      const bracketResult = await generateBracket({
        sportId,
        stageId: createdStageId,
        teamIds: orderedTeamIds,
        format: 'single_elimination',
      });

      if (bracketResult.error) throw bracketResult.error;

      const matchCount = Number(bracketResult.data || 0);

      setBracketNotice(
        `Bracket created successfully. ${matchCount} first-round match(es) generated using your exact team order.`
      );

      setBracketName('');
      setTeamOrder(['', '']);
    } catch (err) {
      // Removing the stage also removes bracket entries through ON DELETE CASCADE.
      if (createdStageId) {
        const cleanup = await deleteRecord(
          'tournament_stages',
          createdStageId
        );

        if (cleanup.error) {
          setBracketError(
            `${err.message || 'Unable to create bracket.'} The incomplete stage could not be removed: ${cleanup.error.message}`
          );

          setSavingBracket(false);
          return;
        }
      }

      setBracketError(
        err.message || 'Unable to create the bracket.'
      );
    } finally {
      setSavingBracket(false);
    }
  }

  const firstRound = [];

  for (let index = 0; index < selectedTeamIds.length; index += 2) {
    firstRound.push({
      first: selectedTeamIds[index],
      second: selectedTeamIds[index + 1] || null,
    });
  }

  return (
    <section
      className="admin-panel"
      style={{ padding: 24, marginBottom: 24 }}
    >
      <div className="panel-heading">
        <div>
          <h2>Manual Bracket Creator</h2>
          <p>
            Select the participating teams and arrange their order yourself.
            The first two teams will be paired, followed by the next two teams.
          </p>
        </div>
      </div>

      {bracketError && (
        <Notice type="error">{bracketError}</Notice>
      )}

      {bracketNotice && (
        <Notice type="success">{bracketNotice}</Notice>
      )}

      {loadingOptions ? (
        <LoadingState />
      ) : (
        <form
          onSubmit={handleCreateBracket}
          className="resource-form"
        >
          <div className="form-grid">
            <label>
              Sport *
              <select
                value={sportId}
                onChange={(event) => setSportId(event.target.value)}
                required
              >
                <option value="">Select a sport</option>

                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Division *
              <select
                value={division}
                onChange={(event) => setDivision(event.target.value)}
                required
              >
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
                <option value="Mixed">Mixed</option>
                <option value="Open">Open</option>
              </select>
            </label>

            <label className="form-field-full">
              Bracket / stage name *
              <input
                type="text"
                value={bracketName}
                onChange={(event) => setBracketName(event.target.value)}
                placeholder="Example: Basketball - Boys Division"
                required
              />
            </label>
          </div>

          <div style={{ marginTop: 28 }}>
            <div className="panel-heading">
              <div>
                <h3>Arrange teams</h3>
                <p>
                  Use the arrows to change the order before creating the bracket.
                </p>
              </div>

              <button
                type="button"
                className="button button-light"
                onClick={addTeamSlot}
              >
                <Plus size={16} /> Add team slot
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {teamOrder.map((teamId, index) => (
                <div
                  key={`team-slot-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 12,
                    alignItems: 'end',
                    padding: 14,
                    border: '1px solid var(--border, #dedede)',
                    borderRadius: 10,
                  }}
                >
                  <label style={{ margin: 0 }}>
                    <span style={{ display: 'block', marginBottom: 7 }}>
                      Position {index + 1} —{' '}
                      {index % 2 === 0 ? 'First team' : 'Opponent'}
                    </span>

                    <select
                      value={teamId}
                      onChange={(event) =>
                        updateTeam(index, event.target.value)
                      }
                    >
                      <option value="">Select a team</option>

                      {teams.map((team) => (
                        <option
                          key={team.id}
                          value={team.id}
                          disabled={
                            selectedTeamSet.has(team.id) &&
                            teamId !== team.id
                          }
                        >
                          {team.name}
                          {team.abbreviation
                            ? ` (${team.abbreviation})`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="table-actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="Move up"
                      aria-label={`Move position ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => moveTeamSlot(index, -1)}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      className="icon-button"
                      title="Move down"
                      aria-label={`Move position ${index + 1} down`}
                      disabled={index === teamOrder.length - 1}
                      onClick={() => moveTeamSlot(index, 1)}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      className="icon-button danger-icon"
                      title="Remove slot"
                      aria-label={`Remove position ${index + 1}`}
                      disabled={teamOrder.length <= 2}
                      onClick={() => removeTeamSlot(index)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <h3>First-round preview</h3>
            <p>
              Matchups are displayed in the same order that will be submitted.
            </p>

            {firstRound.length ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {firstRound.map((match, index) => (
                  <div
                    key={`preview-${index}`}
                    style={{
                      border: '1px solid var(--border, #dedede)',
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <strong>MATCH {index + 1}</strong>

                    <div
                      style={{
                        padding: '13px 0',
                        borderBottom: '1px solid var(--border, #dedede)',
                      }}
                    >
                      {getTeamName(match.first)}
                    </div>

                    <div style={{ paddingTop: 13 }}>
                      {match.second
                        ? getTeamName(match.second)
                        : 'BYE'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Select teams to see the matchup preview.</p>
            )}
          </div>

          <div className="form-actions" style={{ marginTop: 24 }}>
            <button
              type="submit"
              className="button button-dark"
              disabled={savingBracket || loadingOptions}
            >
              {savingBracket ? (
                <RefreshCw className="spin-icon" size={16} />
              ) : (
                <Save size={16} />
              )}

              {savingBracket
                ? 'Creating bracket…'
                : 'Create bracket'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function ResourcePage({ resource = 'sports' }) {
  if (resource === 'brackets') {
    return (
      <>
        <PageHeader
          eyebrow="ADMINISTRATION"
          title="Tournament Brackets"
          description="Create brackets, arrange teams manually, and manage tournament stages."
        />

        <ManualBracketBuilder />

        <GenericResourcePage resource="brackets" />
      </>
    );
  }

  return <GenericResourcePage resource={resource} />;
}
