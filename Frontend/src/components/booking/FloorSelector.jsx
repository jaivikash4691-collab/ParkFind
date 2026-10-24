import React from 'react';
import { Layers } from 'lucide-react';

export function FloorSelector({ floors = [], activeFloorId, onSelectFloor }) {
  if (!floors || floors.length <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.25rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginRight: 4 }}>
        <Layers size={14} /> LEVEL:
      </div>

      {floors.map((floor) => {
        const isActive = floor.id === activeFloorId;
        const availableCount = (floor.slots || []).filter((s) => s.status === 'available').length;

        return (
          <button
            key={floor.id}
            type="button"
            onClick={() => onSelectFloor(floor.id)}
            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              gap: 6,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span>{floor.floorName || floor.floor_name}</span>
            <span
              className={`badge ${isActive ? 'badge-primary' : 'badge-neutral'}`}
              style={{
                fontSize: '0.65rem',
                padding: '1px 5px',
                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              {availableCount} open
            </span>
          </button>
        );
      })}
    </div>
  );
}
