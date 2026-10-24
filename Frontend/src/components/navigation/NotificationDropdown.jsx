import React, { useState, useEffect, useRef } from 'react';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Clock } from 'lucide-react';

export function NotificationDropdown() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const data = await notificationsApi.getAll();
      setNotifications(data || []);
    } catch (e) {
      // Non blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read && !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, isRead: true })));
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      showToast('Failed to mark notifications', 'danger');
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => {
          if (!isAuthenticated) {
            showToast('Sign in to view real-time parking alerts', 'info');
            return;
          }
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="btn btn-secondary btn-icon"
        style={{ position: 'relative', width: 38, height: 38 }}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              border: '2px solid var(--bg-surface)',
            }}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: 320,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  Alerts & Updates
                </span>
                {unreadCount > 0 && (
                  <span className="badge badge-primary" style={{ padding: '1px 6px', fontSize: '0.7rem' }}>
                    {unreadCount}
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                  }}
                >
                  <CheckCheck size={14} /> Mark Read
                </button>
              )}
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                  Loading alerts...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  No recent parking alerts
                </div>
              ) : (
                notifications.map((notif) => {
                  const isRead = notif.is_read || notif.isRead;
                  return (
                    <div
                      key={notif.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isRead ? 'transparent' : 'var(--accent-surface)',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                        {notif.title}
                      </strong>
                      <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                        {notif.message}
                      </p>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
                        <Clock size={11} />
                        {new Date(notif.created_at || notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
