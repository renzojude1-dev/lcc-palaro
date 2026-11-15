
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV } from '../lib/constants';
import * as Icons from 'lucide-react';
import {
  LogOut,
  ExternalLink,
  Menu,
} from 'lucide-react';

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);

  async function logout() {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }

  return (
    <div className="admin-shell">
      <aside
        className={`admin-sidebar ${
          mobile ? 'sidebar-open' : ''
        }`}
      >
        <NavLink to="/admin" className="admin-brand">
          <span className="brand-mark">
  <img src="/assets/csg-logo.png" alt="Central Student Government Logo" />
</span>

          <span>
            <b>LCC Palaro</b>
            <small>Management Console</small>
          </span>
        </NavLink>

        <div className="sidebar-event">
          <span className="live-dot" />
          EVENT CONTROL <b>2026</b>
        </div>

        <nav className="admin-nav">
          {ADMIN_NAV.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <small>{group.label}</small>

              {group.items.map(([label, to, icon]) => {
                const Icon = Icons[icon] || Icons.Circle;

                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/admin'}
                    onClick={() => setMobile(false)}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-user">
            <span className="avatar">
              {(
                profile?.display_name ||
                profile?.email ||
                'A'
              )
                .slice(0, 1)
                .toUpperCase()}
            </span>

            <span>
              <b>
                {profile?.display_name || 'Administrator'}
              </b>
              <small>{profile?.role || 'Admin'}</small>
            </span>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={logout}
          >
            <LogOut size={16} />
            Sign out
          </button>

          <NavLink to="/" className="view-site">
            <ExternalLink size={15} />
            View public site
          </NavLink>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <button
            type="button"
            className="icon-button mobile-admin-menu"
            onClick={() => setMobile(!mobile)}
            aria-label="Toggle admin menu"
            aria-expanded={mobile}
          >
            <Menu />
          </button>

          <div>
            <span className="breadcrumb">
              LCC PALARO / <b>ADMINISTRATION</b>
            </span>
          </div>

          <span className="topbar-tag">
            Secure admin area
          </span>
        </header>

        <div className="admin-page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
