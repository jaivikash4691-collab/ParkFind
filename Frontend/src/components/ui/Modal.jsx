import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, subtitle, children, footer, maxWidth = '540px' }) {
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="modal-dialog"
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {(title || onClose) && (
              <div className="modal-header-bar">
                <div>
                  {title && <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>}
                  {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="btn btn-ghost btn-icon"
                    aria-label="Close modal"
                    style={{ width: 32, height: 32 }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="modal-body-content">{children}</div>

            {footer && <div className="modal-footer-bar">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
