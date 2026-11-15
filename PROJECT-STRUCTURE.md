# Project structure

```text
lcc-palaro/
├── public/                  Static assets and SPA redirect rule
├── src/
│   ├── assets/              Optional bundled visual assets
│   ├── components/
│   │   ├── common/          Loading, empty, notice, and status components
│   │   ├── layout/          Public header/footer
│   │   ├── sports/          Extension point for sport-specific UI
│   │   ├── matches/         Extension point for match-specific UI
│   │   ├── brackets/        Extension point for bracket visualization
│   │   ├── standings/       Extension point for standings UI
│   │   ├── forms/           Extension point for reusable forms
│   │   └── ui/              Page headers and match cards
│   ├── context/             Supabase authentication context
│   ├── hooks/               Realtime subscription hook
│   ├── layouts/             Public and authenticated admin shells
│   ├── lib/                 Supabase client, constants, validation, formatters, utilities
│   ├── pages/
│   │   ├── public/           Homepage, directory/listing and detail pages
│   │   ├── admin/            Dashboard and configurable resource editor
│   │   ├── auth/             Admin sign-in
│   │   └── errors/           Not-found route
│   ├── services/             Supabase data access and competition utilities
│   ├── styles/               Shared variables, public styles and admin styles
│   ├── App.jsx               Route tree and admin route protection
│   └── main.jsx              React entry point
├── supabase/
│   ├── schema.sql            Initial schema, RLS, RPCs, Realtime and Storage policies
│   ├── seed.sql              Optional event settings starter (no fabricated results)
│   └── migrations/           Versioned initial schema migration
├── .env.example              Public Supabase environment variable names
├── netlify.toml              Build settings and SPA fallback
├── package.json              Root scripts and dependencies
├── package-lock.json         npm dependency lockfile
└── README.md                 Setup, deployment, security and implementation boundaries
```

## Main modules

- `context/AuthContext.jsx`: restores Supabase sessions, loads the matching profile, exposes admin-role checks, sign-in and sign-out.
- `lib/supabase.js`: creates a client only when public environment values are configured.
- `services/dataService.js`: shared read/write/delete/upload functions and Realtime channel lifecycle.
- `services/matchesService.js`: match queries plus transactional score-event and finalization RPC calls.
- `services/schedulesService.js`: venue access and round-robin fixture preparation.
- `services/bracketsService.js`: single-elimination preview and database bracket-generation RPC wrapper.
- `services/standingsService.js`: standings query and a pure finalized-match calculation utility.
- `pages/admin/ResourcePage.jsx`: reusable, schema-driven admin editor for common records.
- `App.jsx`: public routes, login route, and protected admin route group.
