
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../../lib/supabase';
import {
  getMatches,
  recordScoreEvent,
  finalizeMatch,
} from '../../services/matchesService';
import Notice from '../../components/common/Notice';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import './LiveScorePage.css';

const SPORT_CONFIGS = [
  {
    matches: ['basketball'],
    type: 'basketball',
    periods: ['Q1', 'Q2', 'Q3', 'Q4', 'OT'],
    scoring: [1, 2, 3],
    duration: 600,
    hasGameClock: true,
    hasShotClock: true,
    hasFouls: true,
  },
  {
    matches: ['volleyball'],
    type: 'sets',
    periods: ['Set 1', 'Set 2', 'Set 3', 'Set 4', 'Set 5'],
    scoring: [1],
    target: 25,
    decidingTarget: 15,
    winBy: 2,
    bestof: 5,
  },
  {
    matches: ['badminton'],
    type: 'racket',
    periods: ['Game 1', 'Game 2', 'Game 3'],
    scoring: [1],
    target: 21,
    winBy: 2,
    cap: 30,
    bestof: 3,
  },
  {
    matches: ['table tennis', 'ping pong'],
    type: 'racket',
    periods: [
      'Game 1', 'Game 2', 'Game 3', 'Game 4',
      'Game 5', 'Game 6', 'Game 7',
    ],
    scoring: [1],
    target: 11,
    winBy: 2,
    bestof: 7,
  },
  {
    matches: ['tennis'],
    type: 'tennis',
    periods: ['Set 1', 'Set 2', 'Set 3'],
    scoring: [1],
    target: 6,
    winBy: 2,
  },
  {
    matches: ['football', 'soccer'],
    type: 'goals',
    periods: [
      '1st Half', '2nd Half', 'Extra Time 1', 'Extra Time 2',
    ],
    scoring: [1],
    duration: 2700,
    hasGameClock: true,
  },
  {
    matches: ['futsal'],
    type: 'goals',
    periods: [
      '1st Half', '2nd Half', 'Extra Time 1', 'Extra Time 2',
    ],
    scoring: [1],
    duration: 1200,
    hasGameClock: true,
  },
  {
    matches: ['baseball', 'softball'],
    type: 'innings',
    periods: Array.from(
      { length: 9 },
      (v, i) => `Inning ${i + 1}`
    ),
    scoring: [1],
  },
  {
    matches: ['esport', 'esports', 'e-sport', 'e-sports'],
    type: 'rounds',
    periods: [
      'Game 1', 'Game 2', 'Game 3', 'Game 4', 'Game 5',
    ],
    scoring: [1],
  },
];

