import React, { useRef, useState, useEffect } from 'react';
import './GlareHover.css';

/**
 * GlareHover Component
 * React Bits Pointer-Aware Tactile Glare / Sheen Card
 *
 * Props:
 * - children: ReactNode
 * - width: string | number
 * - height: string | number
 * - background: string
 * - borderRadius: string | number (default: '16px')
 * - borderColor: string
 * - glareColor: string (default: 'rgba(255, 255, 255, 0.28)')
 * - glareOpacity: number (default: 0.35)
 * - glareAngle: number (default: -45)
 * - glareSize: string | number (default: '130%')
 * - transitionDuration: number (in ms, default: 350)
 * - playOnce: boolean (if true, plays an intro sheen sweep and stops)
 * - className: string
 * - style: object
 */
export function GlareHover({
  children,
  width,
  height,
  background,
  borderRadius = '16px',
  borderColor,
  glareColor = 'rgba(255, 255, 255, 0.25)',
  glareOpacity = 0.35,
  glareAngle = -45,
  glareSize = '130%',
  transitionDuration = 350,
  playOnce = false,
  className = '',
  style = {},
  ...props
}) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ x: 50, y: 50 });
  const [playedOnce, setPlayedOnce] = useState(false);

  // Play once intro sweep if enabled
  useEffect(() => {
    if (playOnce && !playedOnce) {
      setIsHovered(true);
      setCoords({ x: 0, y: 0 });
      const timer = setTimeout(() => {
        setCoords({ x: 100, y: 100 });
        setTimeout(() => {
          setIsHovered(false);
          setPlayedOnce(true);
        }, transitionDuration);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [playOnce, playedOnce, transitionDuration]);

  const handleMouseMove = (e) => {
    if (playOnce && playedOnce) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCoords({ x, y });
  };

  const handleMouseEnter = () => {
    if (!playOnce || !playedOnce) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!playOnce) {
      setIsHovered(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`glare-hover-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: width || 'auto',
        height: height || 'auto',
        borderRadius,
        background: background || undefined,
        borderColor: borderColor || undefined,
        transition: `border-color ${transitionDuration}ms ease`,
        ...style
      }}
      {...props}
    >
      {/* Glare Sheen Overlay Layer */}
      <div
        className="glare-hover-layer"
        style={{
          borderRadius,
          opacity: isHovered ? glareOpacity : 0,
          transition: `opacity ${transitionDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          background: `radial-gradient(
            circle at ${coords.x}% ${coords.y}%,
            ${glareColor} 0%,
            transparent ${typeof glareSize === 'number' ? `${glareSize}px` : glareSize}
          )`
        }}
        aria-hidden="true"
      />

      {/* Surface Content */}
      <div className="glare-hover-content">
        {children}
      </div>
    </div>
  );
}

export default GlareHover;
