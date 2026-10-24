import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationDropdown } from './NotificationDropdown';
import { AuthModal } from '../ui/AuthModal';
import { BubbleMenu } from '../animation/BubbleMenu';
import {
  Car,
  Building2,
  Compass,
  MapPin,
  TrendingUp,
  History,
  LayoutDashboard,
  Coins,
  QrCode,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Customer navigation routes
  const customerLinks = [
    { to: '/', label: 'Discover', icon: Compass },
    { to: '/explore', label: 'Explore & Map', icon: MapPin },
    { to: '/find-car', label: 'Find My Car', icon: Car },
    { to: '/insights', label: 'Demand Insights', icon: TrendingUp },
    { to: '/bookings', label: 'My Bookings', icon: History },
  ];

  // Owner navigation routes
  const ownerLinks = [
    { to: '/owner', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/owner/spaces', label: 'My Parking Spaces', icon: Building2 },
    { to: '/owner/bookings', label: 'Gate Check-In', icon: QrCode },
    { to: '/owner/earnings', label: 'Earnings & Financials', icon: Coins },
  ];

  const currentLinks = isOwner ? ownerLinks : customerLinks;

  // React Bits BubbleMenu product items
  const customerBubbleItems = [
    { label: 'Discover', href: '/', icon: <Compass size={16} /> },
    { label: 'Explore & Map', href: '/explore', icon: <MapPin size={16} /> },
    { label: 'Find My Car', href: '/find-car', icon: <Car size={16} /> },
    { label: 'Demand Insights', href: '/insights', icon: <TrendingUp size={16} /> },
    { label: 'My Bookings', href: '/bookings', icon: <History size={16} /> },
    {
      label: isAuthenticated ? `Profile (${user.full_name?.split(' ')[0]})` : 'Sign In / Register',
      href: isAuthenticated ? '/bookings' : undefined,
      onClick: isAuthenticated ? undefined : () => setAuthModalOpen(true),
      icon: <User size={16} />
    }
  ];

  const ownerBubbleItems = [
    { label: 'Dashboard', href: '/owner', icon: <LayoutDashboard size={16} /> },
    { label: 'Parking Spaces', href: '/owner/spaces', icon: <Building2 size={16} /> },
    { label: 'Gate Check-In', href: '/owner/bookings', icon: <QrCode size={16} /> },
    { label: 'Earnings & Financials', href: '/owner/earnings', icon: <Coins size={16} /> },
    {
      label: `Profile (${user?.full_name?.split(' ')[0] || 'Owner'})`,
      href: '/owner',
      icon: <User size={16} />
    }
  ];

  const currentBubbleItems = isOwner ? ownerBubbleItems : customerBubbleItems;

  return (
    <>
      <header className="navbar-wrapper">
        <div className="app-container">
          <div className="navbar-content">
            {/* Logo and Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <Link to={isOwner ? '/owner' : '/'} className="nav-brand">
                <div className="brand-icon-box">
                  <span>P</span>
                </div>
                <div className="brand-text-box">
                  <div className="brand-title">
                    <span>Parkit</span>
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      Coimbatore
                    </span>
                  </div>
                  <span className="brand-subtitle">
                    {isOwner ? 'Owner Control Center' : 'Smart Mobility Platform'}
                  </span>
                </div>
              </Link>

              {/* Role Mode Indicator */}
              <div className={`role-mode-pill ${isOwner ? 'owner-mode' : ''} desktop-only`}>
                {isOwner ? <Building2 size={13} /> : <Car size={13} />}
                <span>{isOwner ? 'Owner Workspace' : 'Driver Mode'}</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="desktop-only">
              <ul className="nav-links-list">
                {currentLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        end={link.to === '/' || link.to === '/owner'}
                        className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
                      >
                        <Icon size={15} />
                        <span>{link.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Right Action Icons & Auth Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {/* Notification Popover */}
              <NotificationDropdown />

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="btn btn-secondary btn-icon"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <Sun size={18} style={{ color: '#f59e0b' }} />
                ) : (
                  <Moon size={18} style={{ color: '#6366f1' }} />
                )}
              </button>

              {/* User Auth Profile Dropdown */}
              {isAuthenticated ? (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 8, padding: '0.4rem 0.75rem' }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: isOwner ? 'var(--success)' : 'var(--accent-primary)',
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                      {user.full_name?.split(' ')[0] || 'User'}
                    </span>
                    <span
                      className={`badge ${isOwner ? 'badge-success' : 'badge-primary'}`}
                      style={{ fontSize: '0.65rem', padding: '1px 5px', textTransform: 'uppercase' }}
                    >
                      {user.role}
                    </span>
                    <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} />
                  </button>

                  {profileDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        width: 220,
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 200,
                        overflow: 'hidden',
                      }}
                      onMouseLeave={() => setProfileDropdownOpen(false)}
                    >
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {user.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>

                      <div style={{ padding: '0.4rem' }}>
                        {isOwner ? (
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              navigate('/owner');
                            }}
                            className="btn btn-ghost"
                            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem' }}
                          >
                            <LayoutDashboard size={15} /> Owner Control Center
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              navigate('/bookings');
                            }}
                            className="btn btn-ghost"
                            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem' }}
                          >
                            <History size={15} /> My Bookings
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            logout();
                            navigate('/');
                          }}
                          className="btn btn-ghost"
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            fontSize: '0.8125rem',
                            color: 'var(--danger-text)',
                          }}
                        >
                          <LogOut size={15} /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: 6 }}
                >
                  <User size={15} /> Sign In
                </button>
              )}

              {/* React Bits GSAP BubbleMenu Navigation */}
              <BubbleMenu
                logo={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00d2ff, #0070f3)',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      boxShadow: '0 2px 8px rgba(0, 210, 255, 0.4)'
                    }}
                  >
                    P
                  </div>
                }
                items={currentBubbleItems}
                menuAriaLabel="Parkit Smart Menu"
                desktopItemRotation={true}
                animationDuration={0.5}
                staggerDelay={0.04}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole="customer"
      />

      <style>{`
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: inline-flex !important; }
        }
        @media (min-width: 901px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </>
  );
}