const DEFAULT_CONFIG = {
  type: 'generic',
  periods: ['Period 1', 'Period 2'],
  scoring: [1],
  hasGameClock: true,
  duration: 600,
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function getSportConfig(sport) {
  const name = normalize(sport?.name);
  const slug = normalize(sport?.slug);
  const method = normalize(sport?.scoring_method);
  const category = normalize(sport?.category);

  const found = SPORT_CONFIGS.find((item) =>
    item.matches.some(
      (term) => name.includes(term) || slug.includes(term)
    )
  );

  if (found) return found;

  if (
    method.includes('time') ||
    method.includes('distance') ||
    method.includes('height')
  ) {
    return {
      type: 'performance',
      periods: ['Attempt 1', 'Attempt 2', 'Attempt 3'],
      scoring: [],
    };
  }

  if (category === 'individual_sport') {
    return {
      type: 'individual',
      periods: ['Round 1', 'Round 2', 'Round 3'],
      scoring: [1],
    };
  }

  if (category === 'board_game') {
    return {
      type: 'rounds',
      periods: [
        'Round 1', 'Round 2', 'Round 3',
        'Round 4', 'Round 5',
      ],
      scoring: [1],
    };
  }

  return DEFAULT_CONFIG;
}

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60
  ).padStart(2, '0')}`;
}

function parseTime(value) {
  const match = String(value).trim().match(/^(\d{1,4}):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function getInitialDuration(match, config) {
  const minutes =
    Number(match?.duration_minutes) ||
    Number(match?.sport?.match_duration_minutes) ||
    Number(config.duration) ||
    10;

  return Math.max(0, Math.floor(minutes * 60));
}

function periodRows(labels, existing, matchId) {
  const rows = labels.map((label, index) => {
    const found = existing.find(
      (row) => Number(row.period_number) === index + 1
    );

    return (
      found || {
        match_id: matchId,
        period_number: index + 1,
        period_label: label,
        home_score: 0,
        away_score: 0,
      }
    );
  });

  existing.forEach((row) => {
    if (
      !rows.some(
        (item) =>
          Number(item.period_number) === Number(row.period_number)
      )
    ) {
      rows.push(row);
    }
  });

  return rows.sort(
    (a, b) => Number(a.period_number) - Number(b.period_number)
  );
}

function getPeriodWinner(period, config, periodNumber) {
  if (!period) return null;

  const home = Number(period.home_score || 0);
  const away = Number(period.away_score || 0);

  if (home === away) return null;

  if (config.type === 'sets' || config.type === 'racket') {
    const target =
      config.type === 'sets' && periodNumber === 5
        ? config.decidingTarget || config.target
        : config.target;

    const high = Math.max(home, away);
    const low = Math.min(home, away);
    const capReached = config.cap && high >= config.cap;

    if (
      high >= target &&
      high - low >= (config.winBy || 2)
    ) {
      return home > away ? 'home' : 'away';
    }

    if (capReached && high > low) {
      return home > away ? 'home' : 'away';
    }

    return null;
  }

  if (config.type === 'tennis') {
    const high = Math.max(home, away);
    const low = Math.min(home, away);

    if (
      high >= (config.target || 6) &&
      high - low >= (config.winBy || 2)
    ) {
      return home > away ? 'home' : 'away';
    }
  }

  return null;
}

function getPeriodTotals(periods, config) {
  if (
    config.type === 'sets' ||
    config.type === 'racket' ||
    config.type === 'tennis'
  ) {
    return periods.reduce(
      (totals, period) => {
        const winner = getPeriodWinner(
          period,
          config,
          Number(period.period_number)
        );

        if (winner === 'home') totals.home += 1;
        if (winner === 'away') totals.away += 1;

        return totals;
      },
      { home: 0, away: 0 }
    );
  }

  return periods.reduce(
    (totals, period) => {
      totals.home += Number(period.home_score || 0);
      totals.away += Number(period.away_score || 0);
      return totals;
    },
    { home: 0, away: 0 }
  );
}

function getMatchWinner(match) {
  const home = Number(match?.home_score || 0);
  const away = Number(match?.away_score || 0);

  if (home > away) return match?.home_team_id || null;
  if (away > home) return match?.away_team_id || null;

  return null;
}

function matchIsOver(periods, config) {
  if (!['sets', 'racket', 'tennis'].includes(config.type)) {
    return false;
  }

  const totals = getPeriodTotals(periods, config);
  const bestof = config.bestof || config.periods.length;
  const winsNeeded = Math.floor(bestof / 2) + 1;

  return totals.home >= winsNeeded || totals.away >= winsNeeded;
}

export default function LiveScorePage() {
  const [matches, setMatches] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [periods, setPeriods] = useState([]);
  const [activePeriod, setActivePeriod] = useState(1);

  const [clock, setClock] = useState(600);
  const [clockInput, setClockInput] = useState('10:00');
  const [clockRunning, setClockRunning] = useState(false);

  const [shotClock, setShotClock] = useState(24);
  const [shotClockInput, setShotClockInput] = useState('24');
  const [shotClockRunning, setShotClockRunning] = useState(false);

  const [homeFouls, setHomeFouls] = useState(0);
  const [awayFouls, setAwayFouls] = useState(0);
  const [possession, setPossession] = useState('home');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const clockRef = useRef(600);
  const shotClockRef = useRef(24);
  const clockRunningRef = useRef(false);
  const shotClockRunningRef = useRef(false);
  const selectedIdRef = useRef('');
  const loadedMatchRef = useRef('');
  const lastLocalClockChangeRef = useRef(0);
  const clockSaveTimerRef = useRef(null);
  const shotClockSaveTimerRef = useRef(null);
  const clockRevisionRef = useRef(0);
  const shotClockRevisionRef = useRef(0);

  const selected = matches.find((match) => match.id === selectedId);

  const config = useMemo(
    () => getSportConfig(selected?.sport),
    [selected?.sport]
  );

  const isBasketball = config.type === 'basketball';
  const isVolleyball = config.type === 'sets';
  const isRacket = config.type === 'racket';
  const isTennis = config.type === 'tennis';
  const isPerformance = config.type === 'performance';

  const homeName = selected?.home_team?.name || 'HOME';
  const awayName = selected?.away_team?.name || 'AWAY';

  const currentPeriod =
    periods.find(
      (period) => Number(period.period_number) === activePeriod
    ) || periods[0];

  // Volleyball scoreboard displays current-set points.
  // The match table stores the number of sets won.
  const homeScore = Number(
    isVolleyball
      ? currentPeriod?.home_score || 0
      : selected?.home_score || 0
  );

  const awayScore = Number(
    isVolleyball
      ? currentPeriod?.away_score || 0
      : selected?.away_score || 0
  );

  const totals = useMemo(
    () => getPeriodTotals(periods, config),
    [periods, config]
  );

  const currentPeriodWinner = getPeriodWinner(
    currentPeriod,
    config,
    activePeriod
  );

  const periodMatchOver = matchIsOver(periods, config);

  const setClockValue = useCallback((value) => {
    const next = Math.max(0, Math.floor(Number(value) || 0));
    clockRef.current = next;
    setClock(next);
  }, []);

  const setShotClockValueState = useCallback((value) => {
    const next = Math.max(0, Math.floor(Number(value) || 0));
    shotClockRef.current = next;
    setShotClock(next);
  }, []);

  const setClockRunningValue = useCallback((value) => {
    clockRunningRef.current = value;
    setClockRunning(value);
  }, []);

  const setShotClockRunningValue = useCallback((value) => {
    shotClockRunningRef.current = value;
    setShotClockRunning(value);
  }, []);

  const saveLiveState = useCallback(async (matchId, updates) => {
    const { error: saveError } = await supabase
      .from('match_live_state')
      .upsert(
        {
          match_id: matchId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'match_id' }
      );

    if (saveError) throw saveError;
  }, []);

  const scheduleClockSave = useCallback(
    (matchId, overrides = {}) => {
      if (!matchId) return;

      const revision = ++clockRevisionRef.current;

      const snapshot = {
        game_clock_seconds:
          overrides.game_clock_seconds ?? clockRef.current,
        clock_running:
          overrides.clock_running ?? clockRunningRef.current,
        shot_clock_seconds:
          overrides.shot_clock_seconds ?? shotClockRef.current,
        shot_clock_running:
          overrides.shot_clock_running ??
          shotClockRunningRef.current,
      };

      if (clockSaveTimerRef.current) {
        clearTimeout(clockSaveTimerRef.current);
      }

      clockSaveTimerRef.current = setTimeout(async () => {
        if (
          selectedIdRef.current !== matchId ||
          revision !== clockRevisionRef.current
        ) {
          return;
        }

        try {
          await saveLiveState(matchId, snapshot);
        } catch (err) {
          setError(`Unable to save clock: ${err.message}`);
        }
      }, 350);

      return revision;
    },
    [saveLiveState]
  );

  const scheduleShotClockSave = useCallback(
    (matchId) => {
      if (!matchId) return;

      const revision = ++shotClockRevisionRef.current;

      if (shotClockSaveTimerRef.current) {
        clearTimeout(shotClockSaveTimerRef.current);
      }

      shotClockSaveTimerRef.current = setTimeout(async () => {
        if (
          selectedIdRef.current !== matchId ||
          revision !== shotClockRevisionRef.current
        ) {
          return;
        }

        try {
          await saveLiveState(matchId, {
            shot_clock_seconds: shotClockRef.current,
            shot_clock_running: shotClockRunningRef.current,
          });
        } catch (err) {
          setError(`Unable to save shot clock: ${err.message}`);
        }
      }, 350);
    },
    [saveLiveState]
  );

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getMatches({ limit: 500 });

      if (result.error) throw result.error;

      const available = (result.data || []).filter(
        (match) =>
          !['cancelled', 'postponed'].includes(match.status)
      );

      setMatches(available);

      setSelectedId((current) =>
        available.some((match) => match.id === current)
          ? current
          : available[0]?.id || ''
      );
    } catch (err) {
      setError(err.message || 'Unable to load matches.');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPeriods = useCallback(async () => {
    if (!selected) {
      setPeriods([]);
      setActivePeriod(1);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('match_period_scores')
      .select('*')
      .eq('match_id', selected.id)
      .order('period_number', { ascending: true });

    if (queryError) {
      setError(`Unable to load period scores: ${queryError.message}`);
      setPeriods([]);
      return;
    }

    const rows = periodRows(
      config.periods || DEFAULT_CONFIG.periods,
      data || [],
      selected.id
    );

    setPeriods(rows);

    setActivePeriod((current) =>
      rows.some(
        (period) => Number(period.period_number) === current
      )
        ? current
        : Number(rows[0]?.period_number || 1)
    );
  }, [selected, config]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    setHomeFouls(0);
    setAwayFouls(0);
    setPossession('home');
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      loadedMatchRef.current = '';
      setClockRunningValue(false);
      setShotClockRunningValue(false);
      return undefined;
    }

    let active = true;
    const matchId = selectedId;

    async function loadState() {
      if (loadedMatchRef.current === matchId) return;

      const { data, error: queryError } = await supabase
        .from('match_live_state')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();

      if (!active || selectedIdRef.current !== matchId) return;

      if (queryError) {
        setError(`Unable to load live state: ${queryError.message}`);
        return;
      }

      if (!data) {
        const match = matches.find((item) => item.id === matchId);

        const duration = getInitialDuration(
          match,
          getSportConfig(match?.sport)
        );

        setClockValue(duration);
        setClockInput(formatTime(duration));
        setClockRunningValue(false);
        setShotClockValueState(24);
        setShotClockInput('24');
        setShotClockRunningValue(false);

        loadedMatchRef.current = matchId;

        try {
          await saveLiveState(matchId, {
            current_period: 1,
            game_clock_seconds: duration,
            clock_running: false,
            shot_clock_seconds: 24,
            shot_clock_running: false,
          });
        } catch (err) {
          setError(`Unable to initialize live state: ${err.message}`);
        }

        return;
      }

      setClockValue(Number(data.game_clock_seconds ?? 600));
      setClockInput(formatTime(data.game_clock_seconds ?? 600));
      setClockRunningValue(Boolean(data.clock_running));
      setShotClockValueState(Number(data.shot_clock_seconds ?? 24));
      setShotClockInput(String(data.shot_clock_seconds ?? 24));
      setShotClockRunningValue(Boolean(data.shot_clock_running));

      if (Number.isInteger(data.current_period)) {
        setActivePeriod(data.current_period);
      }

      loadedMatchRef.current = matchId;
    }

    loadState();

    const channel = supabase
      .channel(`admin-live-state-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_live_state',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (
            !active ||
            selectedIdRef.current !== matchId ||
            !payload.new?.match_id
          ) {
            return;
          }

          const data = payload.new;

          const recentlyEdited =
            Date.now() - lastLocalClockChangeRef.current < 5000;

          if (!clockRunningRef.current && !recentlyEdited) {
            setClockValue(Number(data.game_clock_seconds ?? 600));
            setClockInput(formatTime(data.game_clock_seconds ?? 600));
          }

          if (!shotClockRunningRef.current && !recentlyEdited) {
            setShotClockValueState(
              Number(data.shot_clock_seconds ?? 24)
            );
            setShotClockInput(String(data.shot_clock_seconds ?? 24));
          }

          if (!recentlyEdited) {
            setClockRunningValue(Boolean(data.clock_running));
            setShotClockRunningValue(
              Boolean(data.shot_clock_running)
            );
          }

          if (
            !recentlyEdited &&
            Number.isInteger(data.current_period)
          ) {
            setActivePeriod(data.current_period);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [
    selectedId,
    matches,
    setClockValue,
    setClockRunningValue,
    setShotClockValueState,
    setShotClockRunningValue,
    saveLiveState,
  ]);

  async function updateLiveState(updates = {}) {
    if (!selectedId) return;
    lastLocalClockChangeRef.current = Date.now();

    try {
      await saveLiveState(selectedId, updates);
    } catch (err) {
      setError(`Unable to save live state: ${err.message}`);
    }
  }

  async function changePeriod(periodNumber) {
    const target = periods.find(
      (period) =>
        Number(period.period_number) === Number(periodNumber)
    );

    if (!target) return;

    setActivePeriod(Number(periodNumber));
    setError('');

    await updateLiveState({
      current_period: Number(periodNumber),
    });
  }

  async function savePeriodScore(periodNumber, home, away) {
    if (!selected) throw new Error('No match is selected.');

    const label =
      periods.find(
        (period) =>
          Number(period.period_number) === periodNumber
      )?.period_label ||
      config.periods[periodNumber - 1] ||
      `Period ${periodNumber}`;

    const { data, error: saveError } = await supabase
      .from('match_period_scores')
      .upsert(
        {
          match_id: selected.id,
          period_number: periodNumber,
          period_label: label,
          home_score: home,
          away_score: away,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'match_id,period_number' }
      )
      .select()
      .single();

    if (saveError) throw saveError;

    setPeriods((current) => {
      const exists = current.some(
        (period) =>
          Number(period.period_number) === periodNumber
      );

      const next = exists
        ? current.map((period) =>
            Number(period.period_number) === periodNumber
              ? { ...period, ...data }
              : period
          )
        : [...current, data];

      return next.sort(
        (a, b) =>
          Number(a.period_number) - Number(b.period_number)
      );
    });

    return data;
  }

  async function changeScore(team, amount) {
    if (
      !selected ||
      saving ||
      selected.status === 'completed' ||
      periodMatchOver
    ) {
      return;
    }

    if (isPerformance) {
      setError(
        'Performance-based events need result entry, not point scoring.'
      );
      return;
    }

    if (currentPeriodWinner) {
      setError(
        `${currentPeriod.period_label} is already complete. Select the next period.`
      );
      return;
    }

    const teamId =
      team === 'home'
        ? selected.home_team_id
        : selected.away_team_id;

    if (!teamId) {
      setError(
        'Both teams must be assigned before scoring this match.'
      );
      return;
    }

    const oldPeriodHome = Number(currentPeriod?.home_score || 0);
    const oldPeriodAway = Number(currentPeriod?.away_score || 0);

    const oldValue =
      team === 'home' ? oldPeriodHome : oldPeriodAway;

    const nextValue = Math.max(0, oldValue + amount);

    if (nextValue === oldValue) return;

    const nextPeriodHome =
      team === 'home' ? nextValue : oldPeriodHome;

    const nextPeriodAway =
      team === 'away' ? nextValue : oldPeriodAway;

    const scoreMatchId = selected.id;

    lastLocalClockChangeRef.current = Date.now();

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (selected.status === 'scheduled') {
        const { error: startError } = await supabase
          .from('matches')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selected.id);

        if (startError) throw startError;
      }

      const result = await recordScoreEvent({
        matchId: selected.id,
        period: currentPeriod?.period_label || 'Match',
        eventType:
          amount < 0 ? 'score correction' : 'score',
        teamId,
        delta: amount,
        note: `${config.type} scoreboard`,
      });

      if (result.error) throw result.error;

      await savePeriodScore(
        activePeriod,
        nextPeriodHome,
        nextPeriodAway
      );

      const updatedPeriods = periods.map((period) =>
        Number(period.period_number) === activePeriod
          ? {
              ...period,
              home_score: nextPeriodHome,
              away_score: nextPeriodAway,
            }
          : period
      );

      const allPeriods = updatedPeriods.some(
        (period) =>
          Number(period.period_number) === activePeriod
      )
        ? updatedPeriods
        : [
            ...updatedPeriods,
            {
              match_id: selected.id,
              period_number: activePeriod,
              period_label:
                currentPeriod?.period_label ||
                `Period ${activePeriod}`,
              home_score: nextPeriodHome,
              away_score: nextPeriodAway,
            },
          ];

      const calculated = getPeriodTotals(allPeriods, config);

      const { error: matchUpdateError } = await supabase
        .from('matches')
        .update({
          home_score: calculated.home,
          away_score: calculated.away,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      if (matchUpdateError) throw matchUpdateError;

      setMatches((current) =>
        current.map((match) =>
          match.id === selected.id
            ? {
                ...match,
                home_score: calculated.home,
                away_score: calculated.away,
                status: 'in_progress',
              }
            : match
        )
      );

      const updatedCurrent = allPeriods.find(
        (period) =>
          Number(period.period_number) === activePeriod
      );

      const periodWinner = getPeriodWinner(
        updatedCurrent,
        config,
        activePeriod
      );

      const updatedTotals = getPeriodTotals(allPeriods, config);

      const bestof = config.bestof || config.periods.length;
      const winsNeeded = Math.floor(bestof / 2) + 1;

      const matchWon =
        ['sets', 'racket', 'tennis'].includes(config.type) &&
        (updatedTotals.home >= winsNeeded ||
          updatedTotals.away >= winsNeeded);

      await saveLiveState(scoreMatchId, {
        game_clock_seconds: clockRef.current,
        clock_running: clockRunningRef.current,
        shot_clock_seconds: shotClockRef.current,
        shot_clock_running: shotClockRunningRef.current,
      });

      if (selectedIdRef.current === scoreMatchId) {
        setClockValue(clockRef.current);
        setShotClockValueState(shotClockRef.current);

        if (periodWinner) {
          setClockRunningValue(false);
          setShotClockRunningValue(false);

          scheduleClockSave(scoreMatchId, {
            clock_running: false,
            shot_clock_running: false,
          });

          if (matchWon) {
            setNotice(
              `${updatedCurrent.period_label} won. Match victory condition reached. Finish the match to finalize the result.`
            );
          } else {
            const nextPeriod = allPeriods.find(
              (period) =>
                Number(period.period_number) === activePeriod + 1
            );

            if (nextPeriod) {
              setActivePeriod(Number(nextPeriod.period_number));

              await saveLiveState(scoreMatchId, {
                current_period: Number(nextPeriod.period_number),
                clock_running: false,
                shot_clock_running: false,
              });

              setNotice(
                `${updatedCurrent.period_label} complete. Advanced to ${nextPeriod.period_label}.`
              );
            } else {
              setNotice(
                `${updatedCurrent.period_label} complete. No further periods are configured.`
              );
            }
          }
        } else {
          setNotice(
            'Period score and overall match score updated.'
          );
        }
      }
    } catch (err) {
      setError(`Unable to update score: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function setGameClock() {
    const seconds = parseTime(clockInput);

    if (seconds === null) {
      setError('Enter game time as MM:SS, for example 10:00.');
      return;
    }

    lastLocalClockChangeRef.current = Date.now();
    setClockValue(seconds);
    setClockInput(formatTime(seconds));
    setClockRunningValue(false);

    await updateLiveState({
      game_clock_seconds: seconds,
      clock_running: false,
    });
  }

  async function setShotClockValue(value) {
    if (
      !/^\d{1,2}$/.test(String(value)) ||
      Number(value) > 99
    ) {
      setError('Enter a shot clock value between 0 and 99 seconds.');
      return;
    }

    const seconds = Number(value);

    lastLocalClockChangeRef.current = Date.now();
    setShotClockValueState(seconds);
    setShotClockInput(String(seconds));
    setShotClockRunningValue(false);

    await updateLiveState({
      shot_clock_seconds: seconds,
      shot_clock_running: false,
    });
  }

  async function toggleGameClock() {
    if (
      clockRef.current === 0 ||
      selected?.status === 'completed'
    ) {
      return;
    }

    const nextRunning = !clockRunningRef.current;

    lastLocalClockChangeRef.current = Date.now();
    setClockRunningValue(nextRunning);

    scheduleClockSave(selectedId, {
      game_clock_seconds: clockRef.current,
      clock_running: nextRunning,
    });
  }

  async function toggleShotClock() {
    if (
      shotClockRef.current === 0 ||
      selected?.status === 'completed'
    ) {
      return;
    }

    const nextRunning = !shotClockRunningRef.current;

    lastLocalClockChangeRef.current = Date.now();
    setShotClockRunningValue(nextRunning);

    scheduleShotClockSave(selectedId, {
      shot_clock_seconds: shotClockRef.current,
      shot_clock_running: nextRunning,
    });
  }

  useEffect(() => {
    if (!clockRunning || !selectedId || !config.hasGameClock) {
      return undefined;
    }

    let previous = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - previous) / 1000);

      if (elapsed < 1) return;

      previous += elapsed * 1000;

      setClock((current) => {
        const next = Math.max(0, current - elapsed);
        clockRef.current = next;

        if (next === 0) {
          setClockRunningValue(false);

          scheduleClockSave(selectedId, {
            game_clock_seconds: 0,
            clock_running: false,
          });
        }

        return next;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [
    clockRunning,
    selectedId,
    config.hasGameClock,
    setClockRunningValue,
    scheduleClockSave,
  ]);

  useEffect(() => {
    if (!shotClockRunning || !selectedId || !isBasketball) {
      return undefined;
    }

    let previous = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - previous) / 1000);

      if (elapsed < 1) return;

      previous += elapsed * 1000;

      setShotClock((current) => {
        const next = Math.max(0, current - elapsed);
        shotClockRef.current = next;

        if (next === 0) {
          setShotClockRunningValue(false);
          scheduleShotClockSave(selectedId);
        }

        return next;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [
    shotClockRunning,
    selectedId,
    isBasketball,
    setShotClockRunningValue,
    scheduleShotClockSave,
  ]);

  useEffect(() => {
    if (!selectedId || clockRunning) return undefined;

    scheduleClockSave(selectedId, {
      game_clock_seconds: clockRef.current,
      clock_running: false,
    });

    return undefined;
  }, [selectedId, clockRunning, scheduleClockSave]);

  useEffect(() => {
    if (!selectedId || shotClockRunning) return undefined;

    scheduleShotClockSave(selectedId);

    return undefined;
  }, [selectedId, shotClockRunning, scheduleShotClockSave]);

  useEffect(
    () => () => {
      if (clockSaveTimerRef.current) {
        clearTimeout(clockSaveTimerRef.current);
      }

      if (shotClockSaveTimerRef.current) {
        clearTimeout(shotClockSaveTimerRef.current);
      }
    },
    []
  );

  async function finishMatch() {
    if (!selected || saving) return;

    if (
      ['sets', 'racket', 'tennis'].includes(config.type) &&
      !periodMatchOver
    ) {
      const confirmed = window.confirm(
        'The configured sets/games victory condition has not been reached. Finish this match anyway?'
      );

      if (!confirmed) return;
    }

    if (homeScore === awayScore) {
      const confirmTie = window.confirm(
        'The overall score is tied. Finish this match without selecting a winner?'
      );

      if (!confirmTie) return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    setClockRunningValue(false);
    setShotClockRunningValue(false);

    try {
      await saveLiveState(selected.id, {
        current_period: activePeriod,
        game_clock_seconds: clockRef.current,
        clock_running: false,
        shot_clock_seconds: shotClockRef.current,
        shot_clock_running: false,
      });

      const winner = getMatchWinner(selected);

      const result = await finalizeMatch(selected.id, winner);

      if (result.error) throw result.error;

      setMatches((current) =>
        current.map((match) =>
          match.id === selected.id
            ? {
                ...match,
                status: 'completed',
                winner_team_id: winner,
              }
            : match
        )
      );

      setNotice('Match marked as completed.');
    } catch (err) {
      setError(`Unable to finish match: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function renderScoringButtons(team) {
    const displayedScore =
      team === 'home' ? homeScore : awayScore;

    const name = team === 'home' ? homeName : awayName;

    if (isPerformance) {
      return (
        <p className="scoreboard-footnote">
          Enter the performance result in the event results workflow.
        </p>
      );
    }

    const options = config.scoring?.length
      ? config.scoring
      : [1];

    const disabled =
      saving ||
      selected?.status === 'completed' ||
      Boolean(currentPeriodWinner) ||
      periodMatchOver;

    return (
      <div className="merged-score-controls">
        <button
          type="button"
          aria-label={`Decrease ${name} score`}
          onClick={() => changeScore(team, -1)}
          disabled={displayedScore <= 0 || disabled}
        >
          -1
        </button>

        {options.map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => changeScore(team, value)}
            disabled={disabled}
          >
            +{value}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="live-score-page">
      <PageHeader
        eyebrow="COMPETITION CONTROL"
        title="Live Scoreboard"
        description="Sport-specific scoring, period breakdowns, and live clocks."
      />

      {error && <Notice type="error">{error}</Notice>}
      {notice && <Notice type="success">{notice}</Notice>}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="scoreboard-toolbar">
            <label className="scoreboard-match-select">
              <span>SELECT MATCH</span>

              <select
                value={selectedId}
                onChange={(event) => {
                  const nextId = event.target.value;

                  if (clockSaveTimerRef.current) {
                    clearTimeout(clockSaveTimerRef.current);
                  }

                  if (shotClockSaveTimerRef.current) {
                    clearTimeout(shotClockSaveTimerRef.current);
                  }

                  setSelectedId(nextId);
                  setNotice('');
                  setError('');
                }}
              >
                <option value="">Choose a match</option>

                {matches.map((match) => (
                  <option value={match.id} key={match.id}>
                    {match.sport?.name || 'Sport'} |{' '}
                    {match.home_team?.name || 'Home'} vs{' '}
                    {match.away_team?.name || 'Away'} (
                    {match.division || 'No division'})
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <span
                className={`scoreboard-status status-${selected.status}`}
              >
                {String(selected.status || 'scheduled').replaceAll(
                  '_',
                  ' '
                )}
              </span>
            )}
          </section>

          {!selected ? (
            <section className="scoreboard-empty">
              <h2>No match selected</h2>
              <p>Create a match first in the Matches section.</p>
            </section>
          ) : (
            <section className="scoreboard scoreboard-merged">
              <div className="scoreboard-team home-team">
                <div className="scoreboard-team-name">
                  {homeName}
                </div>

                <div className="scoreboard-total">
                  {homeScore}
                </div>

                {renderScoringButtons('home')}

                {(isVolleyball || isRacket || isTennis) && (
                  <div className="scoreboard-stat-label">
                    {isVolleyball
                      ? 'SETS WON'
                      : 'GAMES / SETS WON'}
                    : {totals.home}
                  </div>
                )}

                {isBasketball && (
                  <>
                    <div className="scoreboard-divider" />

                    <div className="scoreboard-stat-label">
                      FOULS
                    </div>

                    <div className="scoreboard-foul-count">
                      {homeFouls}
                    </div>

                    <div className="scoreboard-team-controls">
                      <button
                        type="button"
                        onClick={() =>
                          setHomeFouls((v) => Math.max(0, v - 1))
                        }
                      >
                        -1
                      </button>

                      <button
                        type="button"
                        onClick={() => setHomeFouls((v) => v + 1)}
                      >
                        + FOUL
                      </button>
                    </div>

                    <div className="scoreboard-bonus-row">
                      <span>BONUS</span>

                      <span
                        className={`bonus-indicator ${
                          homeFouls >= 5 ? 'bonus-active' : ''
                        }`}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="scoreboard-center">
                <div className="merged-live-status">
                  <span className="live-status-dot" />
                  {selected.status === 'completed'
                    ? 'FINAL'
                    : 'LIVE'}
                </div>

                {config.hasGameClock && (
                  <>
                    <div className="scoreboard-clock">
                      {formatTime(clock)}
                    </div>

                    <div className="clock-controls">
                      <button
                        type="button"
                        className="clock-primary"
                        onClick={toggleGameClock}
                        disabled={
                          clock === 0 ||
                          selected.status === 'completed'
                        }
                      >
                        {clockRunning ? 'PAUSE' : 'START'}
                      </button>

                      <button
                        type="button"
                        className="clock-secondary"
                        onClick={() => {
                          setClockRunningValue(false);
                          setClockInput(
                            formatTime(clockRef.current)
                          );
                        }}
                      >
                        SET CLOCK
                      </button>
                    </div>

                    <div className="merged-clock-setter">
                      <input
                        aria-label="Game clock MM:SS"
                        value={clockInput}
                        onChange={(event) =>
                          setClockInput(event.target.value)
                        }
                        placeholder="MM:SS"
                      />

                      <button
                        type="button"
                        onClick={setGameClock}
                      >
                        APPLY
                      </button>
                    </div>
                  </>
                )}

                {isBasketball && (
                  <>
                    <div
                      className={`shot-clock ${
                        shotClock <= 5 ? 'shot-clock-danger' : ''
                      }`}
                    >
                      {shotClock}
                    </div>

                    <div className="clock-controls">
                      <button
                        type="button"
                        className="clock-primary"
                        onClick={toggleShotClock}
                      >
                        {shotClockRunning ? 'PAUSE' : 'START'}
                      </button>

                      <button
                        type="button"
                        className="clock-secondary"
                        onClick={() => setShotClockValue(24)}
                      >
                        RESET 24
                      </button>
                    </div>

                    <div className="merged-clock-setter">
                      <input
                        aria-label="Shot clock seconds"
                        value={shotClockInput}
                        onChange={(event) =>
                          setShotClockInput(event.target.value)
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShotClockValue(shotClockInput)
                        }
                      >
                        APPLY
                      </button>
                    </div>
                  </>
                )}

                <div className="scoreboard-current-period">
                  <span>
                    {isVolleyball
                      ? 'CURRENT SET'
                      : isRacket
                      ? 'CURRENT GAME'
                      : isTennis
                      ? 'CURRENT SET'
                      : isPerformance
                      ? 'CURRENT ATTEMPT'
                      : 'CURRENT PERIOD'}
                  </span>

                  <strong>
                    {currentPeriod?.period_label || '-'}
                  </strong>

                  {currentPeriodWinner && (
                    <p className="scoreboard-footnote">
                      {currentPeriodWinner === 'home'
                        ? homeName
                        : awayName}{' '}
                      won this period.
                    </p>
                  )}

                  <div className="period-selector">
                    <button
                      type="button"
                      aria-label="Previous period"
                      disabled={
                        !currentPeriod ||
                        activePeriod === periods[0]?.period_number
                      }
                      onClick={() => {
                        const index = periods.findIndex(
                          (period) =>
                            Number(period.period_number) ===
                            activePeriod
                        );

                        if (index > 0) {
                          changePeriod(
                            Number(periods[index - 1].period_number)
                          );
                        }
                      }}
                    >
                      &lt;
                    </button>

                    <span>
                      {Math.max(
                        0,
                        periods.findIndex(
                          (period) =>
                            Number(period.period_number) ===
                            activePeriod
                        )
                      ) + 1}{' '}
                      / {periods.length}
                    </span>

                    <button
                      type="button"
                      aria-label="Next period"
                      disabled={
                        !currentPeriod ||
                        activePeriod ===
                          periods[periods.length - 1]?.period_number
                      }
                      onClick={() => {
                        const index = periods.findIndex(
                          (period) =>
                            Number(period.period_number) ===
                            activePeriod
                        );

                        if (
                          index >= 0 &&
                          index < periods.length - 1
                        ) {
                          changePeriod(
                            Number(periods[index + 1].period_number)
                          );
                        }
                      }}
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {isBasketball && (
                  <div className="possession-control">
                    <button
                      type="button"
                      className={
                        possession === 'home'
                          ? 'possession-active'
                          : ''
                      }
                      onClick={() => setPossession('home')}
                    >
                      &larr;
                    </button>

                    <span>
                      POSSESSION
                      <small>{possession.toUpperCase()}</small>
                    </span>

                    <button
                      type="button"
                      className={
                        possession === 'away'
                          ? 'possession-active'
                          : ''
                      }
                      onClick={() => setPossession('away')}
                    >
                      &rarr;
                    </button>
                  </div>
                )}
              </div>

              <div className="scoreboard-team away-team">
                <div className="scoreboard-team-name">
                  {awayName}
                </div>

                <div className="scoreboard-total">
                  {awayScore}
                </div>

                {renderScoringButtons('away')}

                {(isVolleyball || isRacket || isTennis) && (
                  <div className="scoreboard-stat-label">
                    {isVolleyball
                      ? 'SETS WON'
                      : 'GAMES / SETS WON'}
                    : {totals.away}
                  </div>
                )}

                {isBasketball && (
                  <>
                    <div className="scoreboard-divider" />

                    <div className="scoreboard-stat-label">
                      FOULS
                    </div>

                    <div className="scoreboard-foul-count">
                      {awayFouls}
                    </div>

                    <div className="scoreboard-team-controls">
                      <button
                        type="button"
                        onClick={() =>
                          setAwayFouls((v) => Math.max(0, v - 1))
                        }
                      >
                        -1
                      </button>

                      <button
                        type="button"
                        onClick={() => setAwayFouls((v) => v + 1)}
                      >
                        + FOUL
                      </button>
                    </div>

                    <div className="scoreboard-bonus-row">
                      <span>BONUS</span>

                      <span
                        className={`bonus-indicator ${
                          awayFouls >= 5 ? 'bonus-active' : ''
                        }`}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {isPerformance && (
            <section className="scoreboard-empty">
              <h2>Performance-based event</h2>
              <p>
                Use the event results workflow to enter the actual
                time, measurements, distance, or height. This page
                does not treat measurements as points.
              </p>
            </section>
          )}

          {['sets', 'racket', 'tennis'].includes(config.type) && (
            <section className="scoreboard-empty">
              <h2>Period rules</h2>

              <p>
                {config.type === 'sets'
                  ? `A set normally requires ${config.target} points and a ${config.winBy}-point lead. The deciding set uses ${config.decidingTarget || config.target} points.`
                  : config.type === 'racket'
                  ? `A game normally requires ${config.target} points and a ${config.winBy}-point lead${config.cap ? `, capped at ${config.cap}` : ''}.`
                  : 'A tennis set is counted as won when a team reaches target games with a lead. This simplified scoreboard does not track individual tennis games or tiebreak points.'}
              </p>

              {periodMatchOver && (
                <p>
                  <strong>
                    Match-winning set/game total reached.
                  </strong>{' '}
                  Finish the match to finalize it.
                </p>
              )}
            </section>
          )}

          <section className="merged-period-scores">
            <div className="merged-period-heading">
              <div>
                <span className="scoreboard-kicker">
                  {isVolleyball
                    ? 'POINTS PER SET'
                    : isRacket
                    ? 'POINTS PER GAME'
                    : isTennis
                    ? 'GAMES PER SET'
                    : isPerformance
                    ? 'ATTEMPT BREAKDOWN'
                    : 'POINTS PER PERIOD'}
                </span>

                <h2>Match breakdown</h2>
              </div>

              <span>
                Selected: {currentPeriod?.period_label || '-'}
              </span>
            </div>

            <div className="merged-period-grid">
              {periods.map((period) => {
                const winner = getPeriodWinner(
                  period,
                  config,
                  Number(period.period_number)
                );

                return (
                  <button
                    type="button"
                    key={period.period_number}
                    className={`merged-period-card ${
                      Number(period.period_number) === activePeriod
                        ? 'merged-period-card-active'
                        : ''
                    }`}
                    onClick={() =>
                      changePeriod(Number(period.period_number))
                    }
                  >
                    <span>{period.period_label}</span>

                    <strong>
                      {Number(period.home_score || 0)} -{' '}
                      {Number(period.away_score || 0)}
                    </strong>

                    {winner && (
                      <small>
                        {winner === 'home'
                          ? homeName
                          : awayName}{' '}
                        won
                      </small>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="merged-period-footer">
              <span>
                Overall: <strong>{homeScore}</strong> - {awayScore}
              </span>

              <button
                type="button"
                className="finish-match-button"
                onClick={finishMatch}
                disabled={
                  saving || selected.status === 'completed'
                }
              >
                {selected.status === 'completed'
                  ? 'MATCH COMPLETED'
                  : 'FINISH MATCH'}
              </button>
            </div>
          </section>

          <p className="scoreboard-footnote">
            Period points are stored in match_period_scores. Match
            totals are recalculated from the period breakdown. Fouls
            and possession are temporary controls and reset when the
            page or selected match changes.
          </p>
        </>
      )}
    </div>
  );
}
