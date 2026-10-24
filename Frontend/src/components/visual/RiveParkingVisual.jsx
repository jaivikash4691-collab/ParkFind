import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export function RiveParkingVisual({ type = 'radar', width = 160, height = 160, className = '' }) {
  const canvasRef = useRef(null);

  // Trigger celebration confetti for success state
  useEffect(() => {
    if (type === 'success') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0ea5e9', '#10b981', '#38bdf8', '#f59e0b'],
      });
    }
  }, [type]);

  if (type === 'radar') {
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width, height, position: 'relative' }}
      >
        {/* Pulsing Concentric Rings */}
        <motion.div
          animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: width * 0.45,
            height: height * 0.45,
            borderRadius: '50%',
            border: '2px solid var(--accent-primary)',
          }}
        />
        <motion.div
          animate={{ scale: [1, 2.4], opacity: [0.4, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, delay: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: width * 0.4,
            height: height * 0.4,
            borderRadius: '50%',
            border: '1.5px solid var(--accent-primary)',
          }}
        />

        {/* Center Scanner Core */}
        <div
          style={{
            width: width * 0.35,
            height: height * 0.35,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-active))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px var(--accent-glow)',
            zIndex: 2,
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1rem',
          }}
        >
          🅿️
        </div>

        {/* Orbiting Detected Spot Markers */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: width * 0.85,
            height: height * 0.85,
            borderRadius: '50%',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -6,
              left: '50%',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 10px var(--success)',
            }}
          />
        </motion.div>
      </div>
    );
  }

  if (type === 'success') {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height, position: 'relative' }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 180 }}
          style={{
            width: width * 0.7,
            height: height * 0.7,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)',
            color: '#ffffff',
            fontSize: width * 0.32,
          }}
        >
          ✓
        </motion.div>
      </div>
    );
  }

  if (type === 'empty') {
    return (
      <div
        className={`flex flex-col items-center justify-center ${className}`}
        style={{ width, height, color: 'var(--text-dim)' }}
      >
        <div style={{ fontSize: width * 0.3, marginBottom: 8 }}>🅿️</div>
      </div>
    );
  }

  return null;
}
