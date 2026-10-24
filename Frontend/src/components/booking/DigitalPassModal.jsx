import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { RiveParkingVisual } from '../visual/RiveParkingVisual';
import { BorderGlow } from '../animation/BorderGlow';
import { GlareHover } from '../animation/GlareHover';
import { Printer, Navigation, QrCode, CheckCircle, Shield } from 'lucide-react';

export function DigitalPassModal({ isOpen, onClose, bookingResult }) {
  const navigate = useNavigate();

  if (!bookingResult) return null;

  const booking = bookingResult.booking || bookingResult;
  const payment = bookingResult.payment || {};

  const handleGoToWayfinding = () => {
    onClose();
    navigate('/find-car');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Digital Parking Access Pass"
      subtitle="Present this QR credential at the automated entrance barrier"
      maxWidth="460px"
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
            style={{ gap: 6 }}
          >
            <Printer size={16} /> Print Pass
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGoToWayfinding}
            style={{ gap: 6 }}
          >
            <Navigation size={16} /> Indoor Wayfinding →
          </button>
        </>
      }
    >
      <div style={{ textAlign: 'center' }}>
        {/* Celebration & Pass Container */}
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <RiveParkingVisual type="success" width={72} height={72} />
        </div>

        <BorderGlow
          animated={true}
          borderRadius="20px"
          glowColor="var(--accent-primary, #00d2ff)"
          gradientColors={['#00d2ff', '#3b82f6', '#10b981']}
          glowIntensity={0.85}
          backgroundColor="var(--bg-elevated)"
        >
          <GlareHover
            borderRadius="18px"
            glareColor="rgba(255, 255, 255, 0.2)"
            glareOpacity={0.35}
            style={{ padding: '1.5rem', textAlign: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.06em', fontSize: '0.9rem' }}>PARKIT</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· ACCESS PASS</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: '0.5rem' }}>
              <span className="badge badge-success" style={{ gap: 4 }}>
                <CheckCircle size={12} /> Confirmed &amp; Active
              </span>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--accent-primary)',
                letterSpacing: '0.04em',
              }}
            >
              {booking.bookingRef || booking.booking_ref}
            </div>

            {payment.transactionRef && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                Txn: {payment.transactionRef}
              </div>
            )}

            {/* QR Code Simulation Graphic */}
            <div
              style={{
                margin: '1.25rem auto',
                width: 140,
                height: 140,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#ffffff',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <QrCode size={100} style={{ color: '#0f172a' }} />
              <span style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: '#64748b', fontWeight: 800, marginTop: 4 }}>
                BARRIER SCAN
              </span>
            </div>

            {/* Key Access Attributes */}
            <div
              style={{
                textAlign: 'left',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reserved Bay:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                  Bay {booking.slotNo || booking.slot_no}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vehicle Plate:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{booking.vehicleNumber || booking.vehicle_number}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Valid Until:</span>
                <strong>
                  {booking.endTime ? new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Session Active'}
                </strong>
              </div>
            </div>
          </GlareHover>
        </BorderGlow>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
          <span>Automated gate barrier recognizes this vehicle plate on entry</span>
        </div>
      </div>
    </Modal>
  );
}
