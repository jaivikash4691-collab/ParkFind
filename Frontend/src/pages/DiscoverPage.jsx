import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { locationsApi } from '../api/locations';
import { analyticsApi } from '../api/analytics';
import { SpotlightCard } from '../components/react-bits/SpotlightCard';
import { AnimatedCounter } from '../components/react-bits/AnimatedCounter';
import { TextReveal } from '../components/react-bits/TextReveal';
import { RiveParkingVisual } from '../components/visual/RiveParkingVisual';
import { LatticeLoader } from '../components/animation/LatticeLoader';
import { GlareHover } from '../components/animation/GlareHover';
import { BorderGlow } from '../components/animation/BorderGlow';
import { useToast } from '../context/ToastContext';
import {
  Search,
  MapPin,
  Compass,
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Star,
  CheckCircle,
  Navigation
} from 'lucide-react';

export function DiscoverPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [locs, rec, fc] = await Promise.allSettled([
          locationsApi.getAll(),
          locationsApi.getRecommendations(),
          analyticsApi.getDemandForecast(),
        ]);

        if (locs.status === 'fulfilled') setLocations(locs.value || []);
        if (rec.status === 'fulfilled') {
          const val = rec.value;
          setRecommendation(Array.isArray(val) ? val[0] : (val?.topRecommendation || val));
        }
        if (fc.status === 'fulfilled') setForecast(fc.value);
      } catch (err) {
        console.error('Discover page loading error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleFilterArea = (area) => {
    navigate(`/explore?area=${encodeURIComponent(area)}`);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'warning');
      return;
    }
    showToast('Locating nearest parking facilities...', 'info', 2000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        navigate(`/explore?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&sort=nearest`);
      },
      () => {
        showToast('Location permission denied. Showing all facilities.', 'info');
        navigate('/explore');
      },
      { timeout: 7000 }
    );
  };

  const totalCapacity = locations.reduce((sum, l) => sum + (l.totalCapacity || l.total_capacity || 0), 0);
  const totalAvailable = locations.reduce((sum, l) => sum + (l.availableSlots !== undefined ? l.availableSlots : 0), 0);
  const totalOccupied = totalCapacity - totalAvailable;

  const popularAreas = ['RS Puram', 'Gandhipuram', 'Race Course', 'Peelamedu', 'Saibaba Colony', 'Avinashi Road'];

  if (loading) {
    return (
      <div className="app-container" style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LatticeLoader
          pattern="orbit"
          shape="round"
          size="lg"
          message="Discovering live smart parking facilities in Coimbatore..."
          showTimer={true}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* ================= HERO SECTION ================= */}
      <section style={{ position: 'relative', paddingTop: '2.5rem', paddingBottom: '3rem', textAlign: 'center' }}>
        {/* Subtle Background Glow Orb */}
        <div
          className="hero-gradient-orb"
          style={{
            top: '0%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '300px',
            background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 860, margin: '0 auto' }}>
          {/* Availability Pill */}
          <div
            className="badge badge-primary"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
              gap: 8,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span className="pulse-dot" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <span>Real-Time Urban Parking Marketplace · Coimbatore</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
            }}
          >
            Find guaranteed parking near your destination,{' '}
            <span className="shimmer-text">on demand.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              maxWidth: 680,
              margin: '0 auto 2.25rem auto',
            }}
          >
            Real-time bay occupancy, instant digital entry pass reservations, and turn-by-turn indoor wayfinding across commercial hubs.
          </p>

          {/* Interactive Search Bar */}
          <form onSubmit={handleSearchSubmit} className="search-bar-card" style={{ maxWidth: 720, margin: '0 auto' }}>
            <Search size={20} style={{ color: 'var(--text-dim)', marginLeft: 4 }} />
            <input
              type="text"
              className="search-bar-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area (e.g. RS Puram, Gandhipuram), city, or facility..."
            />
            <button
              type="button"
              onClick={handleUseGps}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6, flexShrink: 0 }}
              title="Locate nearest parking with GPS"
            >
              <Navigation size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Near Me</span>
            </button>
            <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.45}>
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                Find Parking
              </button>
            </GlareHover>
          </form>

          {/* Popular Areas Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginRight: 4 }}>
              Popular Areas:
            </span>
            {popularAreas.map((area) => (
              <button
                key={area}
                onClick={() => handleFilterArea(area)}
                className="badge badge-neutral"
                style={{
                  cursor: 'pointer',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= LIVE PLATFORM METRICS STRIP ================= */}
      <section style={{ marginBottom: '3rem' }}>
        <div className="grid grid-cols-4 lg-grid-cols-2 md-grid-cols-1 card" style={{ padding: '1.5rem', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
              <AnimatedCounter value={locations.length || 8} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Active Facilities
            </div>
          </div>

          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--success-text)' }}>
              <AnimatedCounter value={totalAvailable || 64} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Available Bays
            </div>
          </div>

          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--warning-text)' }}>
              <AnimatedCounter value={totalOccupied || 52} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Active Sessions
            </div>
          </div>

          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
              <AnimatedCounter value={25} prefix="₹" suffix="/hr" />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Starting Tariff
            </div>
          </div>
        </div>
      </section>

      {/* ================= SMART RECOMMENDATION BANNER ================= */}
      {recommendation && (
        <section style={{ marginBottom: '3rem' }}>
          <BorderGlow
            animated={true}
            borderRadius="16px"
            glowColor="var(--accent-primary, #00d2ff)"
            gradientColors={['#00d2ff', '#3b82f6', '#10b981']}
            glowIntensity={0.9}
            backgroundColor="var(--bg-surface)"
          >
            <div
              style={{
                padding: '1.75rem',
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(99, 102, 241, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.25rem',
              }}
            >
              <div style={{ maxWidth: 640 }}>
                <div className="badge badge-primary" style={{ gap: 6, marginBottom: '0.5rem' }}>
                  <Sparkles size={13} />
                  <span>AI Mobility Scored Recommendation</span>
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {recommendation.name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {recommendation.reason ||
                    recommendation.recommendationReason ||
                    'High bay availability, competitive tariff, and rapid barrier scan entry.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    ₹{recommendation.hourlyRate || recommendation.hourly_rate}/hr
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success-text)', fontWeight: 700 }}>
                    {recommendation.availableSlots} Bays Available
                  </span>
                </div>

                <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.35)" glareOpacity={0.4}>
                  <button
                    onClick={() => navigate(`/parking/${recommendation.id}`)}
                    className="btn btn-primary"
                    style={{ gap: 8 }}
                  >
                    <span>Reserve Recommended Bay</span>
                    <ArrowRight size={16} />
                  </button>
                </GlareHover>
              </div>
            </div>
          </BorderGlow>
        </section>
      )}

      {/* ================= FEATURED PARKING FACILITIES ================= */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
              Live Facility Status
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              Explore Parking Spaces
            </h2>
          </div>
          <button
            onClick={() => navigate('/explore')}
            className="btn btn-outline btn-sm"
            style={{ gap: 6 }}
          >
            <span>Interactive Map View</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-3 lg-grid-cols-2 md-grid-cols-1" style={{ gap: '1.5rem' }}>
          {locations.slice(0, 6).map((loc, idx) => {
            const isFull = loc.availableSlots === 0 || loc.isFull;
            const CardInner = (
              <div
                className="card card-interactive"
                onClick={() => navigate(`/parking/${loc.id}`)}
                style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
              >
                {/* Location Image */}
                <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                  <img
                    src={loc.imageUrl || loc.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&auto=format&fit=crop&q=80'}
                    alt={loc.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s ease' }}
                    className="hover:scale-105"
                  />
                  <span
                    className={`badge ${isFull ? 'badge-danger' : 'badge-success'}`}
                    style={{ position: 'absolute', top: 12, right: 12, boxShadow: 'var(--shadow-sm)' }}
                  >
                    {isFull ? 'Sold Out' : `${loc.availableSlots} Bays Available`}
                  </span>

                  <span
                    className="badge badge-primary"
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      fontFamily: 'var(--font-mono)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    ₹{loc.hourlyRate || loc.hourly_rate}/hr
                  </span>
                </div>

                {/* Details */}
                <div style={{ padding: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {loc.area} · {loc.city}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star size={13} fill="#f59e0b" /> {loc.rating || '4.8'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {loc.name}
                    </h3>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '1rem' }}>
                      {loc.address}
                    </p>

                    {/* Amenities Icons */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {loc.hasEv && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          <Zap size={11} style={{ color: 'var(--accent-primary)' }} /> EV Fast
                        </span>
                      )}
                      {loc.isCovered && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          ☂ Covered
                        </span>
                      )}
                      {loc.is24x7 && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          🕒 24/7 Access
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      {loc.distanceLabel ? `📍 ${loc.distanceLabel}` : `Open ${loc.openingTime || '06:00'}–${loc.closingTime || '23:30'}`}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/parking/${loc.id}`);
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      Book Bay →
                    </button>
                  </div>
                </div>
              </div>
            );

            if (idx === 0) {
              return (
                <BorderGlow
                  key={loc.id}
                  borderRadius="16px"
                  glowColor="var(--accent-primary, #00d2ff)"
                  backgroundColor="var(--bg-surface)"
                  glowIntensity={0.8}
                >
                  {CardInner}
                </BorderGlow>
              );
            }

            return (
              <GlareHover
                key={loc.id}
                borderRadius="16px"
                glareColor="rgba(255, 255, 255, 0.15)"
                glareOpacity={0.25}
              >
                {CardInner}
              </GlareHover>
            );
          })}
        </div>
      </section>

      {/* ================= DEMAND OUTLOOK STRIP ================= */}
      {forecast && (
        <section style={{ marginBottom: '3.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
                  Availability Outlook
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  Today's Parking Demand Curve
                </h3>
              </div>
              <button
                onClick={() => navigate('/insights')}
                className="btn btn-outline btn-sm"
              >
                Full Analytics →
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {(forecast.timeWindows || []).map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    minWidth: 160,
                    padding: '0.9rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: w.isCurrent ? 'var(--accent-surface)' : 'var(--bg-elevated)',
                    border: `1px solid ${w.isCurrent ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {w.timeWindow}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                    {w.loadPercentage}%
                  </div>
                  <span
                    className={`badge badge-${w.statusClass || 'neutral'}`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {w.demandLevel} Demand
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= HOW PARKIT WORKS ================= */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 2.5rem auto' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
            Seamless Driver Flow
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
            How Parkit Powers Urban Mobility
          </h2>
        </div>

        <div className="grid grid-cols-4 lg-grid-cols-2 md-grid-cols-1" style={{ gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--accent-surface)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800 }}>
              01
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem' }}>Search Destination</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Use GPS or search popular commercial zones in Coimbatore to inspect guaranteed bays and tariffs.
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--accent-surface)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800 }}>
              02
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem' }}>Select Exact Bay</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Choose your preferred level, aisle, and physical parking slot on the interactive 2D floor matrix.
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--accent-surface)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800 }}>
              03
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem' }}>Instant Digital Pass</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Complete the demo checkout to receive your scannable entry QR pass and booking reference.
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--accent-surface)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800 }}>
              04
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem' }}>Indoor Wayfinding</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Never lose your parked car. Follow live walking directions and track active parking time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
