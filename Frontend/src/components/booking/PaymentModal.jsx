import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../ui/Modal';
import { bookingsApi } from '../../api/bookings';
import { LatticeLoader } from '../animation/LatticeLoader';
import { GlareHover } from '../animation/GlareHover';
import { useToast } from '../../context/ToastContext';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { useAuth } from '../../context/AuthContext';
import {
  Smartphone,
  Download,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';

export function PaymentModal({
  isOpen,
  onClose,
  location,
  slot,
  duration,
  vehicleNumber,
  driverName,
  driverPhone,
  existingBooking = null,
  onPaymentSuccess,
}) {
  const { showToast } = useToast();
  const { refreshActiveSession } = useActiveSession();
  const { isAuthenticated } = useAuth();

  const [step, setStep] = useState(existingBooking ? 'qr_payment' : 'confirm');
  const [processing, setProcessing] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(existingBooking);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (existingBooking) {
      setStep('qr_payment');
      setCreatedBooking(existingBooking);
      if (existingBooking.customerUtr) {
        setUtrInput(existingBooking.customerUtr);
        setUtrSubmitted(true);
      }
    } else {
      setStep('confirm');
      setCreatedBooking(null);
      setUtrSubmitted(false);
      setUtrInput('');
    }
  }, [existingBooking, isOpen]);

  // Generate QR code whenever createdBooking changes
  useEffect(() => {
    const upiUri = createdBooking?.upiUri || createdBooking?.payment?.upiUri;
    if (upiUri) {
      QRCode.toDataURL(upiUri, {
        width: 280,
        margin: 2,
        color: {
          dark: '#050a14',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate UPI QR code:', err));
    }
  }, [createdBooking]);

  if (!isOpen) return null;

  const hourlyRate = location?.hourlyRate || location?.hourly_rate || 40;
  const totalAmount = createdBooking?.totalAmount || createdBooking?.amount || (hourlyRate * (duration || 1));
  const slotNo = slot?.slot_no || slot?.slotNo || createdBooking?.slotNo;
  const facilityName = location?.name || createdBooking?.locationName || 'Parkit Facility';

  const handleConfirmReservation = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to reserve your parking spot.', 'warning');
      onClose();
      return;
    }
    setProcessing(true);
    try {
      const payload = {
        slot_id: slot.id,
        duration_hours: duration,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        payment_method: 'upi',
      };

      const result = await bookingsApi.create(payload);
      setCreatedBooking(result);
      setStep('qr_payment');
      await refreshActiveSession();
      showToast('Reservation created! Please pay directly to space owner via UPI.', 'info');
      if (onPaymentSuccess) {
        onPaymentSuccess(result);
      }
    } catch (err) {
      if (err.message && err.message.includes('already reserved')) {
        showToast('That bay was just reserved by another driver. Please choose another bay.', 'danger');
      } else {
        showToast(err.message || 'Failed to initiate reservation', 'danger');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Parkit-UPI-Payment-${createdBooking?.bookingRef || 'QR'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Owner Payment QR code downloaded!', 'info');
  };

  const handleCopyUpiId = () => {
    const upiId = createdBooking?.ownerUpiId || createdBooking?.payment?.ownerUpiId;
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    showToast(`UPI ID ${upiId} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmitUtr = async (e) => {
    e?.preventDefault();
    if (!utrInput.trim()) {
      showToast('Please enter your 12-digit UPI transaction reference or UTR number.', 'warning');
      return;
    }
    setSubmittingUtr(true);
    try {
      const bookingId = createdBooking?.bookingId || createdBooking?.id;
      await bookingsApi.submitUtr(bookingId, utrInput.trim());
      setUtrSubmitted(true);
      showToast('UPI transaction reference saved! Space owner will verify.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to record transaction reference', 'danger');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const ownerUpi = createdBooking?.ownerUpiId || createdBooking?.payment?.ownerUpiId || 'owner@okhdfcbank';
  const ownerName = createdBooking?.ownerUpiName || createdBooking?.payment?.ownerUpiName || 'Space Owner';
  const upiUri = createdBooking?.upiUri || createdBooking?.payment?.upiUri;
  const bookingRef = createdBooking?.bookingRef || createdBooking?.payment?.bookingRef;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'confirm' ? 'Confirm Parking Reservation' : 'Pay Direct to Parking Owner'}
      subtitle={
        step === 'confirm'
          ? 'Review reservation details and generate direct UPI payment QR'
          : `Scan & transfer ₹${totalAmount} directly to ${ownerName}`
      }
      maxWidth="500px"
      footer={
        processing ? null : step === 'confirm' ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>
              Cancel
            </button>
            <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.4}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmReservation}
                disabled={processing}
                style={{ minWidth: 180, fontWeight: 700 }}
              >
                Confirm &amp; Generate QR →
              </button>
            </GlareHover>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Status: <strong style={{ color: '#f59e0b' }}>Pending Verification</strong>
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Done / Close
            </button>
          </div>
        )
      }
    >
      {processing ? (
        <div style={{ padding: '3rem 1rem', display: 'flex', justifyContent: 'center' }}>
          <LatticeLoader
            status="working"
            pattern="pulse"
            shape="round"
            size="lg"
            message="Creating reservation & generating owner UPI QR..."
            showTimer={true}
          />
        </div>
      ) : step === 'confirm' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Reservation Summary */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Parking Facility:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{facilityName}</strong>
            </div>
            {slotNo && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reserved Bay:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                  {slotNo}
                </strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
              <span>{duration} Hour(s)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Vehicle Plate:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{vehicleNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Driver:</span>
              <span>{driverName} ({driverPhone})</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
                Total Parking Fee
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                ₹{hourlyRate} × {duration} hr(s) · Direct Owner Payment
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              ₹{totalAmount}
            </div>
          </div>

          {/* Direct UPI Notice */}
          <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <Smartphone size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Direct UPI Payment:</strong> You will pay the parking fee directly to the parking facility owner via QR code. 0% middleman fees.
            </span>
          </div>
        </div>
      ) : (
        /* STEP 2: UPI PAYMENT QR VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
          {/* Status Alert Banner */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f59e0b' }}>
                Payment Pending
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Ref: {bookingRef}
            </span>
          </div>

          {/* QR Code Container */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-xl)',
              background: '#ffffff',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`UPI Payment QR for ${ownerName}`}
                style={{ width: 220, height: 220, display: 'block', borderRadius: 'var(--radius-md)' }}
              />
            ) : (
              <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LatticeLoader status="working" size="sm" />
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Scan with any UPI App
              </span>
              <div style={{ fontSize: '0.625rem', color: '#64748b' }}>
                GPay · PhonePe · Paytm · BHIM
              </div>
            </div>
          </div>

          {/* Recipient & Amount Details Card */}
          <div
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Recipient Owner:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{ownerName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Owner UPI ID:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <code style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  {ownerUpi}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedUpi ? '#34d399' : 'var(--text-muted)',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Facility:</span>
              <span>{facilityName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Exact Amount Due:</strong>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--accent-primary)' }}>
                ₹{totalAmount}
              </strong>
            </div>
          </div>

          {/* Quick Mobile Action Links */}
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            {upiUri && (
              <a
                href={upiUri}
                className="btn btn-primary"
                style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Smartphone size={16} /> Pay via UPI App
              </a>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              style={{ flex: 1, justifyContent: 'center', gap: '0.4rem' }}
            >
              <Download size={16} /> Download QR
            </button>
          </div>

          {/* UTR / Reference Submission Section */}
          <div
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} style={{ color: utrSubmitted ? '#34d399' : 'var(--accent-primary)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {utrSubmitted ? 'UPI Transaction Reference Recorded' : 'Record Your UPI UTR / Reference'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              After transferring, enter your 12-digit UPI reference ID (UTR) so the parking owner can verify and confirm your payment.
            </p>
            <form onSubmit={handleSubmitUtr} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input
                type="text"
                placeholder="e.g. 428192847291"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                disabled={submittingUtr}
                className="input-field"
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.5px',
                  height: 38,
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="submit"
                disabled={submittingUtr || !utrInput.trim()}
                className="btn btn-primary btn-sm"
                style={{ minWidth: 100 }}
              >
                {submittingUtr ? 'Saving...' : utrSubmitted ? 'Update' : 'Submit'}
              </button>
            </form>
          </div>

          {/* Security Disclaimer */}
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'left', width: '100%' }}>
            <ShieldCheck size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Note:</strong> Generating or displaying this QR code does not mark the reservation as paid. The reservation remains Pending until verified by the parking space owner in their owner dashboard.
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}
