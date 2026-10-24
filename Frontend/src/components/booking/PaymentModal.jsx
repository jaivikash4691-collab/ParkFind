import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { bookingsApi } from '../../api/bookings';
import { LatticeLoader } from '../animation/LatticeLoader';
import { GlareHover } from '../animation/GlareHover';
import { useToast } from '../../context/ToastContext';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, Smartphone, Landmark, Wallet, Banknote, ShieldCheck } from 'lucide-react';

export function PaymentModal({
  isOpen,
  onClose,
  location,
  slot,
  duration,
  vehicleNumber,
  driverName,
  driverPhone,
  onPaymentSuccess,
}) {
  const { showToast } = useToast();
  const { refreshActiveSession } = useActiveSession();
  const { isAuthenticated } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);

  if (!location || !slot) return null;

  const hourlyRate = location.hourlyRate || location.hourly_rate || 40;
  const totalAmount = hourlyRate * duration;
  const slotNo = slot.slot_no || slot.slotNo;

  const handleConfirmPay = async () => {
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
        payment_method: paymentMethod,
      };

      const result = await bookingsApi.create(payload);
      showToast('Payment verified & reservation confirmed!', 'success');
      await refreshActiveSession();
      onPaymentSuccess(result);
    } catch (err) {
      if (err.message && err.message.includes('already reserved')) {
        showToast('That bay was just reserved by another driver. Please choose another bay.', 'danger');
      } else {
        showToast(err.message || 'Payment transaction failed', 'danger');
      }
    } finally {
      setProcessing(false);
    }
  };

  const paymentOptions = [
    { id: 'upi', name: 'UPI FastPay (Google Pay / PhonePe / Paytm)', icon: Smartphone },
    { id: 'card', name: 'Debit / Credit Card (Visa / Mastercard / RuPay)', icon: CreditCard },
    { id: 'netbanking', name: 'Net Banking (All Indian Banks)', icon: Landmark },
    { id: 'wallet', name: 'Mobility Wallet', icon: Wallet },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm & Authorize Parking Reservation"
      subtitle="Fast checkout with instant digital entry pass generation"
      maxWidth="480px"
      footer={
        processing ? null : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={processing}>
              Cancel
            </button>
            <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.4}>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleConfirmPay}
                disabled={processing}
                style={{ minWidth: 160 }}
              >
                Pay ₹{totalAmount} & Reserve
              </button>
            </GlareHover>
          </>
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
            message="Processing payment & authorizing barrier pass..."
            showTimer={true}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Reservation Summary Strip */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Parking Facility:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{location.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Reserved Bay:</span>
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
              {slotNo}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
            <span>{duration} Hour(s)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Vehicle Plate:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{vehicleNumber}</span>
          </div>
        </div>

        {/* Payment Channels */}
        <div>
          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
            Select Payment Method
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {paymentOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = paymentMethod === opt.id;
              return (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    backgroundColor: isSelected ? 'var(--accent-surface)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentChannel"
                    value={opt.id}
                    checked={isSelected}
                    onChange={() => setPaymentMethod(opt.id)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <Icon size={17} style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {opt.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Total Calculation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
              Total Payable
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              ₹{hourlyRate} × {duration} hr(s) + 0% platform fee
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-text)' }}>
            ₹{totalAmount}
          </div>
        </div>

        {/* Security & Simulation Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
          <span>Encrypted simulation checkout · Recorded directly in Parkit ledger</span>
        </div>
      </div>
      )}
    </Modal>
  );
}
