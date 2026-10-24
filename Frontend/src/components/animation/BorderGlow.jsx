import React, { useRef, useState, useEffect } from 'react';
import './BorderGlow.css';

/**
 * BorderGlow Component
 * React Bits Pointer-Aware Edge-Responsive Mesh / Gradient Border
 *
 * Props:
 * - children: ReactNode
 * - edgeSensitivity: number (default: 1.0)
 * - glowColor: string (default: 'var(--accent-primary, #00d2ff)')
 * - gradientColors: string[] (default: ['#00d2ff', '#0070f3', '#10b981'])
 * - backgroundColor: string (default: 'var(--bg-surface, #111622)')
 * - borderRadius: string (default: '16px')
 * - glowRadius: number (default: 100)
 * - glowIntensity: number (default: 0.85)
 * - coneSpread: number (default: 45)
 * - animated: boolean (continuous or intro perimeter sweep, default: false)
 * - className: string
 * - style: object
 */
export function BorderGlow({
  children,
  edgeSensitivity = 1.0,
  glowColor = 'var(--accent-primary, #00d2ff)',
  gradientColors = ['#00d2ff', '#0070f3', '#10b981'],
  backgroundColor = 'var(--bg-surface, #111622)',
  borderRadius = '16px',
  glowRadius = 120,
  glowIntensity = 0.85,
  coneSpread = 45,
  animated = false,
  className = '',
  style = {},
  ...props
}) {
  const containerRef = useRef(null);
  const [pointerPos, setPointerPos] = useState({ x: 50, y: 50, active: false });
  const [ambientAngle, setAmbientAngle] = useState(0);
  const animFrameRef = useRef(null);

  // Handle pointer tracking
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPointerPos({ x, y, active: true });
  };

  const handleMouseLeave = () => {
    setPointerPos((prev) => ({ ...prev, active: false }));
  };

  // Subtle ambient rotation when animated is true
  useEffect(() => {
    if (!animated) return;

    let angle = 0;
    const animate = () => {
      angle = (angle + 0.5) % 360;
      setAmbientAngle(angle);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animated]);

  // Construct gradient string
  const gradientString = gradientColors.length > 1
    ? gradientColors.join(', ')
    : `${glowColor}, rgba(0, 210, 255, 0.4), transparent`;

  return (
    <div
      ref={containerRef}
      className={`border-glow-wrapper ${animated ? 'border-glow-animated' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius,
        '--border-radius': borderRadius,
        '--glow-color': glowColor,
        '--glow-bg': backgroundColor,
        '--glow-intensity': glowIntensity,
        ...style
      }}
      {...props}
    >
      {/* Dynamic Edge Glow Border Canvas/Layer */}
      <div
        className="border-glow-halo"
        style={{
          borderRadius,
          opacity: pointerPos.active ? glowIntensity : (animated ? glowIntensity * 0.5 : 0),
          background: pointerPos.active
            ? `radial-gradient(
                ${glowRadius}px circle at ${pointerPos.x}px ${pointerPos.y}px,
                ${glowColor} 0%,
                transparent 70%
              )`
            : (animated
                ? `conic-gradient(from ${ambientAngle}deg at 50% 50%, ${gradientString}, ${gradientColors[0]})`
                : 'none')
        }}
        aria-hidden="true"
      />

      {/* Subtle Permanent Substrate Border */}
      <div
        className="border-glow-substrate"
        style={{ borderRadius }}
        aria-hidden="true"
      />

      {/* Inner Masked Surface */}
      <div
        className="border-glow-inner"
        style={{
          borderRadius: `calc(${borderRadius} - 1.5px)`,
          backgroundColor
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default BorderGlow;
