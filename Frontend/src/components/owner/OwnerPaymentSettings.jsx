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
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading owner payment configuration...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            {/* Form Inputs */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Owner / Business Display Name <strong style={{ color: '#ef4444' }}>*</strong></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Shown on payment screens</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    value={upiName}
                    onChange={(e) => setUpiName(e.target.value)}
                    placeholder="e.g. Muruganathan Parking Services"
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>UPI ID / VPA <strong style={{ color: '#ef4444' }}>*</strong></span>
                  <span style={{ fontSize: '0.75rem', color: isValidUpi ? 'var(--text-dim)' : '#ef4444' }}>
                    {isValidUpi ? 'format: name@bank' : 'Invalid UPI format'}
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. owner1@okhdfcbank or business@upi"
                    className={`input-field ${!isValidUpi && upiId ? 'input-error' : ''}`}
                    style={{
                      paddingLeft: '2.5rem',
                      fontFamily: 'var(--font-mono)',
                      borderColor: !isValidUpi && upiId ? '#ef4444' : undefined,
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                  Compatible with Google Pay, PhonePe, Paytm, BHIM, and all UPI applications.
                </span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Optional Payment Description / Facility Note
                </label>
                <textarea
                  rows={2}
                  value={upiDescription}
                  onChange={(e) => setUpiDescription(e.target.value)}
                  placeholder="e.g. Direct customer bay reservation fee — Non-refundable after check-in."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <GlareHover borderRadius="var(--radius-md)" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.4}>
                  <button
                    type="submit"
                    disabled={saving || !isValidUpi || !upiId.trim() || !upiName.trim()}
                    className="btn btn-primary"
                    style={{ minWidth: 160, fontWeight: 700 }}
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save UPI Settings'}
                  </button>
                </GlareHover>
              </div>
            </form>

            {/* Live QR Code Preview Card */}
            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '1rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
                Live Customer QR Preview
              </span>

              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-lg)',
                  background: '#ffffff',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {previewQrUrl ? (
                  <img
                    src={previewQrUrl}
                    alt="Owner UPI Preview"
                    style={{ width: 170, height: 170, display: 'block', borderRadius: 'var(--radius-sm)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 170,
                      height: 170,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      gap: 8,
                      fontSize: '0.75rem',
                      padding: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    <QrCode size={40} style={{ opacity: 0.5 }} />
                    <span>Enter a valid UPI ID to preview your payment QR</span>
                  </div>
                )}
              </div>

              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>
                  {upiName.trim() || 'Your Business Name'}
                </strong>
                <code style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  {upiId.trim() || 'yourname@bank'}
                </code>
              </div>

              {previewQrUrl && (
                <button
                  type="button"
                  onClick={handleDownloadPreviewQr}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 6 }}
                >
                  <Download size={14} /> Download Sample QR
                </button>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <Info size={13} />
                <span>When customers book, the exact reservation amount is encoded dynamically into the QR.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </BorderGlow>
  );
}
