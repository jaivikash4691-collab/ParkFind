import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrScannerModal } from '../components/owner/QrScannerModal';
import { BorderGlow } from '../components/animation/BorderGlow';
import { GlareHover } from '../components/animation/GlareHover';
import {
  QrCode,
  ShieldCheck,
  Camera,
  Search,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Building2,
  Lock
} from 'lucide-react';

export function QrScannerPage() {
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(true);
  const [recentScans, setRecentScans] = useState([]);

  const handleValidationSuccess = (booking) => {
    setRecentScans((prev) => [
      {
        ...booking,
        scannedAt: new Date()
      },
      ...prev.slice(0, 9)
    ]);
  };

  return (
    <div className="app-container">
      {/* Top Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          onClick={() => navigate('/owner/bookings')}
          className="btn btn-secondary btn-sm"
          style={{ gap: 6 }}
        >
          <ArrowLeft size={15} /> Back to Gate Bookings
        </button>

        <span className="badge badge-success" style={{ gap: 6 }}>
          <ShieldCheck size={14} /> Barrier Gate Verification Engine Active
        </span>
      </div>

      <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '2rem', alignItems: 'flex-start' }}>
        {/* Left Column: Scanner CTA Card */}
        <div style={{ gridColumn: 'span 7 / span 7' }} className="md-col-span-12">
          <BorderGlow
            animated={true}
            borderRadius="20px"
            glowColor="var(--accent-primary, #00d2ff)"
            glowIntensity={0.85}
            backgroundColor="var(--bg-surface)"
          >
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  margin: '0 auto 1.25rem auto',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.2), rgba(0, 112, 243, 0.2))',
                  border: '2px solid var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}
              >
                <QrCode size={42} />
              </div>

              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Automated Gate QR Scanner
              </h2>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 1.5rem auto' }}>
                Verify incoming customer parking access passes in real-time. Prevents pass reuse, checks booking time windows, and automatically opens the barrier arm.
              </p>

              <GlareHover borderRadius="12px" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.4}>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="btn btn-primary btn-lg"
                  style={{ gap: 8, padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 800 }}
                >
                  <Camera size={18} /> Launch Gate Scanner Modal
                </button>
              </GlareHover>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={13} style={{ color: 'var(--accent-primary)' }} /> Single-use tokens
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={13} style={{ color: 'var(--success)' }} /> Facility authorized
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={13} style={{ color: '#f59e0b' }} /> Bay matrix sync
                </span>
              </div>
            </div>
          </BorderGlow>
        </div>

        {/* Right Column: Recent Gate Scans Log */}
        <div style={{ gridColumn: 'span 5 / span 5' }} className="md-col-span-12">
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-primary)' }} /> Recent Scan History
            </h3>

            {recentScans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                <div style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.9rem' }}>No scans recorded this session</div>
                <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Passes scanned with the camera will appear here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="badge badge-success font-mono" style={{ fontSize: '0.7rem' }}>
                          Bay {scan.slotNo}
                        </span>
                        <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {scan.vehicleNumber}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {scan.driverName} · {scan.bookingRef}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                        {new Date(scan.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scanner Modal Component */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onValidationSuccess={handleValidationSuccess}
      />
    </div>
  );
}
