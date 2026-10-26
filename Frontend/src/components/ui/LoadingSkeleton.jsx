import React from 'react';

export function LoadingSkeleton({ count = 3, height = 120, className = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`card ${className}`}
          style={{
            height,
            background: 'linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-elevated) 50%, var(--bg-surface) 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeletonShimmer 1.8s infinite linear',
            border: '1px solid var(--border-subtle)',
          }}
        />
      ))}
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
