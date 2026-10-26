import React from 'react';

export function EmptyState({ icon = '🅿️', title, description, action }) {
  return (
    <div
      className="card flex flex-col items-center justify-center text-center"
      style={{ padding: '3.5rem 2rem', gap: '0.75rem' }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>{icon}</div>
      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
        {title}
      </h4>
      {description && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 400 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
    </div>
  );
}
