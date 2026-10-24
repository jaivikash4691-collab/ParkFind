import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Car, Building2, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react';

export function AuthModal({ isOpen, onClose, initialRole = 'customer' }) {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState(initialRole);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state (always clean initial state)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setFormData({ fullName: '', email: '', phone: '', password: '' });
    setIsRegister(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
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

      handleClose();
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isRegister ? `Create ${role === 'owner' ? 'Owner' : 'Customer'} Account` : `Sign In to Parkit`}
      subtitle={isRegister ? 'List or reserve parking spots instantly' : 'Select your workspace role to continue'}
      maxWidth="460px"
    >
      {/* Role Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          padding: 4,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-subtle)',
          marginBottom: '1.25rem',
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
            gap: 6,
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.8125rem',
            backgroundColor: role === 'customer' ? 'var(--bg-surface)' : 'transparent',
            color: role === 'customer' ? 'var(--accent-primary)' : 'var(--text-muted)',
            boxShadow: role === 'customer' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Car size={16} /> Driver / Customer
        </button>

        <button
          type="button"
          onClick={() => setRole('owner')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.8125rem',
            backgroundColor: role === 'owner' ? 'var(--bg-surface)' : 'transparent',
            color: role === 'owner' ? 'var(--success-text)' : 'var(--text-muted)',
            boxShadow: role === 'owner' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Building2 size={16} /> Facility Owner
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {isRegister && (
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Raveendran K"
                className="form-input"
                style={{ paddingLeft: 38 }}
                required
              />
            </div>
          </div>
        )}

        {isRegister && (
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98422 10101"
                className="form-input"
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>
        )}

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Email Address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="form-input"
              style={{ paddingLeft: 38 }}
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="form-input"
              style={{ paddingLeft: 38, paddingRight: 40 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: 10,
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Demo Credentials Helper Pill */}
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: 'var(--text-secondary)' }}>Demo Account Credentials:</strong>
          <br />
          {role === 'owner' ? (
            <>Owner: <code>owner1@parkfind.test</code> · Pwd: <code>Demo@12345</code></>
          ) : (
            <>Customer: <code>demo.customer@parkfind.test</code> · Pwd: <code>Demo@12345</code></>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg"
          disabled={submitting}
          style={{ marginTop: '0.25rem' }}
        >
          {submitting ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-primary)' }}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
