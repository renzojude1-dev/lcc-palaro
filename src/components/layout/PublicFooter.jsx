
import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Mail } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <span className="brand-mark">
            <Trophy size={22} />
          </span>

          <div>
            <b>LCC Palaro</b>
            <p>The spirit of competition. The pride of LCC.</p>
          </div>
        </div>

        <div>
          <b>Explore</b>
          <Link to="/schedule">Match schedule</Link>
          <Link to="/standings">Standings</Link>
          <Link to="/results">Results</Link>
        </div>

        <div>
          <b>Event</b>
          <Link to="/about">About Palaro</Link>
          <Link to="/news">News &amp; announcements</Link>

          <a href="mailto:info@lcc.edu.ph">
            <Mail size={14} />
            Contact event organizers
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Lipa City Colleges Palaro
        </span>
        <span>Made for the LCC community</span>
      </div>
    </footer>
  );
}
