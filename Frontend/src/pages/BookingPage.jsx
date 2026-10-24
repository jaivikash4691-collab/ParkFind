import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { locationsApi } from '../api/locations';
import { FloorSelector } from '../components/booking/FloorSelector';
import { BayMatrix } from '../components/booking/BayMatrix';
import { PaymentModal } from '../components/booking/PaymentModal';
import { DigitalPassModal } from '../components/booking/DigitalPassModal';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { LatticeLoader } from '../components/animation/LatticeLoader';
import { BorderGlow } from '../components/animation/BorderGlow';
import { GlareHover } from '../components/animation/GlareHover';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  Clock,
  Shield,
  Zap,
  MapPin,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Booking Flow State
  const [activeFloorId, setActiveFloorId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [duration, setDuration] = useState(1);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState(user?.full_name || '');
  const [driverPhone, setDriverPhone] = useState(user?.phone || '');

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // Load facility data
  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        const data = await locationsApi.getById(id);
        setLocation(data);

        // Default floor
        if (data.floors && data.floors.length > 0) {
          setActiveFloorId(data.floors[0].id);
        }
      } catch (err) {
        showToast(`Failed to load facility: ${err.message}`, 'danger');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="app-container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LatticeLoader
          pattern="orbit"
          size="lg"
          message="Reserving your parking bay & checking telemetry..."
          showTimer={true}
        />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="app-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2>Facility not found</h2>
        <button onClick={() => navigate('/explore')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Explore
        </button>
      </div>
    );
  }

  // Active Floor Slots
  const currentFloor = location.floors?.find((f) => f.id === activeFloorId) || location.floors?.[0];
  const displayedSlots = currentFloor ? currentFloor.slots : location.slots || [];

  const hourlyRate = location.hourlyRate || location.hourly_rate || 40;
  const totalAmount = hourlyRate * duration;

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    showToast(`Selected Bay ${slot.slot_no || slot.slotNo}`, 'info', 1800);
  };

  const handleOpenPayment = () => {
    if (!selectedSlot) {
      showToast('Please select an available parking bay first', 'warning');
      return;
    }
    if (!vehicleNumber.trim()) {
      showToast('Please enter your vehicle license plate number', 'warning');
      return;
    }
    if (!driverName.trim() || !driverPhone.trim()) {
      showToast('Please provide driver name and phone number', 'warning');
      return;
    }

    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (result) => {
    setPaymentModalOpen(false);
    setBookingResult(result);
    setPassModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* Back button */}
      <button
        onClick={() => navigate('/explore')}
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.25rem', gap: 6 }}
      >
        <ArrowLeft size={15} /> Back to Map &amp; Listings
      </button>

      {/* Facility Header Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
              <span className="badge badge-primary">{location.area} · {location.city}</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Star size={13} fill="#f59e0b" /> {location.rating || '4.8'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
              {location.name}
            </h1>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {location.address}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>
              Tariff Snapshot
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
              ₹{hourlyRate}<span style={{ fontSize: '0.875rem' }}>/hr</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--success-text)', fontWeight: 700 }}>
              {location.availableSlots} Bays Available Now
            </span>
          </div>
        </div>
      </div>

      {/* Booking Workspace Layout */}
      <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '2rem', alignItems: 'flex-start' }}>
        {/* Left: 2D Floor Plan Matrix (8 Cols on Desktop) */}
        <div style={{ gridColumn: 'span 8 / span 8' }} className="md-col-span-12">
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Interactive Bay Matrix
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Click an available green bay to reserve your guaranteed parking spot.
                </p>
              </div>

              {selectedSlot && (
                <div className="badge badge-primary" style={{ gap: 6 }}>
                  <span>Selected Bay:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {selectedSlot.slot_no || selectedSlot.slotNo}
                  </strong>
                </div>
              )}
            </div>

            {/* Level / Floor Selector Tabs */}
            <FloorSelector
              floors={location.floors}
              activeFloorId={activeFloorId}
              onSelectFloor={(floorId) => {
                setActiveFloorId(floorId);
                setSelectedSlot(null);
              }}
            />

            {/* Visual Slots Grid */}
            <BayMatrix
              slots={displayedSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={handleSlotSelect}
            />
          </div>
        </div>

        {/* Right: Duration, Driver Details & Checkout Summary (4 Cols on Desktop) */}
        <div
          style={{
            gridColumn: 'span 4 / span 4',
            position: 'sticky',
            top: 'calc(var(--header-height) + 1.5rem)',
          }}
          className="md-col-span-12"
        >
          <BorderGlow
            animated={true}
            borderRadius="16px"
            glowColor="var(--accent-primary, #00d2ff)"
            glowIntensity={0.85}
            backgroundColor="var(--bg-surface)"
          >
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                Reservation Summary
              </h3>

              {/* Selected Spot Pill */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Target Bay:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: selectedSlot ? 'var(--accent-primary)' : 'var(--text-dim)', fontSize: '0.95rem' }}>
                    {selectedSlot ? (selectedSlot.slot_no || selectedSlot.slotNo) : 'None Selected'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bay Type:</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {selectedSlot ? (selectedSlot.slot_type || selectedSlot.slotType || 'Standard').replace('_', ' ') : '--'}
                  </span>
                </div>
              </div>

              {/* Duration Selector */}
              <div className="form-group">
                <label className="form-label">Duration (Hours)</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 6].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setDuration(hrs)}
                      className={`btn btn-sm ${duration === hrs ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, minWidth: '45px', fontWeight: 700 }}
                    >
                      {hrs}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Plate Input */}
              <div className="form-group">
                <label className="form-label">Vehicle License Plate</label>
                <input
                  type="text"
                  placeholder="e.g. TN 38 BR 8899"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase' }}
                  required
                />
              </div>

              {/* Driver Contact */}
              <div className="form-group">
                <label className="form-label">Driver Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Raveendran K"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98422 10101"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              {/* Calculation Total */}
              <div
                style={{
                  padding: '1rem 0',
                  borderTop: '1px solid var(--border-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, display: 'block' }}>
                    Total Payable
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    ₹{hourlyRate} × {duration} hr(s)
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 900, color: 'var(--success-text)' }}>
                  ₹{totalAmount}
                </div>
              </div>

              {/* CTA */}
              <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.45}>
                <button
                  type="button"
                  onClick={handleOpenPayment}
                  disabled={!selectedSlot}
                  className="btn btn-primary btn-block btn-lg"
                  style={{ width: '100%' }}
                >
                  {selectedSlot ? 'Proceed to Payment →' : 'Select a Bay to Continue'}
                </button>
              </GlareHover>
            </div>
          </BorderGlow>
        </div>
      </div>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        location={location}
        slot={selectedSlot}
        duration={duration}
        vehicleNumber={vehicleNumber}
        driverName={driverName}
        driverPhone={driverPhone}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Digital Access Pass Modal */}
      <DigitalPassModal
        isOpen={passModalOpen}
        onClose={() => setPassModalOpen(false)}
        bookingResult={bookingResult}
      />
    </div>
  );
}
