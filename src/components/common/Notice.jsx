
import React from 'react';

export default function Notice({ type = 'info', children }) {
  return (
    <div
      className={`notice notice-${type}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
