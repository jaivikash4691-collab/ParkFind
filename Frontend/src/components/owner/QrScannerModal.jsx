import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { bookingsApi } from '../../api/bookings';
import { Modal } from '../ui/Modal';
import { BorderGlow } from '../animation/BorderGlow';
import { useToast } from '../../context/ToastContext';
import {
  Camera,
  CameraOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Car,
  Clock,
  Phone,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

function playScanSound(success = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(146.83, ctx.currentTime + 0.12); // D3
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Ignore audio context autoplay warnings
  }
}

export function QrScannerModal({ isOpen, onClose, onValidationSuccess }) {
  const { showToast } = useToast();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState('');

  // Start Camera Feed
  const startCamera = async () => {
    try {
      setCameraError('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported on this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera permissions or use manual code entry.'
          : 'Unable to connect to camera. Please use manual reference code entry.'
      );
      setCameraActive(false);
    }
  };

  // Stop Camera Feed
  const stopCamera = () => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Real-time Scanning loop with jsQR and native BarcodeDetector
  const startScanningLoop = () => {
    const scan = async () => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animFrameId.current = requestAnimationFrame(scan);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let detectedCode = null;

      // 1. Try native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) {
            detectedCode = barcodes[0].rawValue;
          }
        } catch (e) {
          // fallback to jsQR
        }
      }

      // 2. Fallback to jsQR
      if (!detectedCode) {
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.data) {
            detectedCode = code.data;
          }
        } catch (e) {
          // frame read error
        }
      }

      if (detectedCode && detectedCode !== lastScannedCode && !validating) {
        setLastScannedCode(detectedCode);
        handleValidateCode(detectedCode);
        return; // Pause scanning while validating
      }

      animFrameId.current = requestAnimationFrame(scan);
    };

    animFrameId.current = requestAnimationFrame(scan);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setValidationResult(null);
      setManualCode('');
      setLastScannedCode('');
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Submit code for backend verification
  const handleValidateCode = async (rawInput) => {
    const code = (rawInput || manualCode).trim();
    if (!code) {
      showToast('Please enter or scan a QR token or booking reference.', 'warning');
      return;
    }

    try {
      setValidating(true);

      let payload = { code };
      // Check if code is JSON format from our QR generator
      if (code.startsWith('{')) {
        try {
          const parsed = JSON.parse(code);
          payload = {
            token: parsed.token,
            ref: parsed.ref,
            bid: parsed.bid
          };
        } catch (e) {
          payload = { code };
        }
      }

      const response = await bookingsApi.validatePass(payload);

      if (response && response.valid) {
        playScanSound(true);
        setValidationResult({
          status: 'success',
          title: 'Gate Barrier Authorized ✓',
          message: response.message || 'Valid Reservation Confirmed!',
          booking: response.booking,
          bookingRef: response.bookingRef
        });
        showToast('✓ Valid pass! Barrier released.', 'success');
        if (onValidationSuccess) onValidationSuccess(response.booking);
      } else {
        playScanSound(false);
        setValidationResult({
          status: 'error',
          reason: response?.reason || 'invalid',
          title: 'Validation Rejected ✕',
          message: response?.message || 'Invalid or unrecognized parking pass.',
          bookingRef: response?.bookingRef
        });
        showToast(response?.message || 'Invalid pass', 'danger');
      }
    } catch (err) {
      playScanSound(false);
      setValidationResult({
        status: 'error',
        reason: 'error',
        title: 'Validation Failed ✕',
        message: err.message || 'Failed to validate pass with server.',
      });
      showToast(err.message || 'Validation request failed', 'danger');
    } finally {
      setValidating(false);
    }
  };

  const handleResetForNextScan = () => {
    setValidationResult(null);
    setManualCode('');
    setLastScannedCode('');
    if (cameraActive) {
      startScanningLoop();
    } else {
      startCamera();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Gate Scanner & Barrier Release"
      subtitle="Point camera at customer QR pass or enter booking reference"
      maxWidth="540px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* If validation result is showing, display verification result card */}
        {validationResult ? (
          <div>
            <BorderGlow
              animated={true}
              borderRadius="18px"
              glowColor={validationResult.status === 'success' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)'}
              glowIntensity={0.9}
              backgroundColor="var(--bg-elevated)"
            >
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  {validationResult.status === 'success' ? (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '2px solid #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981'
                      }}
                    >
                      <CheckCircle size={36} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '2px solid #ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ef4444'
                      }}
                    >
                      <XCircle size={36} />
                    </div>
                  )}
                </div>

                <h3
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    color: validationResult.status === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
                    marginBottom: 4
                  }}
                >
                  {validationResult.title}
                </h3>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  {validationResult.message}
                </p>

                {/* If booking data exists in result */}
                {validationResult.booking && (
                  <div
                    style={{
                      textAlign: 'left',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Booking Reference:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                        {validationResult.booking.bookingRef}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned Bay:</span>
                      <span className="badge badge-primary font-mono" style={{ fontSize: '0.85rem' }}>
                        Bay {validationResult.booking.slotNo}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vehicle Plate:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{validationResult.booking.vehicleNumber}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Driver Name:</span>
                      <strong>{validationResult.booking.driverName}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Phone Contact:</span>
                      <span>{validationResult.booking.driverPhone}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Facility:</span>
                      <span>{validationResult.booking.locationName}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    onClick={handleResetForNextScan}
                    className="btn btn-primary"
                    style={{ gap: 6, minWidth: 160 }}
                  >
                    <RefreshCw size={15} /> Scan Next Pass
                  </button>
                  <button
                    onClick={onClose}
                    className="btn btn-secondary"
                  >
                    Close Gate
                  </button>
                </div>
              </div>
            </BorderGlow>
          </div>
        ) : (
          /* Active Camera / Scanner Viewport */
          <div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 260,
                backgroundColor: '#000000',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-medium)',
              }}
            >
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: cameraActive ? 'block' : 'none'
                }}
              />

              {/* Viewfinder Overlay */}
              {cameraActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 180,
                    height: 180,
                    border: '2px solid rgba(0, 210, 255, 0.8)',
                    borderRadius: 16,
                    boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.45)',
                    pointerEvents: 'none'
                  }}
                >
                  {/* Scanning beam animation */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: 'linear-gradient(90deg, transparent, #00d2ff, transparent)',
                      boxShadow: '0 0 8px #00d2ff',
                      animation: 'scanBeam 2s ease-in-out infinite'
                    }}
                  />
                </div>
              )}

              {/* Camera Offline / Error State */}
              {!cameraActive && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                  <CameraOff size={36} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {cameraError ? 'Camera Unavailable' : 'Camera Initializing...'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', maxWidth: 280, margin: '6px auto 12px auto' }}>
                    {cameraError || 'Allow camera permissions or type reference code below.'}
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn btn-secondary btn-xs"
                    style={{ gap: 4 }}
                  >
                    <RefreshCw size={12} /> Retry Camera
                  </button>
                </div>
              )}

              {/* Validating Spinner Overlay */}
              {validating && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(10, 16, 31, 0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    zIndex: 10
                  }}
                >
                  <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                    Verifying Pass Cryptographic Signature...
                  </span>
                </div>
              )}
            </div>

            {/* Manual Code Entry Fallback */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  Manual Reference Entry (Fallback)
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleValidateCode(manualCode);
                }}
                style={{ display: 'flex', gap: '0.5rem' }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    placeholder="Enter PK-XXXX-XXXX or paste QR token"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 34, height: 38, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={validating || !manualCode.trim()}
                  className="btn btn-primary"
                  style={{ gap: 6, whiteSpace: 'nowrap' }}
                >
                  <ShieldCheck size={16} /> Validate Pass
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanBeam {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 98%; opacity: 1; }
          100% { top: 0%; opacity: 0.8; }
        }
      `}</style>
    </Modal>
  );
}
