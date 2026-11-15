
import React from 'react';

export default function EmptyState({
  title = 'Nothing to display',
  description = '',
  action = null,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <h3>{title}</h3>

        {description && <p>{description}</p>}

        {action && <div className="empty-state-action">{action}</div>}
      </div>
    </div>
  );
}
