
export const APP_NAME = 'LCC Palaro';

export const TIME_ZONE = 'Asia/Manila';

export const MATCH_STATUSES = [
  'scheduled',
  'in_progress',
  'paused',
  'completed',
  'postponed',
  'cancelled',
];

export const SPORT_CATEGORIES = [
  'team_sport',
  'individual_sport',
  'board_game',
  'esport',
];


export const ADMIN_NAV = [
  {
    label: 'Overview',
    items: [
      ['Dashboard', '/admin', 'LayoutDashboard'],
      ['Sports & Games', '/admin/sports', 'Trophy'],
      ['Teams', '/admin/teams', 'Users'],
    ],
  },
  {
    label: 'Competition',
    items: [
      ['Schedules', '/admin/schedules', 'CalendarDays'],
      ['Matches & Scores', '/admin/matches', 'Swords'],
      ['Live Scoreboard', '/admin/live-scores', 'Radio'],
      ['Standings', '/admin/standings', 'Medal'],
    ],
  },
  {
    label: 'Website',
    items: [
      ['Announcements', '/admin/news', 'Megaphone'],
      ['Settings', '/admin/settings', 'Settings'],
      ['Audit Log', '/admin/audit-log', 'ClipboardList'],
    ],
  },
];
