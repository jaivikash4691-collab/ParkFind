import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import './BubbleMenu.css';

/**
 * BubbleMenu Component
 * React Bits GSAP-powered expanding bubble pill navigation
 *
 * Props:
 * - logo: ReactNode | string (Custom logo/badge element)
 * - items: Array of { label, href, icon: ReactNode, onClick, badge }
 * - menuAriaLabel: string (Accessible label, default: 'Navigation menu')
 * - position: 'fixed-top' | 'fixed-bottom' | 'inline' | 'top-right'
 * - bgColor: string (Background color token/value)
 * - contentColor: string (Text/icon color)
 * - accentColor: string (Accent color for active/highlight)
 * - ease: string (GSAP easing, default: 'elastic.out(1, 0.75)')
 * - animationDuration: number (default: 0.5)
 * - staggerDelay: number (default: 0.04)
 * - desktopItemRotation: boolean (enable controlled rotation on desktop, default: true)
 * - onOpenChange: function(isOpen)
 */
export function BubbleMenu({
  logo,
  items = [],
  menuAriaLabel = 'Parkit Navigation Menu',
  position = 'inline',
  bgColor = 'var(--bg-surface-elevated, #161b26)',
  contentColor = 'var(--text-primary, #ffffff)',
  accentColor = 'var(--accent-primary, #00d2ff)',
  ease = 'elastic.out(1, 0.75)',
  animationDuration = 0.55,
  staggerDelay = 0.045,
  desktopItemRotation = true,
  onOpenChange,
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const itemsContainerRef = useRef(null);
  const triggerRef = useRef(null);
  const timelineRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Toggle open/close
  const toggleMenu = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onOpenChange) onOpenChange(nextState);
  };

  const closeMenu = () => {
    if (isOpen) {
      setIsOpen(false);
      if (onOpenChange) onOpenChange(false);
    }
  };

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // GSAP animation
  useEffect(() => {
    const itemsEl = itemsContainerRef.current;
    if (!itemsEl) return;

    const bubbles = itemsEl.querySelectorAll('.bubble-menu-item');
    if (!bubbles.length) return;

    // Kill any active timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline();
    timelineRef.current = tl;

    if (isOpen) {
      // Open Animation
      gsap.set(itemsEl, { display: 'flex', pointerEvents: 'auto' });
      
      bubbles.forEach((bubble, idx) => {
        // Desktop controlled subtle rotation (-4deg to +4deg)
        const rotationAngle = (!isMobile && desktopItemRotation)
          ? ((idx % 2 === 0 ? 1 : -1) * (2.5 + (idx % 3) * 1.2))
          : 0;

        gsap.set(bubble, {
          opacity: 0,
          scale: 0.2,
          y: isMobile ? 12 : 0,
          x: isMobile ? 0 : 15,
          rotation: rotationAngle
        });
      });

      tl.to(bubbles, {
        opacity: 1,
        scale: 1,
        y: 0,
        x: 0,
        duration: animationDuration,
        stagger: staggerDelay,
        ease: ease,
        clearProps: 'transform' // clean transform except rotation for hover
      });
    } else {
      // Close Animation
      tl.to(bubbles, {
        opacity: 0,
        scale: 0.3,
        duration: 0.22,
        stagger: {
          each: 0.02,
          from: 'end'
        },
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(itemsEl, { display: 'none', pointerEvents: 'none' });
        }
      });
    }

    return () => {
      if (timelineRef.current) timelineRef.current.kill();
    };
  }, [isOpen, isMobile, desktopItemRotation, animationDuration, staggerDelay, ease]);

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      navigate(item.href);
    }
    closeMenu();
  };

  return (
    <div
      ref={containerRef}
      className={`bubble-menu-root bubble-menu-${position} ${isOpen ? 'is-open' : 'is-closed'} ${className}`}
      style={{
        '--bubble-bg': bgColor,
        '--bubble-text': contentColor,
        '--bubble-accent': accentColor,
        ...style
      }}
      aria-label={menuAriaLabel}
    >
      {/* Trigger Bubble Button */}
      <button
        ref={triggerRef}
        type="button"
        className="bubble-menu-trigger"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {logo ? (
          <div className="bubble-menu-logo-slot">
            {typeof logo === 'string' ? <img src={logo} alt="Parkit" className="bubble-logo-img" /> : logo}
          </div>
        ) : (
          <div className="bubble-menu-default-logo">
            <span className="bubble-logo-mark">P</span>
          </div>
        )}

        <div className={`bubble-hamburger ${isOpen ? 'active' : ''}`}>
          <span className="bar bar-1"></span>
          <span className="bar bar-2"></span>
          <span className="bar bar-3"></span>
        </div>
      </button>

      {/* Expanding Items Bubble Container */}
      <div
        ref={itemsContainerRef}
        className="bubble-menu-tray"
        role="menu"
        style={{ display: 'none' }}
      >
        {items.map((item, index) => {
          const isActive = item.href ? location.pathname === item.href : false;
          return (
            <button
              key={item.label || index}
              type="button"
              role="menuitem"
              className={`bubble-menu-item ${isActive ? 'item-active' : ''}`}
              onClick={() => handleItemClick(item)}
              title={item.label}
            >
              {item.icon && <span className="bubble-item-icon">{item.icon}</span>}
              <span className="bubble-item-label">{item.label}</span>
              {item.badge && <span className="bubble-item-badge">{item.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BubbleMenu;
