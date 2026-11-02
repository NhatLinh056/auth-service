import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types/auth.types';
import { authService } from '../services/auth.service';
import { useToast } from './ToastContext';
import { useLanguage } from './LanguageContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Restore profile only from the authenticated backend, never from URL token/profile fields.
  useEffect(() => {
    if (!token) return;
    let active = true;
    authService.getMe().then(profile => {
      if (!active) return;
      setUser(profile);
      localStorage.setItem('auth_user', JSON.stringify(profile));
    }).catch(error => {
      if (active && [401, 403].includes(error.status)) {
        setToken(null); setUser(null);
        localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user');
      }
    });
    return () => { active = false; };
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await authService.login({ email, password });
      setToken(res.accessToken);
      setUser(res.user);
      localStorage.setItem('auth_token', res.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
      showToast(`${t('toasts.signed_in')} ${res.user.email}`);
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
      throw err;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      await authService.register({ email, password, name });
      showToast(t('toasts.reg_success'));
      await login(email, password);
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    showToast(t('toasts.signed_out'));
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const profile = await authService.getMe();
      setUser(profile);
      localStorage.setItem('auth_user', JSON.stringify(profile));
    } catch {
      // Token might be expired or invalid
    }
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
