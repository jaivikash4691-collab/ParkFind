import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { authApi } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { BorderGlow } from '../animation/BorderGlow';
import { GlareHover } from '../animation/GlareHover';
import {
  QrCode,
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Download,
  Info
} from 'lucide-react';

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function OwnerPaymentSettings({ onSettingsUpdated }) {
  const { showToast } = useToast();

  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [upiDescription, setUpiDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewQrUrl, setPreviewQrUrl] = useState('');

  // Fetch current owner payment settings
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await authApi.getOwnerPaymentSettings();
        if (res && res.data) {
          setUpiId(res.data.upi_id || '');
          setUpiName(res.data.upi_name || res.data.name || '');
          setUpiDescription(res.data.upi_description || '');
        }
      } catch (err) {
        showToast('Failed to load owner payment settings', 'danger');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Generate live preview QR code whenever upiId or upiName changes
  useEffect(() => {
    const validUpi = upiId.trim();
    if (validUpi && UPI_REGEX.test(validUpi)) {
      const name = upiName.trim() || 'Parkit Parking Facility';
      // Standard India UPI format
      const previewUri = `upi://pay?pa=${encodeURIComponent(validUpi)}&pn=${encodeURIComponent(name)}&cu=INR&tn=Parkit%20Parking%20Payment`;

      QRCode.toDataURL(previewUri, {
        width: 200,
        margin: 2,
        color: {
          dark: '#050a14',
          light: '#ffffff',
        },
      })
        .then((url) => setPreviewQrUrl(url))
        .catch((err) => console.error('Failed to generate preview QR:', err));
    } else {
      setPreviewQrUrl('');
    }
  }, [upiId, upiName]);

  const isValidUpi = upiId.trim() === '' || UPI_REGEX.test(upiId.trim());

  const handleSave = async (e) => {
    e.preventDefault();

    if (!upiId.trim()) {
      showToast('Please enter your UPI ID (e.g. yourname@okhdfcbank)', 'warning');
      return;
    }

    if (!UPI_REGEX.test(upiId.trim())) {
      showToast('Please enter a valid UPI ID (e.g. business@okhdfcbank or owner@upi)', 'danger');
      return;
    }

    if (!upiName.trim()) {
      showToast('Please specify a business or owner display name', 'warning');
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.updateOwnerPaymentSettings({
        upi_id: upiId.trim(),
        upi_name: upiName.trim(),
        upi_description: upiDescription.trim(),
      });
      showToast('Payment settings updated! Customers will now pay to this UPI ID.', 'success');
      if (onSettingsUpdated) {
        onSettingsUpdated(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update payment settings', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPreviewQr = () => {
    if (!previewQrUrl) return;
    const link = document.createElement('a');
    link.href = previewQrUrl;
    link.download = `Parkit-Owner-${upiName || 'QR'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Owner Payment QR preview downloaded', 'info');
  };

  return (
    <BorderGlow
      animated={true}
      borderRadius="16px"
      glowColor="#38bdf8"
      gradientColors={['#38bdf8', '#34d399', '#6366f1']}
      glowIntensity={0.65}
      backgroundColor="var(--bg-surface)"
    >
      <div style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="badge badge-primary" style={{ gap: 4 }}>
                <Smartphone size={13} /> Direct UPI Payouts
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0% Intermediary Fee</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Space Owner UPI Payment Settings
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Configure your direct UPI address. Customers pay parking fees directly to this account via dynamic QR codes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '6px 12px', borderRadius: 'var(--radius-full)' }}>
            <ShieldCheck size={14} /> Direct P2P Payment
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--border-medium)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading owner payment configuration...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
            {/* Form Inputs Box */}
            <div
              style={{
                padding: '1.75rem',
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1.5px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem', flex: 1 }}>
                {/* 1. Owner / Business Display Name Box */}
                <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Owner / Business Display Name <strong style={{ color: '#ef4444' }}>*</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                      Shown on payment screens
                    </span>
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Building2
                      size={18}
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--accent-primary)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="text"
                      required
                      value={upiName}
                      onChange={(e) => setUpiName(e.target.value)}
                      placeholder="e.g. Muruganathan Parking Services"
                      className="form-input input-field"
                      style={{
                        width: '100%',
                        height: '48px',
                        paddingLeft: '2.85rem',
                        paddingRight: '1rem',
                        fontSize: '0.92rem',
                        fontWeight: 500,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: '1.5px solid var(--border-medium)',
                        boxShadow: 'var(--shadow-xs)',
                        color: 'var(--text-primary)',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* 2. UPI ID / VPA Box */}
                <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      UPI ID / VPA <strong style={{ color: '#ef4444' }}>*</strong>
                    </span>
                    {isValidUpi && upiId ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> Valid UPI Format
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: isValidUpi ? 'var(--text-dim)' : '#ef4444', fontWeight: 600 }}>
                        {isValidUpi ? 'format: name@bank' : 'Invalid UPI format'}
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Smartphone
                      size={18}
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: isValidUpi && upiId ? '#10b981' : 'var(--accent-primary)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. owner1@okhdfcbank or business@upi"
                      className={`form-input input-field ${!isValidUpi && upiId ? 'input-error' : ''}`}
                      style={{
                        width: '100%',
                        height: '48px',
                        paddingLeft: '2.85rem',
                        paddingRight: '1rem',
                        fontSize: '0.92rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        letterSpacing: '0.3px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-input)',
                        border: `1.5px solid ${!isValidUpi && upiId ? '#ef4444' : 'var(--border-medium)'}`,
                        boxShadow: 'var(--shadow-xs)',
                        color: 'var(--text-primary)',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', lineHeight: 1.4 }}>
                    Supports Google Pay, PhonePe, Paytm, BHIM, Cred, and all UPI apps.
                  </span>
                </div>

                {/* 3. Payment Description Box */}
                <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Optional Payment Description / Facility Note
                  </label>
                  <textarea
                    rows={3}
                    value={upiDescription}
                    onChange={(e) => setUpiDescription(e.target.value)}
                    placeholder="e.g. Direct customer bay reservation fee — Non-refundable after check-in."
                    className="form-textarea"
                    style={{
                      width: '100%',
                      minHeight: '84px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1.5px solid var(--border-medium)',
                      boxShadow: 'var(--shadow-xs)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Submit Button */}
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.4}>
                    <button
                      type="submit"
                      disabled={saving || !isValidUpi || !upiId.trim() || !upiName.trim()}
                      className="btn btn-primary btn-lg"
                      style={{
                        minWidth: 180,
                        fontWeight: 700,
                        height: 46,
                        boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save UPI Settings'}
                    </button>
                  </GlareHover>
                </div>
              </form>
            </div>

            {/* Live QR Code Preview Box */}
            <div
              style={{
                padding: '1.75rem',
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1.5px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '1.15rem',
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--accent-primary)',
                    letterSpacing: '0.06em',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-surface)',
                  }}
                >
                  Live Customer QR Preview
                </span>
              </div>

              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  background: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {previewQrUrl ? (
                  <img
                    src={previewQrUrl}
                    alt="Owner UPI Preview"
                    style={{ width: 180, height: 180, display: 'block', borderRadius: 'var(--radius-sm)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 180,
                      height: 180,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      gap: 10,
                      fontSize: '0.8rem',
                      padding: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    <QrCode size={44} style={{ opacity: 0.45 }} />
                    <span style={{ fontWeight: 500, lineHeight: 1.4 }}>Enter a valid UPI ID to preview your payment QR</span>
                  </div>
                )}
              </div>

              <div style={{ width: '100%', maxWidth: 280 }}>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'block', wordBreak: 'break-word', fontWeight: 800 }}>
                  {upiName.trim() || 'Your Business Name'}
                </strong>
                <code
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--accent-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-surface)',
                  }}
                >
                  {upiId.trim() || 'yourname@bank'}
                </code>
              </div>

              {previewQrUrl && (
                <button
                  type="button"
                  onClick={handleDownloadPreviewQr}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 6, fontWeight: 600 }}
                >
                  <Download size={14} /> Download Sample QR
                </button>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-surface)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'left',
                }}
              >
                <Info size={14} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
                <span>When customers book, the exact reservation amount is encoded dynamically into this QR.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </BorderGlow>
  );
}
