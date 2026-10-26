import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State for global access (Sign In / Register)
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    mode: 'login', // 'login' | 'register'
    role: 'customer',
    onSuccess: null,
  });

  const openAuthModal = useCallback((mode = 'login', role = 'customer', onSuccess = null) => {
    setAuthModal({
      isOpen: true,
      mode,
      role,
      onSuccess,
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal((prev) => ({ ...prev, isOpen: false, onSuccess: null }));
  }, []);

  // Restore authenticated session from sessionStorage (browser-session-only)
  // Clean up any legacy persistent localStorage to prevent session leakage across browser restarts
  useEffect(() => {
    async function restoreSession() {
      try {
        // Clear old persistent localStorage keys (requirement: session-based only)
        try {
          localStorage.removeItem('parkit_user');
          localStorage.removeItem('parkfind_user');
        } catch (e) {
          // ignore storage access error
        }

        const savedSession = sessionStorage.getItem('parkit_user');

        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.token) {
            // Verify session with backend to ensure token is still valid
            try {
              const profile = await authApi.getMe();
              if (profile) {
                const refreshed = {
                  token: parsed.token,
                  ...profile,
                };
                setUser(refreshed);
                sessionStorage.setItem('parkit_user', JSON.stringify(refreshed));
              } else {
                setUser(parsed);
              }
            } catch (err) {
              // Token invalid or expired: clear session
              console.warn('Session verification failed, logging out:', err.message);
              sessionStorage.removeItem('parkit_user');
              setUser(null);
            }
          } else {
            sessionStorage.removeItem('parkit_user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.warn('Failed to parse saved session credentials');
        sessionStorage.removeItem('parkit_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    const authData = {
      token: data.token,
      ...data.user,
    };
    setUser(authData);
    // Store exclusively in sessionStorage for browser-session lifecycle
    sessionStorage.setItem('parkit_user', JSON.stringify(authData));
    return authData;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    const authData = {
      token: data.token,
      ...data.user,
    };
    setUser(authData);
    // Store exclusively in sessionStorage for browser-session lifecycle
    sessionStorage.setItem('parkit_user', JSON.stringify(authData));
    return authData;
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem('parkit_user');
      localStorage.removeItem('parkit_user');
      localStorage.removeItem('parkfind_user');
    } catch (e) {
      // ignore storage access error
    }
  };

  const isOwner = user?.role === 'owner';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isOwner,
        isCustomer,
        login,
        register,
        logout,
        authModal,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
