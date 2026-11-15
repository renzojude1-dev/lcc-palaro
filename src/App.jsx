
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

import HomePage from './pages/public/HomePage';
import ListingPage from './pages/public/ListingPage';
import DetailPage from './pages/public/DetailPage';

import LoginPage from './pages/auth/LoginPage';

import DashboardPage from './pages/admin/DashboardPage';
import ResourcePage from './pages/admin/ResourcePage';
import LiveScorePage from './pages/admin/LiveScorePage';

import NotFoundPage from './pages/errors/NotFoundPage';
import LoadingState from './components/common/LoadingState';
import Notice from './components/common/Notice';

import './styles/global.css';
import './styles/public.css';
import './styles/admin.css';

function ProtectedRoute() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <LoadingState label="Restoring secure session…" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="auth-loading">
        <Notice type="error">
          Your account does not have administrator privileges.
          Contact the event system owner.
        </Notice>
      </div>
    );
  }

  return <Outlet />;
}

function AdminEntry() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <LoadingState />
      </div>
    );
  }

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <LoginPage />;
}

function SetupNotice() {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <div className="setup-banner">
      <b>Demo configuration:</b> Supabase is not connected.
      Public pages may show empty states until you configure
      your environment and database.
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <SetupNotice />

      <Routes>
        {/* Public pages */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />

          <Route
            path="sports"
            element={<ListingPage type="sports" />}
          />
          <Route path="sports/:id" element={<DetailPage />} />

          <Route
            path="teams"
            element={<ListingPage type="teams" />}
          />
          <Route path="teams/:id" element={<DetailPage />} />

          <Route
            path="schedule"
            element={<ListingPage type="schedule" />}
          />
          <Route path="matches/:id" element={<DetailPage />} />

          <Route
            path="brackets"
            element={<ListingPage type="brackets" />}
          />
          <Route
            path="standings"
            element={<ListingPage type="standings" />}
          />
          <Route
            path="results"
            element={<ListingPage type="results" />}
          />
          <Route
            path="news"
            element={<ListingPage type="news" />}
          />
          <Route
            path="about"
            element={<ListingPage type="about" />}
          />
        </Route>

        {/* Admin login */}
        <Route
          path="/admin/login"
          element={<AdminEntry />}
        />

        {/* Protected admin pages */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />

            <Route
              path="sports"
              element={<ResourcePage resource="sports" />}
            />
            <Route
              path="teams"
              element={<ResourcePage resource="teams" />}
            />
            <Route
              path="players"
              element={<ResourcePage resource="players" />}
            />
            <Route
              path="schedules"
              element={<ResourcePage resource="schedules" />}
            />
            <Route
              path="matches"
              element={<ResourcePage resource="matches" />}
            />

            {/* Live Scoreboard */}
            <Route
              path="live-scores"
              element={<LiveScorePage />}
            />

            <Route
              path="brackets"
              element={<ResourcePage resource="brackets" />}
            />
            <Route
              path="standings"
              element={<ResourcePage resource="standings" />}
            />
            <Route
              path="best-player"
              element={<ResourcePage resource="best-player" />}
            />
            <Route
              path="news"
              element={<ResourcePage resource="news" />}
            />
            <Route
              path="settings"
              element={<ResourcePage resource="settings" />}
            />
            <Route
              path="audit-log"
              element={<ResourcePage resource="audit-log" />}
            />
          </Route>
        </Route>

        {/* Not found */}
        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
