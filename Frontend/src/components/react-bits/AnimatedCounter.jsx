import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1.2, className = '' }) {
  const countRef = useRef(null);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;

  useEffect(() => {
    if (!countRef.current) return;

    const obj = { val: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: numericValue,
        duration,
        ease: 'power3.out',
        onUpdate: () => {
          if (countRef.current) {
            countRef.current.textContent = `${prefix}${Math.round(obj.val).toLocaleString()}${suffix}`;
          }
        },
      });
    });

    return () => ctx.revert();
  }, [numericValue, prefix, suffix, duration]);

  return (
    <span ref={countRef} className={`font-mono ${className}`}>
      {prefix}{numericValue.toLocaleString()}{suffix}
    </span>
  );
}
