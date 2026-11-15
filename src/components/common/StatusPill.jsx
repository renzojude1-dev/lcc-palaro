
import React from 'react';
import { CircleDot } from 'lucide-react';
import { titleCase } from '../../lib/formatters';

export default function StatusPill({ status }) {
  const currentStatus = status || 'unknown';

  return (
    <span className={`status status-${currentStatus}`}>
      {currentStatus === 'in_progress' && <CircleDot size={11} />}
      {' '}
      {titleCase(currentStatus)}
    </span>
  );
}
