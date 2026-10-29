import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Modal } from '../ui/Modal';
import { RiveParkingVisual } from '../visual/RiveParkingVisual';
import { BorderGlow } from '../animation/BorderGlow';
import { GlareHover } from '../animation/GlareHover';
import { bookingsApi } from '../../api/bookings';
import { useToast } from '../../context/ToastContext';
import {
  Printer,
  Navigation,
  Download,
  CheckCircle,
  Clock,
  Shield,
  MapPin,
  Car,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export function DigitalPassModal({ isOpen, onClose, bookingResult }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const canvasRef = useRef(null);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(true);
  const [passData, setPassData] = useState(null);

  const booking = bookingResult?.booking || bookingResult;
  const payment = bookingResult?.payment || {};

  useEffect(() => {
    if (!isOpen || !booking) return;

    let isMounted = true;

    async function loadQrCode() {
      try {
        setLoadingQr(true);

        // 1. If bookingResult already contains qrPayload or qrPassToken
        let payloadString = '';
        if (booking.qrPayload) {
          payloadString = typeof booking.qrPayload === 'string'
            ? booking.qrPayload
            : JSON.stringify(booking.qrPayload);
          setPassData(booking);
        } else if (booking.qrPassToken) {
          payloadString = JSON.stringify({
            token: booking.qrPassToken,
            ref: booking.bookingRef || booking.booking_ref,
            bid: booking.bookingId || booking.id
          });
          setPassData(booking);
        } else {
          // Fetch from backend secure QR pass endpoint
          const identifier = booking.bookingRef || booking.booking_ref || booking.id;
          const res = await bookingsApi.getQrPass(identifier);
          if (res?.data) {
            payloadString = res.data.qrPayload;
            setPassData({ ...booking, ...res.data });
          } else {
            // Fallback payload with reference
            payloadString = JSON.stringify({
              ref: booking.bookingRef || booking.booking_ref,
              bid: booking.id
            });
            setPassData(booking);
          }
        }

        if (!isMounted) return;

        // Generate QR Data URL with sharp contrast and clean margin
        const url = await QRCode.toDataURL(payloadString || 'PARKIT-PASS', {
          width: 260,
          margin: 2,
          color: {
            dark: '#0a101f',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });

        if (isMounted) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate QR pass:', err);
        if (isMounted) {
          showToast('Failed to generate QR code credential.', 'danger');
        }
      } finally {
        if (isMounted) {
          setLoadingQr(false);
        }
      }
    }

    loadQrCode();

    return () => {
      isMounted = false;
    };
  }, [isOpen, booking, showToast]);

  if (!booking) return null;

  const currentPass = passData || booking;
  const bookingRef = currentPass.bookingRef || currentPass.booking_ref || 'PK-PASS';
  const slotNo = currentPass.slotNo || currentPass.slot_no || '--';
  const vehicleNo = currentPass.vehicleNumber || currentPass.vehicle_number || '--';
  const locationName = currentPass.locationName || currentPass.location_name || 'Parking Facility';
  const address = currentPass.address || currentPass.area || 'Coimbatore';

  const startTimeStr = currentPass.startTime || currentPass.start_time;
  const endTimeStr = currentPass.endTime || currentPass.end_time;

  const handleDownloadPass = () => {
    if (!qrDataUrl) return;

    // Create an offscreen composite canvas for a high-quality printable pass card
    const passCanvas = document.createElement('canvas');
    passCanvas.width = 600;
    passCanvas.height = 840;
    const ctx = passCanvas.getContext('2d');

    // Card background
    ctx.fillStyle = '#0a101f';
    ctx.fillRect(0, 0, 600, 840);

    // Decorative top border
    const gradient = ctx.createLinearGradient(0, 0, 600, 0);
    gradient.addColorStop(0, '#00d2ff');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#10b981');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 8);

    // Header title
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('PARKIT SMART PARKING PASS', 40, 56);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Coimbatore Urban Mobility Platform', 40, 82);

    // Reference code
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillText(bookingRef, 40, 130);

    // Facility details
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(locationName, 40, 170);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(address, 40, 195);

    // Draw the QR Code image
    const qrImg = new Image();
    qrImg.onload = () => {
      // White container box for QR code
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(175, 230, 250, 250, 16);
      ctx.fill();

      ctx.drawImage(qrImg, 185, 240, 230, 230);

      // Pass Details Grid Box
      ctx.fillStyle = '#141d33';
      ctx.roundRect(40, 510, 520, 250, 14);
      ctx.fill();

      // Bay info
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('RESERVED BAY', 65, 550);
      ctx.fillStyle = '#00d2ff';
      ctx.font = 'bold 24px "SF Mono", Menlo, monospace';
      ctx.fillText(`Bay ${slotNo}`, 65, 582);

      // Vehicle plate
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('VEHICLE PLATE', 320, 550);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "SF Mono", Menlo, monospace';
      ctx.fillText(vehicleNo, 320, 582);

      // Valid Window
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('VALID SESSION WINDOW', 65, 635);
      ctx.fillStyle = '#10b981';
      ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const windowStr = startTimeStr && endTimeStr
        ? `${new Date(startTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(endTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date(startTimeStr).toLocaleDateString()})`
        : 'Session Confirmed & Active';
      ctx.fillText(windowStr, 65, 665);

      // Verification footnote
      ctx.fillStyle = '#64748b';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Scan this QR at the entrance barrier or present to parking staff.', 65, 725);

      // Download triggered
      const link = document.createElement('a');
      link.download = `Parkit_Pass_${bookingRef}.png`;
      link.href = passCanvas.toDataURL('image/png');
      link.click();
      showToast('QR Pass saved to your downloads!', 'success');
    };
    qrImg.src = qrDataUrl;
  };

  const handleGoToAssistant = () => {
    onClose();
    navigate('/parking-assistant');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Digital Parking Access Pass"
      subtitle="Present this QR credential at the automated entrance barrier"
      maxWidth="480px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadPass}
              disabled={!qrDataUrl}
              style={{ gap: 6 }}
            >
              <Download size={14} /> Save PNG
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => window.print()}
              style={{ gap: 6 }}
            >
              <Printer size={14} /> Print
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleGoToAssistant}
            style={{ gap: 6 }}
          >
            <Sparkles size={14} /> Parking Assistant →
          </button>
        </div>
      }
    >
      <div style={{ textAlign: 'center' }}>
        {/* Celebration Visual */}
        <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          <RiveParkingVisual type="success" width={68} height={68} />
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.06em', fontSize: '0.9rem' }}>PARKIT</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· ACCESS PASS</span>
              </div>
              <span className="badge badge-success" style={{ gap: 4 }}>
                <CheckCircle size={11} /> Verified Active
              </span>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.35rem',
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '0.04em',
                marginBottom: 2
              }}
            >
              {bookingRef}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {locationName} · {address}
            </div>

            {/* Generated QR Code Container */}
            <div
              style={{
                margin: '0.85rem auto',
                width: 200,
                height: 200,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#ffffff',
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                border: '2px solid rgba(0, 210, 255, 0.3)',
              }}
            >
              {loadingQr ? (
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Generating QR...</div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Pass for ${bookingRef}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>QR generation failed</div>
              )}
            </div>

            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Barrier Scanner / Staff Scan
            </span>

            {/* Key Access Attributes */}
            <div
              style={{
                textAlign: 'left',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                paddingTop: '0.85rem',
                marginTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reserved Bay:</span>
                <span className="badge badge-primary font-mono" style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                  Bay {slotNo}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vehicle Plate:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{vehicleNo}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Session Window:</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {startTimeStr && endTimeStr
                    ? `${new Date(startTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(endTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Active'}
                </span>
              </div>

              {payment.transactionRef && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  <span>Txn Ref:</span>
                  <span className="font-mono">{payment.transactionRef}</span>
                </div>
              )}
            </div>
          </GlareHover>
        </BorderGlow>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.85rem' }}>
          <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
          <span>Single-use encrypted token · Encrypted gate barrier verification</span>
        </div>
      </div>
    </Modal>
  );
}
