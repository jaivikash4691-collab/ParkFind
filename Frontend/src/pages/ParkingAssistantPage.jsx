import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveSession } from '../context/ActiveSessionContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { bookingsApi } from '../api/bookings';
import { DigitalPassModal } from '../components/booking/DigitalPassModal';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Car,
  Plus,
  XCircle,
  QrCode,
  RefreshCw,
  Bell,
  ChevronRight,
  Info,
  Sparkles,
  BarChart3,
  Receipt,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export function ParkingAssistantPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    activeSession,
    remainingSeconds,
    formattedRemainingTime,
    quickExtend,
    cancelActiveBooking,
    refreshActiveSession,
    loading: activeLoading,
    notificationsEnabled,
    requestNotificationPermission
  } = useActiveSession();

  // Expenses data state
  const [expensesData, setExpensesData] = useState(null);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');

  // Booking actions state
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [showPassModal, setShowPassModal] = useState(false);

  // Expiry reminders state
  const [alert15Enabled, setAlert15Enabled] = useState(true);
  const [alert5Enabled, setAlert5Enabled] = useState(true);

  // Fetch real database expenses
  const fetchExpenses = async () => {
    try {
      setExpensesLoading(true);
      setExpensesError(null);
      const res = await bookingsApi.getExpenses();
      if (res && res.success && res.data) {
        setExpensesData(res.data);
      } else {
        setExpensesData(null);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setExpensesError(err.message || 'Unable to retrieve parking expense records.');
    } finally {
      setExpensesLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Format date helper with local user time
  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Safe Extend Parking Session
  const handleExtend = async (hours = 1) => {
    if (!activeSession || actionLoading) return;
    try {
      setActionLoading(true);
      await quickExtend(hours);
      await fetchExpenses();
    } finally {
      setActionLoading(false);
    }
  };

  // Safe Cancel Parking Session
  const handleCancel = async () => {
    if (!activeSession || actionLoading) return;
    try {
      setActionLoading(true);
      await cancelActiveBooking(cancelReason);
      setShowCancelModal(false);
      await fetchExpenses();
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate percentage of time remaining for the visual progress bar
  const sessionProgressPercent = useMemo(() => {
    if (!activeSession || !activeSession.startTime || !activeSession.endTime) return 100;
    try {
      const start = new Date(activeSession.startTime).getTime();
      const end = new Date(activeSession.endTime).getTime();
      const total = Math.max(1, end - start);
      const currentRemaining = Math.max(0, end - Date.now());
      return Math.min(100, Math.max(0, Math.round((currentRemaining / total) * 100)));
    } catch {
      return 100;
    }
  }, [activeSession, remainingSeconds]);

  // Determine urgency tier for active session
  const urgencyTier = useMemo(() => {
    if (!activeSession) return 'none';
    if (remainingSeconds <= 0) return 'expired';
    if (remainingSeconds <= 300) return 'critical'; // < 5 mins
    if (remainingSeconds <= 900) return 'warning';  // < 15 mins
    return 'normal';
  }, [activeSession, remainingSeconds]);

  // Filtered booking history
  const filteredHistory = useMemo(() => {
    if (!expensesData || !expensesData.history) return [];
    if (historyFilter === 'all') return expensesData.history;
    return expensesData.history.filter((item) => item.status === historyFilter);
  }, [expensesData, historyFilter]);

  // Monthly Chart Max value for proportional bar scaling
  const maxMonthlySpending = useMemo(() => {
    if (!expensesData || !expensesData.monthlyChart) return 100;
    const totals = expensesData.monthlyChart.map((m) => m.total || 0);
    const max = Math.max(...totals, 100);
    return max * 1.15; // 15% headroom
  }, [expensesData]);

  return (
    <div className="app-container" style={{ paddingBottom: '3.5rem' }}>
      {/* Page Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
              ParkIT Autonomous Co-Pilot
            </span>
            <span className="badge badge-primary" style={{ gap: 4, fontSize: '0.72rem' }}>
              <Sparkles size={12} /> Smart Parking Assistant
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2, letterSpacing: '-0.02em' }}>
            Parking Assistant
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Real-time session monitoring, automated expiry warnings, and verified monthly parking expense intelligence.
          </p>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={requestNotificationPermission}
            className={`btn ${notificationsEnabled ? 'btn-secondary' : 'btn-outline'} btn-sm`}
            style={{ gap: 6, fontSize: '0.8125rem' }}
          >
            <Bell size={14} style={{ color: notificationsEnabled ? 'var(--success)' : 'var(--accent-primary)' }} />
            <span>{notificationsEnabled ? 'Desktop Alerts Active' : 'Enable Expiry Alerts'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="btn btn-primary btn-sm"
            style={{ gap: 6, fontWeight: 700, fontSize: '0.8125rem' }}
          >
            <MapPin size={14} />
            <span>Explore Spaces</span>
          </button>
        </div>
      </div>

      {/* SECTION B: PROACTIVE EXPIRY REMINDERS BANNER */}
      {activeSession && urgencyTier === 'critical' && (
        <div
          style={{
            padding: '1.15rem 1.35rem',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.12))',
            border: '2px solid var(--danger)',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.35)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#ffffff', fontSize: '0.975rem', display: 'block' }}>
                Urgent: Parking Session Ending in Under 5 Minutes!
              </strong>
              <span style={{ fontSize: '0.825rem', color: '#fecaca' }}>
                Your reservation at <strong>{activeSession.locationName} (Bay {activeSession.slotNo})</strong> expires at{' '}
                {formatDateTime(activeSession.endTime)}. Extend now to avoid overstay charges.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleExtend(1)}
            disabled={actionLoading}
            className="btn btn-danger btn-sm"
            style={{ fontWeight: 800, gap: 6 }}
          >
            <Plus size={15} /> Extend by +1 Hour
          </button>
        </div>
      )}

      {activeSession && urgencyTier === 'warning' && (
        <div
          style={{
            padding: '1.15rem 1.35rem',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.1))',
            border: '1px solid var(--warning)',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Clock size={22} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#ffffff', fontSize: '0.95rem', display: 'block' }}>
                15-Minute Expiry Warning
              </strong>
              <span style={{ fontSize: '0.825rem', color: '#fef3c7' }}>
                Your parking session ends at {formatDateTime(activeSession.endTime)}. You have {formattedRemainingTime} remaining.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleExtend(1)}
            disabled={actionLoading}
            className="btn btn-warning btn-sm"
            style={{ fontWeight: 800, gap: 6 }}
          >
            <Plus size={15} /> +1 Hr Extension
          </button>
        </div>
      )}

      {/* SECTION A: CURRENT PARKING */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Car size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>Current Parking Status</span>
          </h2>
          {activeSession && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Booking ID: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{activeSession.bookingRef}</strong>
            </span>
          )}
        </div>

        {activeSession ? (
          <div className="card" style={{ padding: '2rem', backgroundColor: 'var(--bg-surface)' }}>
            <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '2rem', alignItems: 'center' }}>
              {/* Left Details (7 cols) */}
              <div style={{ gridColumn: 'span 7 / span 7' }} className="md-col-span-12">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.85rem' }}>
                  <span className="badge badge-success" style={{ gap: 6, fontSize: '0.75rem' }}>
                    <span className="pulse-dot" style={{ backgroundColor: '#ffffff' }} /> {activeSession.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Vehicle: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{activeSession.vehicleNumber}</strong>
                  </span>
                </div>

                <h3 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {activeSession.locationName}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.25rem' }}>
                  <MapPin size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <span>{activeSession.address || `${activeSession.area || 'Coimbatore'}, Tamil Nadu`}</span>
                </p>

                {/* Key Spec Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.85rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                      Assigned Bay
                    </span>
                    <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                      Bay {activeSession.slotNo}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                      Floor / Row
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      {activeSession.floorName || 'Ground'} · {activeSession.rowName || 'Aisle'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                      Session Start
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {formatDateTime(activeSession.startTime)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                      Expiry Time
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: urgencyTier === 'critical' ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {formatDateTime(activeSession.endTime)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                      Amount Paid
                    </span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>
                      ₹{activeSession.totalAmount || '0.00'}
                    </strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowPassModal(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 6, fontWeight: 700 }}
                  >
                    <QrCode size={15} /> View QR Pass
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExtend(1)}
                    disabled={actionLoading}
                    className="btn btn-primary btn-sm"
                    style={{ gap: 6, fontWeight: 800 }}
                  >
                    <Plus size={15} /> Extend +1 Hr (₹40)
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                    className="btn btn-outline btn-sm"
                    style={{ gap: 6, color: 'var(--danger)' }}
                  >
                    <XCircle size={15} /> Cancel Booking
                  </button>
                </div>
              </div>

              {/* Right Countdown Dashboard (5 cols) */}
              <div style={{ gridColumn: 'span 5 / span 5' }} className="md-col-span-12">
                <div
                  style={{
                    padding: '2rem 1.5rem',
                    borderRadius: 'var(--radius-xl)',
                    background: urgencyTier === 'critical'
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(220, 38, 38, 0.08))'
                      : urgencyTier === 'warning'
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.08))'
                      : 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.15))',
                    border: `1px solid ${urgencyTier === 'critical' ? 'var(--danger)' : urgencyTier === 'warning' ? 'var(--warning)' : 'var(--accent-border)'}`,
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-text)', letterSpacing: '0.04em' }}>
                    Remaining Parking Time
                  </span>

                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '3rem',
                      fontWeight: 900,
                      color: urgencyTier === 'critical' ? 'var(--danger)' : urgencyTier === 'warning' ? 'var(--warning)' : 'var(--text-primary)',
                      letterSpacing: '0.05em',
                      marginTop: 6,
                      marginBottom: 10,
                    }}
                  >
                    {formattedRemainingTime}
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${sessionProgressPercent}%`,
                        backgroundColor: urgencyTier === 'critical' ? 'var(--danger)' : urgencyTier === 'warning' ? 'var(--warning)' : 'var(--accent-primary)',
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Duration: {activeSession.durationHours || 1} hrs</span>
                    <span>Status: {urgencyTier === 'critical' ? 'Expiring Soon' : 'Guaranteed'}</span>
                  </div>

                  {/* Configurable Reminder Preferences */}
                  <div
                    style={{
                      marginTop: '1.25rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAlert15Enabled(!alert15Enabled);
                        showToast(`15-min reminder ${!alert15Enabled ? 'enabled' : 'disabled'}.`, 'info');
                      }}
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '0.72rem', gap: 4, color: alert15Enabled ? 'var(--accent-primary)' : 'var(--text-dim)' }}
                    >
                      <Bell size={12} /> {alert15Enabled ? '15m Alert On' : '15m Off'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAlert5Enabled(!alert5Enabled);
                        showToast(`5-min critical alert ${!alert5Enabled ? 'enabled' : 'disabled'}.`, 'info');
                      }}
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '0.72rem', gap: 4, color: alert5Enabled ? 'var(--danger)' : 'var(--text-dim)' }}
                    >
                      <AlertTriangle size={12} /> {alert5Enabled ? '5m Urgent On' : '5m Off'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State when no active session */
          <div
            className="card"
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                fontSize: '1.8rem',
              }}
            >
              🅿️
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              No Active Parking Session
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 1.5rem auto' }}>
              You do not have a parking spot currently reserved or checked in. Explore guaranteed bays across Coimbatore to create a reservation.
            </p>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="btn btn-primary btn-md"
              style={{ gap: 8, fontWeight: 700 }}
            >
              <MapPin size={16} /> Explore Available Parking Spaces →
            </button>
          </div>
        )}
      </div>

      {/* SECTION C: PARKING EXPENSE TRACKER */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Receipt size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>Parking Expense Tracker</span>
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Verified financial totals computed from trusted database booking &amp; payment transactions
            </span>
          </div>

          <button
            type="button"
            onClick={fetchExpenses}
            disabled={expensesLoading}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6, fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={expensesLoading ? 'spin' : ''} />
            <span>Refresh Records</span>
          </button>
        </div>

        {/* Expense Stat KPI Cards */}
        <div className="grid grid-cols-4 md-grid-cols-2 sm-grid-cols-1" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Card 1: This Month Spending */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Month Spending
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: 4, marginBottom: 2 }}>
              ₹{expensesData?.summary?.currentMonthSpending?.toFixed(2) || '0.00'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {expensesData?.summary?.currentMonthBookings || 0} booking(s) this month
            </span>
          </div>

          {/* Card 2: Total Bookings */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Completed Bookings
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4, marginBottom: 2 }}>
              {expensesData?.summary?.totalBookingsCount || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Lifetime parking sessions
            </span>
          </div>

          {/* Card 3: Average Cost */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Average Cost Per Booking
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--success)', marginTop: 4, marginBottom: 2 }}>
              ₹{expensesData?.summary?.averageCost?.toFixed(2) || '0.00'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Normalized session cost
            </span>
          </div>

          {/* Card 4: Lifetime Total */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lifetime Total Spent
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#818cf8', marginTop: 4, marginBottom: 2 }}>
              ₹{expensesData?.summary?.totalSpendingAllTime?.toFixed(2) || '0.00'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              All-time parking expenditure
            </span>
          </div>
        </div>

        {/* Monthly Spending Trend Bar Chart */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Monthly Parking Spending (Last 6 Months)
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Amounts in Indian Rupees (₹)
            </span>
          </div>

          {expensesLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading real expense data...
            </div>
          ) : expensesData?.monthlyChart && expensesData.monthlyChart.length > 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: 180,
                padding: '1rem 0.5rem 0.5rem 0.5rem',
                borderBottom: '1px solid var(--border-medium)',
                gap: '1rem',
              }}
            >
              {expensesData.monthlyChart.map((m) => {
                const heightPercent = Math.max(8, Math.min(100, Math.round(((m.total || 0) / maxMonthlySpending) * 100)));
                const isCurrent = m.month.includes(new Date().getFullYear().toString()) && m.total > 0;
                return (
                  <div
                    key={m.month}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: m.total > 0 ? 'var(--text-primary)' : 'var(--text-dim)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {m.total > 0 ? `₹${m.total}` : '—'}
                    </div>

                    <div
                      style={{
                        width: '100%',
                        maxWidth: 48,
                        height: `${heightPercent}%`,
                        backgroundColor: isCurrent ? 'var(--accent-primary)' : 'var(--border-medium)',
                        borderRadius: '6px 6px 2px 2px',
                        transition: 'height 0.4s ease',
                        boxShadow: isCurrent ? '0 0 12px rgba(14, 165, 233, 0.4)' : 'none',
                        cursor: 'pointer',
                      }}
                      title={`${m.month}: ₹${m.total} (${m.count} bookings)`}
                    />

                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        textAlign: 'center',
                        marginTop: 4,
                      }}
                    >
                      {m.month.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No previous monthly billing records available.
            </div>
          )}
        </div>

        {/* Booking History Table */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Transaction &amp; Booking History
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing {filteredHistory.length} record(s)
              </span>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, backgroundColor: 'var(--bg-elevated)', padding: 3, borderRadius: 'var(--radius-md)' }}>
              {['all', 'completed', 'active', 'cancelled'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setHistoryFilter(tab)}
                  className={`btn btn-xs ${historyFilter === tab ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ textTransform: 'capitalize', fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {expensesError ? (
            <div
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <AlertTriangle size={20} style={{ color: 'var(--danger)', margin: '0 auto 8px auto' }} />
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: '0 0 10px 0' }}>{expensesError}</p>
              <button onClick={fetchExpenses} className="btn btn-outline btn-xs">
                Retry Loading
              </button>
            </div>
          ) : filteredHistory.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Reference</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Location &amp; Bay</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Vehicle</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Duration</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((b) => (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {formatDateOnly(b.createdAt || b.startTime)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {b.bookingRef}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.locationName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Bay {b.slotNo} ({b.area || 'Coimbatore'})
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                        {b.vehicleNumber}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {b.durationHours} hr(s)
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          className={`badge ${
                            b.status === 'completed'
                              ? 'badge-success'
                              : b.status === 'active'
                              ? 'badge-primary'
                              : b.status === 'cancelled'
                              ? 'badge-danger'
                              : 'badge-secondary'
                          }`}
                          style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        ₹{b.totalAmount?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No parking records found matching the filter "{historyFilter}".
            </div>
          )}
        </div>
      </div>

      {/* SECTION D: QUICK BOOKING ACTIONS BAR */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(14, 165, 233, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>
              Need Guaranteed Parking in Coimbatore?
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time bay sensor status, touchless QR entrance, and automated payment security.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="btn btn-primary"
          style={{ gap: 6, fontWeight: 800 }}
        >
          <span>Find Available Bays Now</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Digital QR Pass Modal */}
      {showPassModal && activeSession && (
        <DigitalPassModal
          isOpen={showPassModal}
          onClose={() => setShowPassModal(false)}
          bookingResult={{
            bookingId: activeSession.bookingId,
            bookingRef: activeSession.bookingRef,
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && activeSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 440,
              padding: '1.75rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--danger)',
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Cancel Parking Reservation?
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Are you sure you want to cancel booking <strong>{activeSession.bookingRef}</strong> for Bay{' '}
              <strong>{activeSession.slotNo}</strong>? The assigned slot will be released back to the facility pool.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                Cancellation Reason:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Found alternative spot">Found alternative spot</option>
                <option value="Vehicle issue">Vehicle issue</option>
                <option value="Mistake in booking time">Mistake in booking time</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading}
                className="btn btn-danger"
                style={{ flex: 1, fontWeight: 800 }}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

