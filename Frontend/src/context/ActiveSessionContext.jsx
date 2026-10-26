import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const refreshActiveSession = useCallback(async () => {
    if (!isCustomer) {
      setActiveSession(null);
      return;
    }

    try {
      setLoading(true);
      const res = await bookingsApi.getActiveCar();
      if (res && res.hasActiveCar && res.data) {
        setActiveSession(res.data);
        setRemainingSeconds(res.data.remainingSeconds || 0);
      } else {
        setActiveSession(null);
        setRemainingSeconds(0);
      }
    } catch (err) {
      // Non-blocking background check
      setActiveSession(null);
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
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, remainingSeconds, refreshActiveSession]);

  const quickExtend = async (hours = 1) => {
    if (!activeSession) return;
    try {
      await bookingsApi.extend(activeSession.bookingId, hours);
      showToast(`Session successfully extended by ${hours} hour(s)!`, 'success');
      await refreshActiveSession();
    } catch (err) {
      showToast(`Failed to extend session: ${err.message}`, 'danger');
    }
  };

  const locateCar = async (term) => {
    try {
      setLoading(true);
      const res = await bookingsApi.getActiveCar({ plate: term, ref: term });
      if (res && res.hasActiveCar && res.data) {
        setActiveSession(res.data);
        setRemainingSeconds(res.data.remainingSeconds || 0);
        showToast(`Located active parking session for ${res.data.vehicleNumber}`, 'success');
        return res.data;
      } else {
        showToast('No active parking session found matching this plate number or reference.', 'warning');
        return null;
      }
    } catch (err) {
      showToast(err.message, 'danger');
      return null;
    } finally {
      setLoading(false);
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
        locateCar,
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
