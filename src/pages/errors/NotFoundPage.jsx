
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <Trophy size={42} />

      <span className="eyebrow">
        404 · OUT OF BOUNDS
      </span>

      <h1>This page isn't on the scoreboard.</h1>

      <p>
        The page you're looking for may have moved or may not exist.
      </p>

      <Link className="button button-dark" to="/">
        <ArrowLeft size={16} />
        Back to home
      </Link>
    </div>
  );
}
