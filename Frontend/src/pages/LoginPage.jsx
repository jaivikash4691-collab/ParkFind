import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BorderGlow } from '../components/animation/BorderGlow';
import { GlareHover } from '../components/animation/GlareHover';
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
  CheckCircle2
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

        showToast('Signed in successfully.', 'success');
      }

      // Successful auth - redirect to intended destination
      if (redirectParam) {
        navigate(redirectParam, { replace: true });
      } else {
        navigate(role === 'owner' ? '/owner' : '/', { replace: true });
      }
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="app-container"
      style={{
        minHeight: 'calc(100vh - 180px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px' }}>
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
              padding: '0.65rem 1rem',
              marginBottom: '1rem',
              justifyContent: 'flex-start',
              gap: 8,
              fontSize: '0.8125rem',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Please sign in to reserve your parking spot.</span>
          </div>
        )}

        <BorderGlow
          animated={true}
          borderRadius="18px"
          glowColor="var(--accent-primary, #00d2ff)"
          gradientColors={['#00d2ff', '#3b82f6', '#10b981']}
          glowIntensity={0.85}
          backgroundColor="var(--bg-surface)"
        >
          <div
            className="card"
            style={{
              padding: '2rem',
              border: 'none',
              backgroundColor: 'transparent',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                className="brand-icon-box"
                style={{
                  width: 48,
                  height: 48,
                  fontSize: '1.5rem',
                  margin: '0 auto 1rem auto',
                }}
              >
                <span>P</span>
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                {isRegister ? `Create ${role === 'owner' ? 'Owner' : 'Driver'} Account` : 'Sign In to Parkit'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isRegister
                  ? 'Reserve bays instantly or list commercial parking spaces'
                  : 'Enter your credentials to access your parking workspace'}
              </p>
            </div>

            {/* Role Switcher Tabs */}
            <div
              style={{
                display: 'flex',
                padding: 4,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-subtle)',
                marginBottom: '1.5rem',
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setRole('customer')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: role === 'customer' ? 'var(--bg-surface)' : 'transparent',
                  color: role === 'customer' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: role === 'customer' ? 800 : 500,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: role === 'customer' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Car size={16} /> Driver
              </button>

              <button
                type="button"
                onClick={() => setRole('owner')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: role === 'owner' ? 'var(--bg-surface)' : 'transparent',
                  color: role === 'owner' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: role === 'owner' ? 800 : 500,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: role === 'owner' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Building2 size={16} /> Space Owner
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isRegister && (
                <>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        size={16}
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
                      />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="e.g. Ramesh Kumar"
                        className="form-control"
                        style={{ paddingLeft: 38 }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      Mobile Phone
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone
                        size={16}
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
                      />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98422 12345"
                        className="form-control"
                        style={{ paddingLeft: 38 }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="form-control"
                    style={{ paddingLeft: 38 }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="form-control"
                    style={{ paddingLeft: 38, paddingRight: 38 }}
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
                      cursor: 'pointer',
                      color: 'var(--text-dim)',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.45}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {submitting
                    ? 'Authenticating...'
                    : isRegister
                    ? `Create ${role === 'owner' ? 'Owner' : 'Driver'} Account`
                    : `Sign In as ${role === 'owner' ? 'Owner' : 'Driver'}`}
                </button>
              </GlareHover>

              {/* Toggle Register / Login */}
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)' }}
                >
                  {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </button>
              </div>

              {/* Demo Credentials Helper */}
              {!isRegister && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(0, 210, 255, 0.05)',
                    border: '1px dashed var(--border-medium)',
                    fontSize: '0.75rem',
                    color: 'var(--text-dim)',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 2 }}>
                    Demo Credentials:
                  </div>
                  <div>Customer: <code style={{ color: 'var(--accent-primary)' }}>demo.customer@parkfind.test</code> / <code style={{ color: 'var(--accent-primary)' }}>Demo@12345</code></div>
                  <div>Owner: <code style={{ color: 'var(--accent-primary)' }}>owner1@parkfind.test</code> / <code style={{ color: 'var(--accent-primary)' }}>Demo@12345</code></div>
                </div>
              )}
            </form>
          </div>
        </BorderGlow>
      </div>
    </div>
  );
}
