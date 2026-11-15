
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  LockKeyhole,
  Mail,
  ArrowLeft,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import Notice from '../../components/common/Notice';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();

    setError('');

    if (!isSupabaseConfigured) {
      setError(
        'Supabase is not configured. Check your local .env file.'
      );
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Please enter your email address and password.');
      return;
    }

    setLoading(true);

    try {
      await signIn(normalizedEmail, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-decoration">
        <span className="login-orbit" />

        <span className="login-trophy">
          <Trophy size={88} />
        </span>

        <div>
          <span className="eyebrow">LIPA CITY COLLEGES</span>

          <h1>
            Every match
            <br />
            matters.
          </h1>

          <p>
            The control room for a competition built on teamwork,
            pride, and sportsmanship.
          </p>
        </div>

        <small>
          PALARO MANAGEMENT SYSTEM · SECURE ACCESS
        </small>
      </div>

      <div className="login-panel">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          Return to public site
        </Link>

        <div className="login-form-wrap">
          <span className="login-logo">
            <Trophy size={25} />
          </span>

          <span className="eyebrow">ADMINISTRATOR ACCESS</span>

          <h2>Welcome back</h2>

          <p>
            Sign in to manage events, schedules, and live results.
          </p>

          {!isSupabaseConfigured && (
            <Notice type="error">
              Supabase is not configured yet. Add
              {' '}
              VITE_SUPABASE_URL
              {' '}
              and
              {' '}
              VITE_SUPABASE_ANON_KEY
              {' '}
              to your local .env file, then restart the development
              server.
            </Notice>
          )}

          {error && (
            <Notice type="error">{error}</Notice>
          )}

          <form onSubmit={submit} className="form-stack">
            <label>
              Email address

              <span className="input-with-icon">
                <Mail size={17} />

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="username"
                  placeholder="admin@lcc.edu.ph"
                  disabled={loading}
                />
              </span>
            </label>

            <label>
              Password

              <span className="input-with-icon">
                <LockKeyhole size={17} />

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </span>
            </label>

            <button
              type="submit"
              className="button button-dark button-full"
              disabled={loading || !isSupabaseConfigured}
            >
              {loading ? 'Signing in…' : 'Sign in securely'}
            </button>
          </form>

          <p className="login-security">
            <LockKeyhole size={14} />
            Access is restricted to authorized administrators.
          </p>
        </div>

        <small className="login-copyright">
          © {new Date().getFullYear()} Lipa City Colleges
        </small>
      </div>
    </div>
  );
}
