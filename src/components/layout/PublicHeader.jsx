
import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {Menu, X } from 'lucide-react';

const links = [
  ['Home', '/'],
  ['Sports', '/sports'],
  ['Teams', '/teams'],
  ['Schedule', '/schedule'],
  ['Results', '/results'],
  ['News', '/news'],
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="public-header">
      <div className="header-inner">
        <Link to="/" className="brand">
  <span className="brand-mark">
    <img src="/assets/csg-logo.png" alt="Central Student Government Logo" />
  </span>

  <span>
    <b>
      LCC <em>Palaro</em>
    </b>
    <small>Lipa City Colleges</small>
  </span>
</Link>

        <button
          className="mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>

        <nav className={open ? 'nav-links nav-open' : 'nav-links'}>
          {links.map(([label, to]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
