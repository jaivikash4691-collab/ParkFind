import React, { useState, useEffect, useRef } from 'react';
import './LatticeLoader.css';

/**
 * LatticeLoader Component
 * React Bits Animated Lattice Pattern Loader
 *
 * Props:
 * - status: 'working' | 'done' | 'error' (default: 'working')
 * - pattern: 'orbit' | 'pulse' | 'sweep' | 'ripple' | 'spiral' | 'snake' | 'dots' | 'arrow' | 'spin' | 'rain' (default: 'orbit')
 * - shape: 'round' | 'square' (default: 'round')
 * - message: string (e.g. "Finding available parking...")
 * - showTimer: boolean (display elapsed seconds, default: true)
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - color: string (CSS color token, default: 'var(--accent-primary, #00d2ff)')
 * - rows: number (default: 4)
 * - cols: number (default: 4)
 */
export function LatticeLoader({
  status = 'working',
  pattern = 'orbit',
  shape = 'round',
  message,
  showTimer = true,
  size = 'md',
  color = 'var(--accent-primary, #00d2ff)',
  rows = 4,
  cols = 4,
  className = '',
  style = {}
}) {
  const [elapsed, setElapsed] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef(null);
  const animRef = useRef(null);

  // Timer counter when status === 'working'
  useEffect(() => {
    if (status === 'working') {
      const startTime = performance.now();
      timerRef.current = setInterval(() => {
        setElapsed(((performance.now() - startTime) / 1000).toFixed(1));
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [status]);

  // Pattern sequence step animation
  useEffect(() => {
    if (status !== 'working') return;

    // Pattern tick interval
    const speed = pattern === 'spin' || pattern === 'orbit' ? 80 : 120;
    animRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 100);
    }, speed);

    return () => clearInterval(animRef.current);
  }, [status, pattern]);

  // Compute node intensity / activation for each cell (r, c) based on pattern
  const getNodeState = (r, c) => {
    if (status === 'done') {
      // Checkmark icon pattern in 4x4 matrix:
      // (1,0), (2,1), (1,2), (0,3)
      const isCheck = (r === 2 && c === 1) || (r === 3 && c === 2) || (r === 2 && c === 3) || (r === 1 && c === 3);
      return { active: isCheck, intensity: isCheck ? 1 : 0.15 };
    }

    if (status === 'error') {
      // 'X' cross pattern
      const isX = r === c || r + c === rows - 1;
      return { active: isX, intensity: isX ? 1 : 0.12 };
    }

    // Pattern calculations
    const centerR = (rows - 1) / 2;
    const centerC = (cols - 1) / 2;
    const distFromCenter = Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
    const angle = Math.atan2(r - centerR, c - centerC); // -PI to PI

    switch (pattern) {
      case 'orbit': {
        // Rotates around circumference
        const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // 0 to 1
        const orbitPhase = ((activeStep * 0.05) % 1);
        const diff = Math.abs(normalizedAngle - orbitPhase);
        const circularDiff = Math.min(diff, 1 - diff);
        const isActive = circularDiff < 0.22 && distFromCenter > 0.4;
        return {
          active: isActive,
          intensity: isActive ? Math.max(0.2, 1 - circularDiff * 3.5) : 0.15
        };
      }

      case 'pulse': {
        // Radial ripple outward
        const wave = (activeStep * 0.2) % 3.5;
        const diff = Math.abs(distFromCenter - wave);
        const isActive = diff < 0.8;
        return {
          active: isActive,
          intensity: isActive ? Math.max(0.2, 1 - diff) : 0.12
        };
      }

      case 'sweep': {
        // Linear diagonal or column sweep
        const sweepIndex = (activeStep % (rows + cols));
        const cellIndex = r + c;
        const diff = Math.abs(cellIndex - sweepIndex);
        const isActive = diff <= 1.2;
        return {
          active: isActive,
          intensity: isActive ? Math.max(0.25, 1 - diff * 0.6) : 0.12
        };
      }

      case 'ripple': {
        const ring = (activeStep * 0.15) % 3;
        const diff = Math.abs(distFromCenter - ring);
        const isActive = diff < 0.7;
        return {
          active: isActive,
          intensity: isActive ? 1 - diff * 0.9 : 0.12
        };
      }

      case 'snake': {
        // Zig-zag traversal
        const flatIndex = r % 2 === 0 ? r * cols + c : r * cols + (cols - 1 - c);
        const snakeHead = activeStep % (rows * cols);
        const diff = Math.abs(flatIndex - snakeHead);
        const isActive = diff < 3;
        return {
          active: isActive,
          intensity: isActive ? 1 - diff * 0.3 : 0.15
        };
      }

      case 'dots': {
        // Staggered sine wave
        const val = Math.sin(activeStep * 0.25 + (r * cols + c) * 0.4);
        const isActive = val > 0.3;
        return {
          active: isActive,
          intensity: Math.max(0.15, (val + 1) / 2)
        };
      }

      case 'arrow': {
        // Upward/Rightward arrow pattern
        const isArrow = (r === 0 && c === 2) || (r === 1 && (c === 1 || c === 2 || c === 3)) || (r >= 2 && c === 2);
        const wave = Math.sin(activeStep * 0.3 - r);
        return {
          active: isArrow && wave > 0,
          intensity: isArrow ? Math.max(0.3, wave) : 0.12
        };
      }

      case 'spin': {
        // Cross arms rotating
        const stepAngle = (activeStep * 0.2) % (2 * Math.PI);
        const currentAngle = angle < 0 ? angle + 2 * Math.PI : angle;
        const diff = Math.abs(currentAngle - stepAngle);
        const circularDiff = Math.min(diff, 2 * Math.PI - diff);
        const isActive = circularDiff < 0.45;
        return {
          active: isActive,
          intensity: isActive ? 1 : 0.12
        };
      }

      case 'rain': {
        // Falling columns
        const dropRow = (activeStep + c * 2) % (rows + 2);
        const isActive = Math.abs(r - dropRow) < 1;
        return {
          active: isActive,
          intensity: isActive ? 1 : 0.15
        };
      }

      case 'spiral':
      default: {
        const spiralPhase = (angle + distFromCenter * 1.5 - activeStep * 0.15) % (2 * Math.PI);
        const isActive = Math.abs(spiralPhase) < 0.9;
        return {
          active: isActive,
          intensity: isActive ? 1 : 0.15
        };
      }
    }
  };

  const getStatusColor = () => {
    if (status === 'done') return 'var(--success, #10b981)';
    if (status === 'error') return 'var(--danger, #ef4444)';
    return color;
  };

  const statusColor = getStatusColor();

  return (
    <div
      className={`lattice-loader-root lattice-${size} lattice-${status} lattice-shape-${shape} ${className}`}
      style={{
        '--lattice-color': statusColor,
        ...style
      }}
      role="status"
      aria-live="polite"
      aria-busy={status === 'working'}
    >
      {/* 2D Matrix of Lattice Nodes */}
      <div
        className="lattice-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
        }}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const { active, intensity } = getNodeState(r, c);
            return (
              <span
                key={`${r}-${c}`}
                className={`lattice-node ${active ? 'is-active' : ''} ${shape === 'round' ? 'node-round' : 'node-square'}`}
                style={{
                  opacity: intensity,
                  transform: active ? 'scale(1.22)' : 'scale(0.85)',
                  backgroundColor: statusColor,
                  boxShadow: active ? `0 0 10px ${statusColor}` : 'none'
                }}
              />
            );
          })
        )}
      </div>

      {/* Message and Status Indicator */}
      {(message || showTimer) && (
        <div className="lattice-meta">
          {message && <div className="lattice-message">{message}</div>}
          {showTimer && status === 'working' && (
            <div className="lattice-timer">
              <span className="lattice-timer-pulse"></span>
              <span>{elapsed}s</span>
            </div>
          )}
          {status === 'done' && (
            <div className="lattice-status-badge badge-done">Completed</div>
          )}
          {status === 'error' && (
            <div className="lattice-status-badge badge-error">Action Failed</div>
          )}
        </div>
      )}
    </div>
  );
}

export default LatticeLoader;
