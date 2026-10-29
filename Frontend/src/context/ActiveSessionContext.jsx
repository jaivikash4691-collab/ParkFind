import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { bookingsApi } from '../api/bookings';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ActiveSessionContext = createContext(null);

export function ActiveSessionProvider({ children }) {
  const { user, isCustomer } = useAuth();
  const { showToast } = useToast();

  const [activeSession, setActiveSession] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  // Track whether 15m and 5m alerts fired for current session to prevent duplicate alarms
  const alerted15mRef = useRef(false);
  const alerted5mRef = useRef(false);
  const lastSessionIdRef = useRef(null);

  const refreshActiveSession = useCallback(async () => {
    if (!isCustomer) {
      setActiveSession(null);
      setRemainingSeconds(0);
      return;
    }

    try {
      setLoading(true);
      const res = await bookingsApi.getActiveCar();
      if (res && res.hasActiveCar && res.data) {
        // Reset alert flags if this is a new booking session
        if (lastSessionIdRef.current !== res.data.bookingId) {
          alerted15mRef.current = false;
          alerted5mRef.current = false;
          lastSessionIdRef.current = res.data.bookingId;
        }
        setActiveSession(res.data);
        setRemainingSeconds(res.data.remainingSeconds || 0);
      } else {
        setActiveSession(null);
        setRemainingSeconds(0);
      }
    } catch (err) {
      setActiveSession(null);
      setRemainingSeconds(0);
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  // Check active session on login or role change
  useEffect(() => {
    refreshActiveSession();
  }, [refreshActiveSession, user]);

  // 1-second countdown interval
  useEffect(() => {
    if (!activeSession || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          refreshActiveSession();
          return 0;
        }

        const next = prev - 1;

        // Proactive 15-Minute Expiry Reminder (at <= 900 seconds)
        if (next <= 900 && next > 895 && !alerted15mRef.current) {
          alerted15mRef.current = true;
          triggerExpiryReminder(15, activeSession);
        }

        // Urgent 5-Minute Expiry Reminder (at <= 300 seconds)
        if (next <= 300 && next > 295 && !alerted5mRef.current) {
          alerted5mRef.current = true;
          triggerExpiryReminder(5, activeSession);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, remainingSeconds, refreshActiveSession]);

  /**
   * Safe notification trigger using Browser Notifications when granted, with in-app toast fallback
   */
  const triggerExpiryReminder = (minutesRemaining, session) => {
    const title = minutesRemaining <= 5 
      ? '🚨 Parking Session Expiring in 5 Minutes!' 
      : '⚠️ Parking Session Expiring Soon (15m)';
    const body = `Your reservation for Bay ${session?.slotNo || ''} at ${session?.locationName || 'the parking facility'} ends shortly. Extend now to prevent overstay penalties.`;

    // 1. Browser Notification (if supported and granted)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Browser notification error:', err);
      }
    }

    // 2. In-App Toast
    showToast(`${title}: ${body}`, minutesRemaining <= 5 ? 'danger' : 'warning', 6000);
  };

  /**
   * Request Desktop Browser Notification permission
   */
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Browser desktop notifications are not supported on this device.', 'warning');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        showToast('Desktop parking alerts enabled successfully!', 'success');
        return true;
      } else {
        setNotificationsEnabled(false);
        showToast('Notification permission was dismissed or blocked. In-app alerts will remain active.', 'info');
        return false;
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  };

  /**
   * Extend active parking session by N hours
   */
  const quickExtend = async (hours = 1) => {
    if (!activeSession) return;
    try {
      await bookingsApi.extend(activeSession.bookingId, hours);
      showToast(`Session successfully extended by ${hours} hour(s)!`, 'success');
      alerted15mRef.current = false;
      alerted5mRef.current = false;
      await refreshActiveSession();
    } catch (err) {
      showToast(`Failed to extend session: ${err.message}`, 'danger');
    }
  };

  /**
   * Cancel active booking
   */
  const cancelActiveBooking = async (reason = 'Cancelled by user') => {
    if (!activeSession) return;
    try {
      await bookingsApi.cancel(activeSession.bookingId, reason);
      showToast('Booking cancelled successfully.', 'info');
      await refreshActiveSession();
    } catch (err) {
      showToast(`Cancellation error: ${err.message}`, 'danger');
    }
  };

  // Format remaining seconds into HH:MM:SS
  const formatRemainingTime = () => {
    const hrs = Math.floor(remainingSeconds / 3600);
    const mins = Math.floor((remainingSeconds % 3600) / 60);
    const secs = remainingSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <ActiveSessionContext.Provider
      value={{
        activeSession,
        remainingSeconds,
        formattedRemainingTime: formatRemainingTime(),
        loading,
        refreshActiveSession,
        quickExtend,
        cancelActiveBooking,
        notificationsEnabled,
        requestNotificationPermission,
      }}
    >
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error('useActiveSession must be used within an ActiveSessionProvider');
  }
  return context;
}
