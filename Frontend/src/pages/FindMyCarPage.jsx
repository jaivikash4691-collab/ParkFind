import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveSession } from '../context/ActiveSessionContext';
import { RiveParkingVisual } from '../components/visual/RiveParkingVisual';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Car,
  Search,
  Navigation,
  Clock,
  Printer,
  Plus,
  Footprints,
  Compass,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export function FindMyCarPage() {
  const navigate = useNavigate();
  const { activeSession, formattedRemainingTime, quickExtend, locateCar, loading } = useActiveSession();

  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    locateCar(searchTerm.trim());
  };

  // Group floor slots by row for the wayfinding diagram
  const rowsMap = {};
  if (activeSession && activeSession.floorSlots) {
    activeSession.floorSlots.forEach((slot) => {
      const rName = slot.rowName || `Aisle ${slot.bayRow || 1}`;
      if (!rowsMap[rName]) rowsMap[rName] = [];
      rowsMap[rName].push(slot);
    });
  }

  return (
    <div className="app-container">
      {/* Header & Plate Lookup Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
            Smart Wayfinding &amp; Vehicle Locator
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
            Find My Parked Car
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Turn-by-turn pedestrian routing, active countdown timer, and facility floor maps.
          </p>
        </div>

        {/* License Plate Search Form */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: 420 }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Enter License Plate or Booking Ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="form-input"
              style={{ paddingLeft: 38, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Locate
          </button>
        </form>
      </div>

      {activeSession ? (
        <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '2rem', alignItems: 'flex-start' }}>
          {/* Left Column: Active Vehicle Card (5 Cols on Desktop) */}
          <div style={{ gridColumn: 'span 5 / span 5' }} className="md-col-span-12">
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge badge-success" style={{ gap: 6 }}>
                  <span className="pulse-dot" style={{ backgroundColor: '#ffffff' }} /> Active Parking Session
                </span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  Ref: {activeSession.bookingRef}
                </span>
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.04em',
                  marginBottom: '1rem',
                }}
              >
                {activeSession.vehicleNumber}
              </h2>

              {/* Bay & Level Snapshot */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Facility:</span>
                  <strong>{activeSession.locationName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Level / Floor:</span>
                  <strong>{activeSession.floorName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Row / Section:</span>
                  <strong>{activeSession.rowName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Parked Bay:</span>
                  <strong
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.25rem',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    Bay {activeSession.slotNo}
                  </strong>
                </div>
              </div>

              {/* Time Remaining Timer Display */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.12))',
                  border: '1px solid var(--accent-border)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-text)', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Time Remaining
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '2.4rem',
                    fontWeight: 900,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {formattedRemainingTime}
                </div>
              </div>

              {/* Session Extension and Print Pass Actions */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => quickExtend(1)}
                  className="btn btn-secondary"
                  style={{ flex: 1, gap: 6 }}
                >
                  <Plus size={16} /> +1 Hr Extension
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-outline"
                  style={{ flex: 1, gap: 6 }}
                >
                  <Printer size={16} /> Print Pass
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Indoor Wayfinding Canvas (7 Cols on Desktop) */}
          <div style={{ gridColumn: 'span 7 / span 7' }} className="md-col-span-12">
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Indoor Level Wayfinding Schematic
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {activeSession.locationName} · {activeSession.floorName} ({activeSession.rowName})
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-primary)' }} />
                    Your Car
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success)' }} />
                    Pedestrian Gate A
                  </span>
                </div>
              </div>

              {/* Entry Barrier Gate Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--success-surface)',
                  border: '1px solid var(--success-border)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--success-text)' }}>
                  <span>🚪 Main Pedestrian Gate A (Entry / Elevator Access)</span>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  Floor: {activeSession.floorName}
                </span>
              </div>

              {/* Visual Multi-Aisle Layout */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px dashed var(--border-medium)',
                  marginBottom: '1.25rem',
                }}
              >
                {Object.entries(rowsMap).map(([rowName, slots]) => (
                  <div key={rowName} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      {rowName}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.5rem' }}>
                      {slots.map((slot) => {
                        const isUserCar = slot.isUserSlot || slot.slotNo === activeSession.slotNo;
                        return (
                          <div
                            key={slot.id}
                            style={{
                              padding: '0.65rem 0.4rem',
                              borderRadius: 'var(--radius-md)',
                              border: `2px solid ${isUserCar ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                              backgroundColor: isUserCar ? 'var(--accent-surface)' : 'var(--bg-surface)',
                              boxShadow: isUserCar ? 'var(--shadow-glow)' : 'none',
                              textAlign: 'center',
                              transform: isUserCar ? 'scale(1.06)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>
                              {isUserCar ? '🚘' : '🅿️'}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 800 }}>
                              {slot.slotNo}
                            </div>
                            {isUserCar && (
                              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--accent-text)', textTransform: 'uppercase' }}>
                                YOUR CAR
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Step-by-Step Walking Directions */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: '1rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-surface)',
                  border: '1px solid var(--accent-border)',
                }}
              >
                <Footprints size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
                    Step-by-step Pedestrian Walking Directions
                  </strong>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {activeSession.directions ||
                      `Enter through Gate A, proceed down the main pedestrian walkway to ${activeSession.rowName}, your vehicle is parked in Bay ${activeSession.slotNo}.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="🚗"
          title="No Active Parking Session"
          description="Enter your vehicle license plate number or booking reference above to track an active session, or explore guaranteed spaces across Coimbatore."
          action={
            <button onClick={() => navigate('/explore')} className="btn btn-primary btn-sm">
              Explore &amp; Book Parking →
            </button>
          }
        />
      )}
    </div>
  );
}
