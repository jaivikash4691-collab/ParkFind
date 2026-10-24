import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, LogIn, UserPlus } from 'lucide-react';

/**
 * PublicHeader - Clean, professional public navigation header
 * Rendered strictly for unauthenticated visitors.
 * Does not display any authenticated links (Driver Mode, Discover, Find My Car,
 * Demand Insights, My Bookings, notifications, or user profile controls).
 */
export function PublicHeader({ onOpenAuth }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar-wrapper public-header-wrapper">
      <div className="app-container">
        <div
          className="navbar-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 'var(--header-height, 68px)',
          }}
        >
          {/* Logo and Brand Name */}
          <Link
            to="/"
            className="nav-brand"
            style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}
          >
            <div className="brand-icon-box" style={{ width: 38, height: 38, fontSize: '1.15rem' }}>
              <span>P</span>
            </div>
            <div className="brand-text-box">
              <div className="brand-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  Parkit
                </span>
                <span
                  className="badge badge-primary"
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 7px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Coimbatore
                </span>
              </div>
              <span className="brand-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Smart Urban Parking Marketplace
              </span>
            </div>
          </Link>

          {/* Public Action Controls: Theme Toggle + Sign In + Create Account */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary btn-icon"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title="Toggle Theme"
              style={{ width: 38, height: 38 }}
            >
              {theme === 'dark' ? (
                <Sun size={17} style={{ color: '#f59e0b' }} />
              ) : (
                <Moon size={17} style={{ color: '#6366f1' }} />
              )}
            </button>

            {/* Sign In Button */}
            <button
              onClick={() => onOpenAuth('login')}
              className="btn btn-secondary btn-sm"
              style={{
                gap: 6,
                padding: '0.45rem 0.95rem',
                fontSize: '0.825rem',
                fontWeight: 700,
              }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>

            {/* Create Account Button */}
            <button
              onClick={() => onOpenAuth('register')}
              className="btn btn-primary btn-sm"
              style={{
                gap: 6,
                padding: '0.45rem 1rem',
                fontSize: '0.825rem',
                fontWeight: 700,
                boxShadow: '0 2px 10px rgba(0, 210, 255, 0.25)',
              }}
            >
              <UserPlus size={15} />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
