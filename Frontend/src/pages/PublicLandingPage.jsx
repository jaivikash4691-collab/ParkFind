import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BorderGlow } from '../components/animation/BorderGlow';
import { GlareHover } from '../components/animation/GlareHover';
import {
  Search,
  Navigation,
  Lock,
  LogIn,
  UserPlus,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  Compass,
  Car,
  Building2,
  ArrowRight
} from 'lucide-react';

export function PublicLandingPage() {
  const navigate = useNavigate();
  const { openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');

  const popularAreas = [
    'RS Puram',
    'Gandhipuram',
    'Race Course',
    'Peelamedu',
    'Saibaba Colony',
    'Avinashi Road',
  ];

  // Intercept any search attempt and require authentication
  const handleProtectedAction = (actionDesc, redirectTarget = '/explore') => {
    showToast(`Please sign in to access Parkit and ${actionDesc}.`, 'warning');
    navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const target = searchQuery.trim() ? `/explore?search=${encodeURIComponent(searchQuery.trim())}` : '/explore';
    handleProtectedAction('search parking spaces', target);
  };

  const handleFilterArea = (area) => {
    handleProtectedAction(`view parking facilities in ${area}`, `/explore?area=${encodeURIComponent(area)}`);
  };

  const handleUseGps = () => {
    handleProtectedAction('find nearby parking using GPS', '/explore?sort=nearest');
  };

  return (
    <div className="app-container" style={{ paddingBottom: '4rem' }}>
      {/* ================= HERO SECTION ================= */}
      <section style={{ position: 'relative', paddingTop: '3.5rem', paddingBottom: '3.5rem', textAlign: 'center' }}>
        {/* Subtle Background Glow Orb */}
        <div
          className="hero-gradient-orb"
          style={{
            top: '0%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '520px',
            height: '320px',
            background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 860, margin: '0 auto' }}>
          {/* Security & Access Pill */}
          <div
            className="badge badge-primary"
            style={{
              padding: '0.45rem 1.1rem',
              fontSize: '0.8125rem',
              marginBottom: '1.5rem',
              gap: 8,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Lock size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>Smart Urban Parking Marketplace · Coimbatore</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5.5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
            }}
          >
            Guaranteed parking near your destination,{' '}
            <span className="shimmer-text">on demand.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              maxWidth: 700,
              margin: '0 auto 2.5rem auto',
            }}
          >
            Real-time bay availability, digital QR barrier passes, and turn-by-turn indoor wayfinding across Coimbatore's major commercial hubs.
          </p>

          {/* Interactive Search Bar (Requires Auth on Action) */}
          <form
            onSubmit={handleSearchSubmit}
            className="search-bar-card"
            style={{ maxWidth: 720, margin: '0 auto 1.5rem auto' }}
          >
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
              title="Locate nearest parking with GPS (Sign In Required)"
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

          {/* Popular Areas Pills (Requires Auth on Click) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '2.5rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginRight: 4 }}>
              Popular Areas:
            </span>
            {popularAreas.map((area) => (
              <button
                key={area}
                type="button"
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

          {/* Authentication Call to Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.45}>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary btn-lg"
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  gap: 8,
                  boxShadow: '0 4px 20px rgba(0, 210, 255, 0.35)',
                }}
              >
                <LogIn size={18} />
                <span>Sign In to Access Marketplace</span>
              </button>
            </GlareHover>

            <button
              onClick={() => navigate('/login?mode=register')}
              className="btn btn-secondary btn-lg"
              style={{
                padding: '0.75rem 1.75rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                gap: 8,
              }}
            >
              <UserPlus size={18} />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= PLATFORM FEATURE PREVIEWS (AUTHENTICATION REQUIRED NOTICE) ================= */}
      <section style={{ maxWidth: 960, margin: '0 auto' }}>
        <BorderGlow
          animated={true}
          borderRadius="20px"
          glowColor="var(--accent-primary, #00d2ff)"
          gradientColors={['#00d2ff', '#3b82f6', '#10b981']}
          glowIntensity={0.8}
          backgroundColor="var(--bg-surface)"
        >
          <div style={{ padding: '2.5rem', backgroundColor: 'var(--bg-surface)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '2rem',
                paddingBottom: '1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
                  Platform Capability
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                  Secure Smart Urban Parking for Coimbatore
                </h2>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(0, 210, 255, 0.08)',
                  border: '1px solid var(--border-medium)',
                  fontSize: '0.8rem',
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                }}
              >
                <Lock size={14} />
                <span>Protected Access: Sign In Required</span>
              </div>
            </div>

            <div className="grid grid-cols-3 md-grid-cols-1" style={{ gap: '1.5rem' }}>
              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 210, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <MapPin size={20} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Interactive Bay Telemetry
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Explore 9+ commercial parking structures across RS Puram, Gandhipuram, and Race Course with live sensor occupancy.
                </p>
                <button
                  type="button"
                  onClick={() => handleProtectedAction('explore the interactive map', '/explore')}
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: 0,
                    justifyContent: 'flex-start',
                    fontSize: '0.8rem',
                    color: 'var(--accent-primary)',
                    marginTop: 'auto',
                    gap: 4,
                  }}
                >
                  <span>Explore Map</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--success-text)',
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Digital Entry Pass Reservations
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Pre-book guaranteed bays with instant UPI checkout, dynamic hourly tariffs, and cryptographic barrier scan codes.
                </p>
                <button
                  type="button"
                  onClick={() => handleProtectedAction('reserve guaranteed bays', '/explore')}
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: 0,
                    justifyContent: 'flex-start',
                    fontSize: '0.8rem',
                    color: 'var(--success-text)',
                    marginTop: 'auto',
                    gap: 4,
                  }}
                >
                  <span>Book Bay</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8',
                  }}
                >
                  <Car size={20} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Find My Car &amp; Wayfinding
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Never lose your vehicle. Track active parking sessions, check remaining time, and follow turn-by-turn aisle directions.
                </p>
                <button
                  type="button"
                  onClick={() => handleProtectedAction('use Find My Car wayfinding', '/find-car')}
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: 0,
                    justifyContent: 'flex-start',
                    fontSize: '0.8rem',
                    color: '#818cf8',
                    marginTop: 'auto',
                    gap: 4,
                  }}
                >
                  <span>Locate Vehicle</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </BorderGlow>
      </section>
    </div>
  );
}
