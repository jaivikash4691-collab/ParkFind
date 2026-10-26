import React from 'react';
import { motion } from 'framer-motion';
import { Car, Zap, Accessibility, ShieldCheck } from 'lucide-react';

export function BayMatrix({ slots = [], selectedSlot = null, onSelectSlot = () => {} }) {
  if (!slots || slots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        No bays configured on this level.
      </div>
    );
  }

  // Group slots by row name or bay_row
  const rowsMap = {};
  slots.forEach((s) => {
    const rowName = s.row_name || s.rowName || `Aisle ${s.bay_row || s.bayRow || 1}`;
    if (!rowsMap[rowName]) {
      rowsMap[rowName] = [];
    }
    rowsMap[rowName].push(s);
  });

  const getSlotTypeIcon = (type) => {
    switch (type) {
      case 'ev_charging':
        return <Zap size={14} style={{ color: '#0ea5e9' }} />;
      case 'accessible':
        return <Accessibility size={14} style={{ color: '#8b5cf6' }} />;
      case 'compact':
        return <Car size={13} style={{ color: '#64748b' }} />;
      default:
        return <Car size={14} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div className="bay-matrix-container">
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success)' }} />
          Available
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-primary)' }} />
          Selected
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--warning)' }} />
          Reserved
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger)' }} />
          Occupied
        </span>
      </div>

      {Object.entries(rowsMap).map(([rowName, rowSlots]) => {
        const availableInRow = rowSlots.filter((s) => s.status === 'available').length;

        return (
          <div key={rowName} className="bay-lane-row">
            <div className="bay-lane-header">
              <span className="bay-lane-name">{rowName}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {availableInRow} of {rowSlots.length} available
              </span>
            </div>

            <div className="bay-grid-row">
              {rowSlots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                const slotNo = slot.slot_no || slot.slotNo;
                const slotType = slot.slot_type || slot.slotType;
                const isAvailable = slot.status === 'available';

                return (
                  <motion.div
                    key={slot.id}
                    whileHover={isAvailable ? { scale: 1.04, y: -2 } : {}}
                    whileTap={isAvailable ? { scale: 0.96 } : {}}
                    onClick={() => isAvailable && onSelectSlot(slot)}
                    className={`slot-tile ${slot.status} ${isSelected ? 'selected' : ''}`}
                    title={`${slotNo} (${slotType}) — ${slot.status}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {getSlotTypeIcon(slotType)}
                    </div>
                    <div className="slot-tile-number">{slotNo}</div>
                    <div className="slot-tile-status-tag">
                      {isSelected ? 'SELECTED' : slot.status}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
