import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BorderGlow } from '../animation/BorderGlow';
import { GlareHover } from '../animation/GlareHover';
import { Clock, Navigation, Plus } from 'lucide-react';

export function ActiveSessionBanner() {
  const { activeSession, formattedRemainingTime, quickExtend } = useActiveSession();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on find-car page to avoid repetition
  if (!activeSession || location.pathname === '/find-car') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          zIndex: 90,
        }}
      >
        <div className="app-container" style={{ padding: '0.4rem 1rem' }}>
          <BorderGlow
            animated={true}
            borderRadius="12px"
            glowColor="#00d2ff"
            gradientColors={['#00d2ff', '#3b82f6', '#10b981']}
            glowIntensity={0.8}
            backgroundColor="#0b111e"
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.65rem 1rem',
              }}
            >
              {/* Vehicle & Spot Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge badge-success" style={{ gap: 6 }}>
                  <span className="pulse-dot" style={{ backgroundColor: '#ffffff' }} /> Active Parking Session
                </span>
                <div>
                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.95rem', marginRight: 8 }}>
                    {activeSession.vehicleNumber}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#93c5fd' }}>
                    {activeSession.locationName} · Bay <strong style={{ color: '#ffffff' }}>{activeSession.slotNo}</strong>
                  </span>
                </div>
              </div>

              {/* Timer & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} style={{ color: '#fde047' }} />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '1.15rem',
                      color: '#fde047',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {formattedRemainingTime}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => quickExtend(1)}
                    className="btn btn-xs"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      fontWeight: 700,
                    }}
                  >
                    <Plus size={13} /> 1 Hr
                  </button>

                  <GlareHover borderRadius="6px" glareColor="rgba(255,255,255,0.4)" glareOpacity={0.4}>
                    <button
                      onClick={() => navigate('/find-car')}
                      className="btn btn-primary btn-xs"
                      style={{ gap: 4 }}
                    >
                      <Navigation size={13} /> Find My Car
                    </button>
                  </GlareHover>
                </div>
              </div>
            </div>
          </BorderGlow>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
