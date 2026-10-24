import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { bookingsApi } from '../api/bookings';
import { AnimatedCounter } from '../components/react-bits/AnimatedCounter';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { LatticeLoader } from '../components/animation/LatticeLoader';
import { BorderGlow } from '../components/animation/BorderGlow';
import { GlareHover } from '../components/animation/GlareHover';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Coins,
  Car,
  ClipboardList,
  Star,
  Plus,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Building2
} from 'lucide-react';

export function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, bookingsRes] = await Promise.all([
        dashboardApi.getStats(),
        bookingsApi.getOwnerBookings({ limit: 10 }),
      ]);

      if (statsRes && statsRes.ownerStats) {
        setStats(statsRes.ownerStats);
      }
      setRecentBookings(bookingsRes || []);
    } catch (err) {
      showToast('Failed to load owner dashboard', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      await bookingsApi.updateStatus(bookingId, newStatus);
      showToast(`Booking marked as ${newStatus}! Gate barrier updated.`, 'success');
      fetchDashboardData();
    } catch (err) {
      showToast(err.message || 'Status update failed', 'danger');
    }
  };

  return (
    <div className="app-container">
      {/* Dashboard Top Header */}
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
          <div className="badge badge-success" style={{ gap: 6, marginBottom: 4 }}>
            <Building2 size={13} /> Facility Owner Operations
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
            Owner Control Center &amp; Revenue
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Monitor real-time bay occupancy, track financial revenue, and manage customer barrier check-ins.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('/owner/spaces')}
            className="btn btn-primary btn-sm"
            style={{ gap: 6 }}
          >
            <Plus size={15} /> Add Parking Space
          </button>
          <button
            onClick={fetchDashboardData}
            className="btn btn-secondary btn-sm"
            style={{ gap: 6 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 1rem', display: 'flex', justifyContent: 'center' }}>
          <LatticeLoader
            pattern="sweep"
            size="lg"
            message="Aggregating operational analytics & barrier telemetry..."
            showTimer={true}
          />
        </div>
      ) : (
        <>
          {/* 4 Primary Operational KPI Cards */}
          <div className="grid grid-cols-4 lg-grid-cols-2 md-grid-cols-1" style={{ gap: '1.25rem', marginBottom: '2rem' }}>
            <BorderGlow
              animated={true}
              borderRadius="16px"
              glowColor="#10b981"
              gradientColors={['#10b981', '#00d2ff', '#f59e0b']}
              glowIntensity={0.8}
              backgroundColor="var(--bg-surface)"
            >
              <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Gross Revenue
                  </div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--success-text)', margin: '4px 0' }}>
                    <AnimatedCounter value={stats?.totalEarnings || 0} prefix="₹" />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reconciled ledger</span>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--success-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-text)' }}>
                  <Coins size={24} />
                </div>
              </div>
            </BorderGlow>

            <GlareHover borderRadius="16px" glareColor="rgba(255, 255, 255, 0.18)" glareOpacity={0.25}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Active Occupancy
                  </div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--accent-primary)', margin: '4px 0' }}>
                    <AnimatedCounter value={stats?.overallOccupancyPct || 0} suffix="%" />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live facility utilization</span>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--accent-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                  <Car size={24} />
                </div>
              </div>
            </GlareHover>

            <GlareHover borderRadius="16px" glareColor="rgba(255, 255, 255, 0.18)" glareOpacity={0.25}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Total Reservations
                  </div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--warning-text)', margin: '4px 0' }}>
                    <AnimatedCounter value={stats?.totalBookings || 0} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All-time bookings</span>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--warning-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning-text)' }}>
                  <ClipboardList size={24} />
                </div>
              </div>
            </GlareHover>

            <GlareHover borderRadius="16px" glareColor="rgba(255, 255, 255, 0.18)" glareOpacity={0.25}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Driver Rating
                  </div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>
                    {stats?.avgRating || '4.9'} ★
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer satisfaction</span>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <Star size={24} />
                </div>
              </div>
            </GlareHover>
          </div>

          {/* Incoming Customer Bookings Table */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Live Customer Gate Check-Ins &amp; Sessions
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Verify driver entry credentials and record check-out completions.
                </p>
              </div>

              <button
                onClick={() => navigate('/owner/bookings')}
                className="btn btn-outline btn-sm"
                style={{ gap: 4 }}
              >
                <span>View Full Log</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking Ref</th>
                    <th>Driver &amp; Vehicle</th>
                    <th>Facility &amp; Bay</th>
                    <th>Session Window</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Gate Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                        No customer reservations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentBookings.slice(0, 8).map((b) => {
                      const isActive = b.status === 'active';
                      return (
                        <tr key={b.id}>
                          <td>
                            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                              {b.bookingRef || b.booking_ref}
                            </strong>
                          </td>

                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{b.driverName || b.driver_name}</strong>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {b.vehicleNumber || b.vehicle_number}
                            </div>
                          </td>

                          <td>
                            <div>{b.locationName || b.location_name}</div>
                            <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                              Bay {b.slotNo || b.slot_no}
                            </span>
                          </td>

                          <td style={{ fontSize: '0.78rem' }}>
                            {new Date(b.startTime || b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                            {new Date(b.endTime || b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>

                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--success-text)' }}>
                            ₹{b.totalAmount || b.total_amount}
                          </td>

                          <td>
                            <span className={`badge ${isActive ? 'badge-success' : 'badge-neutral'}`}>
                              {b.status.toUpperCase()}
                            </span>
                          </td>

                          <td>
                            {isActive ? (
                              <button
                                onClick={() => handleUpdateStatus(b.id, 'completed')}
                                className="btn btn-outline btn-xs"
                                style={{ gap: 4 }}
                              >
                                <CheckCircle size={13} /> Exit / Complete
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Concluded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
