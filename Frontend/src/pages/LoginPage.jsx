import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Car,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { login, register, isAuthenticated, isOwner } = useAuth();
  const { showToast } = useToast();

  const redirectParam = searchParams.get('redirect') || location.state?.from?.pathname;
  const initialModeParam = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const initialRoleParam = searchParams.get('role') === 'owner' ? 'owner' : 'customer';

  const [isRegister, setIsRegister] = useState(initialModeParam === 'register');
  const [role, setRole] = useState(initialRoleParam);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      if (redirectParam) {
        navigate(redirectParam, { replace: true });
      } else {
        navigate(isOwner ? '/owner' : '/', { replace: true });
      }
    }
  }, [isAuthenticated, isOwner, redirectParam, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRoleSelect = (newRole) => {
    setRole(newRole);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!formData.fullName.trim()) {
          showToast('Please enter your full name', 'warning');
          setSubmitting(false);
          return;
        }

        await register({
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || '+91 98422 00000',
          password: formData.password,
          role,
        });

        showToast(`Welcome to Parkit, ${formData.fullName.split(' ')[0]}!`, 'success');
      } else {
        await login({
          email: formData.email.trim(),
          password: formData.password,
          role,
        });

        showToast(`Signed in successfully as ${role === 'owner' ? 'Space Owner' : 'Driver'}.`, 'success');
      }

      // Successful auth - redirect to intended destination
      if (redirectParam) {
        navigate(redirectParam, { replace: true });
      } else {
        navigate(role === 'owner' ? '/owner' : '/', { replace: true });
      }
    } catch (err) {
      showToast(err.message || 'Authentication failed. Please check your credentials.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = (targetRole) => {
    if (targetRole === 'owner') {
      setRole('owner');
      setFormData({
        fullName: 'Muruganathan S',
        email: 'owner1@parkfind.test',
        phone: '+91 98422 10001',
        password: 'Demo@12345',
      });
      showToast('Loaded Space Owner demo credentials', 'info', 1500);
    } else {
      setRole('customer');
      setFormData({
        fullName: 'Raveendran K',
        email: 'demo.customer@parkfind.test',
        phone: '+91 98422 10101',
        password: 'Demo@12345',
      });
      showToast('Loaded Driver demo credentials', 'info', 1500);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--header-height, 72px) - 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        position: 'relative',
      }}
    >
      {/* Background Decorative Ambient Radial Glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(2, 132, 199, 0.04) 50%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
        {/* Back Link */}
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6, paddingLeft: 0, color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Discovery</span>
          </button>
        </div>

        {/* Notice for redirected booking intent */}
        {redirectParam && (
          <div
            className="badge badge-primary"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              justifyContent: 'flex-start',
              gap: 8,
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Please sign in to reserve your guaranteed parking spot.</span>
          </div>
        )}

        {/* Auth Card Container with Dark Navy Card & Cyan Glow */}
        <div
          className="card"
          style={{
            padding: '2.25rem 2rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg), 0 0 30px rgba(14, 165, 233, 0.08)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div
              className="brand-icon-box"
              style={{
                width: 52,
                height: 52,
                fontSize: '1.6rem',
                margin: '0 auto 1rem auto',
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: '#ffffff',
                boxShadow: '0 4px 16px rgba(14, 165, 233, 0.35)',
              }}
            >
              <span>P</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
              {isRegister ? `Create ${role === 'owner' ? 'Owner' : 'Driver'} Account` : 'Sign In to Parkit'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {isRegister
                ? 'Reserve guaranteed parking bays or list parking spaces'
                : 'Enter your credentials to access your parking workspace'}
            </p>
          </div>

          {/* Role Switcher Tabs (Distinct glowing color for each role) */}
          <div
            style={{
              display: 'flex',
              padding: 5,
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.5rem',
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={() => handleRoleSelect('customer')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: role === 'customer' ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid transparent',
                backgroundColor: role === 'customer' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                color: role === 'customer' ? '#38bdf8' : 'var(--text-muted)',
                fontWeight: role === 'customer' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: role === 'customer' ? '0 2px 8px rgba(14, 165, 233, 0.2)' : 'none',
              }}
            >
              <Car size={16} /> Driver
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('owner')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: role === 'owner' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                backgroundColor: role === 'owner' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: role === 'owner' ? '#34d399' : 'var(--text-muted)',
                fontWeight: role === 'owner' ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: role === 'owner' ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none',
              }}
            >
              <Building2 size={16} /> Space Owner
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {isRegister && (
              <>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 700 }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={17}
                      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}
                    />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Raveendran Kumar"
                      className="form-control"
                      style={{ paddingLeft: 42, height: 46 }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 700 }}>
                    Mobile Phone
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={17}
                      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98422 10101"
                      className="form-control"
                      style={{ paddingLeft: 42, height: 46 }}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 700 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={17}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="form-control"
                  style={{ paddingLeft: 42, height: 46 }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 700 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={17}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="form-control"
                  style={{ paddingLeft: 42, paddingRight: 44, height: 46 }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 6,
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting}
              style={{
                width: '100%',
                height: 48,
                fontWeight: 800,
                fontSize: '0.95rem',
                marginTop: '0.5rem',
                gap: 8,
                boxShadow: '0 4px 16px rgba(14, 165, 233, 0.3)',
              }}
            >
              {submitting
                ? 'Authenticating...'
                : isRegister
                ? `Create ${role === 'owner' ? 'Owner' : 'Driver'} Account →`
                : `Sign In as ${role === 'owner' ? 'Space Owner' : 'Driver'} →`}
            </button>

            {/* Toggle Register / Login */}
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </div>

            {/* 1-Click Demo Credentials Helper */}
            {!isRegister && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} /> Quick Demo Autofill:
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('customer')}
                    className="btn btn-secondary btn-xs"
                    style={{ flex: 1, gap: 4, fontSize: '0.75rem' }}
                  >
                    <Car size={13} /> Driver Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoCredentials('owner')}
                    className="btn btn-secondary btn-xs"
                    style={{ flex: 1, gap: 4, fontSize: '0.75rem' }}
                  >
                    <Building2 size={13} /> Owner Demo
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

