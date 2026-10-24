import React, { useState, useEffect } from 'react';
import { locationsApi } from '../api/locations';
import { AnimatedCounter } from '../components/react-bits/AnimatedCounter';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { LatticeLoader } from '../components/animation/LatticeLoader';
import { BorderGlow } from '../components/animation/BorderGlow';
import { GlareHover } from '../components/animation/GlareHover';
import { useToast } from '../context/ToastContext';
import {
  Coins,
  Building2,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Landmark,
  ArrowUpRight
} from 'lucide-react';

export function OwnerEarningsPage() {
  const { showToast } = useToast();

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEarnings() {
      try {
        setLoading(true);
        const data = await locationsApi.getOwnerLocations();
        setFacilities(data || []);
      } catch (err) {
        showToast('Failed to load financial records', 'danger');
      } finally {
        setLoading(false);
      }
    }
    fetchEarnings();
  }, []);

  const totalEarnings = facilities.reduce((sum, f) => sum + (f.totalEarnings || f.total_earnings || 0), 0);
  const totalBookings = facilities.reduce((sum, f) => sum + (f.totalBookings || f.total_bookings || 0), 0);

  return (
    <div className="app-container">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
          Financial Statement &amp; Settlements
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
          Revenue &amp; Payout Ledger
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Review gross reservation revenue, facility earnings distribution, and daily settlement payouts.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 1rem', display: 'flex', justifyContent: 'center' }}>
          <LatticeLoader
            pattern="sweep"
            size="lg"
            message="Reconciling financial ledgers & banking settlements..."
            showTimer={true}
          />
        </div>
      ) : (
        <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '2rem', alignItems: 'flex-start' }}>
          {/* Left Column: Facility Revenue Breakdown Cards (8 Cols on Desktop) */}
          <div style={{ gridColumn: 'span 8 / span 8' }} className="md-col-span-12">
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Facility Revenue Breakdown
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Itemized performance across your registered parking locations.
                  </p>
                </div>

                <span className="badge badge-primary">
                  {facilities.length} Active Facilities
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {facilities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                    No facility revenue recorded yet.
                  </div>
                ) : (
                  facilities.map((fac) => {
                    const earned = fac.totalEarnings || fac.total_earnings || 0;
                    const bookingsCount = fac.totalBookings || fac.total_bookings || 0;

                    return (
                      <GlareHover
                        key={fac.id}
                        borderRadius="var(--radius-lg)"
                        glareColor="rgba(255, 255, 255, 0.12)"
                        glareOpacity={0.2}
                      >
                        <div
                          style={{
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '1rem',
                          }}
                        >
                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {fac.name}
                            </h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                              {fac.area}, {fac.city} · {bookingsCount} Total Bookings
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              Base Rate: ₹{fac.hourlyRate || fac.hourly_rate}/hr · {fac.availableSlots}/{fac.totalCapacity} bays currently open
                            </span>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--success-text)' }}>
                              ₹{earned.toLocaleString()}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              Net Earnings
                            </span>
                          </div>
                        </div>
                      </GlareHover>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Settlement & Bank Information (4 Cols on Desktop) */}
          <div style={{ gridColumn: 'span 4 / span 4' }} className="md-col-span-12">
            <BorderGlow
              animated={true}
              borderRadius="16px"
              glowColor="#10b981"
              gradientColors={['#10b981', '#00d2ff', '#f59e0b']}
              glowIntensity={0.85}
              backgroundColor="var(--bg-surface)"
            >
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>
                    Cumulative Settled Revenue
                  </span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 900, color: 'var(--success-text)', margin: '4px 0' }}>
                    <AnimatedCounter value={totalEarnings} prefix="₹" />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Total transactions across all facilities: <strong>{totalBookings}</strong>
                  </div>
                </div>

                {/* Settlement Card Details */}
                <div
                  style={{
                    padding: '1.15rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Landmark size={18} style={{ color: 'var(--accent-primary)' }} />
                    <strong style={{ fontSize: '0.85rem' }}>Direct Bank Settlement</strong>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Payouts are automatically reconciled and settled daily to your registered Indian commercial bank account.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 700 }}>
                    <ShieldCheck size={14} /> 0% Platform Commission in Academic Demonstration Mode
                  </div>
                </div>
              </div>
            </BorderGlow>
          </div>
        </div>
      )}
    </div>
  );
}
