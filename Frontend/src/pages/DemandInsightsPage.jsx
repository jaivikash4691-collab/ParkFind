import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analytics';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { LatticeLoader } from '../components/animation/LatticeLoader';
import { BorderGlow } from '../components/animation/BorderGlow';
import { GlareHover } from '../components/animation/GlareHover';
import { useToast } from '../context/ToastContext';
import {
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Sun,
  Sunset,
  Moon,
  CloudSun
} from 'lucide-react';

export function DemandInsightsPage() {
  const { showToast } = useToast();
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const data = await analyticsApi.getDemandForecast();
      setForecast(data);
    } catch (err) {
      showToast('Failed to load demand forecast', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const getPeriodIcon = (key) => {
    switch (key) {
      case 'morning':
        return <Sun size={18} style={{ color: '#f59e0b' }} />;
      case 'afternoon':
        return <CloudSun size={18} style={{ color: '#0ea5e9' }} />;
      case 'evening':
        return <Sunset size={18} style={{ color: '#f97316' }} />;
      default:
        return <Moon size={18} style={{ color: '#6366f1' }} />;
    }
  };

  return (
    <div className="app-container">
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
            Mobility Intelligence &amp; Analytics
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
            Parking Demand &amp; Availability Insights
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Moving-average statistical arrival analysis to help you time your journey and avoid peak facility congestion.
          </p>
        </div>

        <button
          onClick={fetchForecast}
          className="btn btn-secondary btn-sm"
          style={{ gap: 6 }}
        >
          <RefreshCw size={14} /> Refresh Insights
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 1rem', display: 'flex', justifyContent: 'center' }}>
          <LatticeLoader
            pattern="sweep"
            size="lg"
            message="Computing moving-average statistical arrival forecasts..."
            showTimer={true}
          />
        </div>
      ) : forecast ? (
        <>
          {/* 4 Periods Overview Cards */}
          <div className="grid grid-cols-4 lg-grid-cols-2 md-grid-cols-1" style={{ gap: '1.25rem', marginBottom: '2rem' }}>
            {['morning', 'afternoon', 'evening', 'night'].map((periodKey) => {
              const p = forecast.todayOverview?.[periodKey];
              if (!p) return null;

              return (
                <GlareHover
                  key={periodKey}
                  borderRadius="16px"
                  glareColor="rgba(255, 255, 255, 0.15)"
                  glareOpacity={0.25}
                >
                  <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getPeriodIcon(periodKey)}
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.title}</strong>
                      </div>
                      <span className={`badge badge-${p.status || 'neutral'}`} style={{ fontSize: '0.7rem' }}>
                        {p.level}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.time}</span>

                    {/* Demand Meter */}
                    <div>
                      <div
                        style={{
                          width: '100%',
                          height: 8,
                          borderRadius: 9999,
                          backgroundColor: 'var(--bg-subtle)',
                          overflow: 'hidden',
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            width: `${p.load}%`,
                            height: '100%',
                            borderRadius: 9999,
                            backgroundColor: p.status === 'danger' ? 'var(--danger)' : p.status === 'warning' ? 'var(--warning)' : 'var(--success)',
                            transition: 'width 0.8s ease',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        <span>Load Density</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{p.load}% Expected</span>
                      </div>
                    </div>
                  </div>
                </GlareHover>
              );
            })}
          </div>

          {/* Operational Timeline & Smart Advisory Grid */}
          <div className="grid grid-cols-12 md-grid-cols-1" style={{ gap: '2rem', alignItems: 'flex-start' }}>
            {/* Timeline Cards (8 Cols on Desktop) */}
            <div style={{ gridColumn: 'span 8 / span 8' }} className="md-col-span-12">
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Daily Operational Congestion Windows
                  </h3>
                  <span className="badge badge-warning" style={{ gap: 4 }}>
                    <Clock size={12} /> {forecast.peakHours || 'Peak: 5:00 PM – 8:00 PM'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(forecast.timeWindows || []).map((w, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: w.isCurrent ? 'var(--accent-surface)' : 'var(--bg-elevated)',
                        border: `1.5px solid ${w.isCurrent ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {w.timeWindow}
                          </strong>
                          {w.isCurrent && (
                            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                              Current Window
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {w.period} · {w.advisory}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                          {w.loadPercentage}%
                        </div>
                        <span className={`badge badge-${w.statusClass || 'neutral'}`} style={{ fontSize: '0.7rem' }}>
                          {w.demandLevel} Demand
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Advisory Sidebar (4 Cols on Desktop) */}
            <div style={{ gridColumn: 'span 4 / span 4' }} className="md-col-span-12">
              <BorderGlow
                animated={true}
                borderRadius="16px"
                glowColor="#00d2ff"
                gradientColors={['#00d2ff', '#3b82f6', '#10b981']}
                glowIntensity={0.8}
                backgroundColor="var(--bg-surface)"
              >
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div className="badge badge-primary" style={{ gap: 4, marginBottom: '0.5rem' }}>
                      <Sparkles size={12} /> Smart Advisory
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      City Parking Outlook
                    </h3>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, display: 'block' }}>
                      Peak Operating Hours
                    </span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {forecast.peakHours || '5:00 PM — 8:00 PM'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, display: 'block' }}>
                      Expected Aggregate Demand
                    </span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-primary)', margin: '4px 0' }}>
                      {forecast.expectedDemand || 82}%
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 9999, backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                      <div style={{ width: `${forecast.expectedDemand || 82}%`, height: '100%', backgroundColor: 'var(--danger)' }} />
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, display: 'block' }}>
                      Availability Outlook
                    </span>
                    <span className="badge badge-warning" style={{ marginTop: 4, fontSize: '0.75rem' }}>
                      {forecast.availabilityOutlook || 'Limited Spaces'}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--success-surface)',
                      border: '1px solid var(--success-border)',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--success-text)', fontWeight: 800, display: 'block' }}>
                      Recommended Arrival Window
                    </span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success-text)', marginTop: 2 }}>
                      {forecast.recommendedArrivalTime || 'Before 4:30 PM'}
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
