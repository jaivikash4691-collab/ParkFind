import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session from localStorage
  useEffect(() => {
    try {
      // Support migration from legacy storage key if present
      const legacyUser = localStorage.getItem('parkfind_user');
      const savedUser = localStorage.getItem('parkit_user') || legacyUser;

      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Persist under new branding
        localStorage.setItem('parkit_user', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Failed to parse saved user credentials');
      localStorage.removeItem('parkit_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    const authData = {
      token: data.token,
      ...data.user,
    };
    setUser(authData);
    localStorage.setItem('parkit_user', JSON.stringify(authData));
    return authData;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    const authData = {
      token: data.token,
      ...data.user,
    };
    setUser(authData);
    localStorage.setItem('parkit_user', JSON.stringify(authData));
    return authData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('parkit_user');
    localStorage.removeItem('parkfind_user');
  };

  const isOwner = user?.role === 'owner';
  const isCustomer = user?.role === 'customer' || !user;

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
