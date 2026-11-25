import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { User } from '../types/auth.types';
import { authService } from '../services/auth.service';
import { useToast } from './ToastContext';
import { useLanguage } from './LanguageContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  initializing: boolean;
  loggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const waitMinFeedback = async (startedAt: number, minMs: number) => {
  const remaining = minMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
  }
};

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
  // Never grant privileged UI (isAdmin) from unverified localStorage before getMe() confirms DB role
  const [profileVerified, setProfileVerified] = useState(false);
  const [initializing, setInitializing] = useState<boolean>(() => Boolean(localStorage.getItem('auth_token')));
  const [loggingOut, setLoggingOut] = useState(false);
  const verifiedTokenRef = useRef<string | null>(null);
  const logoutTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current !== null) {
        window.clearTimeout(logoutTimerRef.current);
      }
    };
  }, []);

  // Restore profile only from the authenticated backend, never from URL token/profile fields.
  useEffect(() => {
    if (!token) {
      verifiedTokenRef.current = null;
      setProfileVerified(false);
      setInitializing(false);
      return;
    }
    if (verifiedTokenRef.current === token) {
      setInitializing(false);
      return;
    }
    let active = true;
    const startedAt = Date.now();
    (async () => {
      try {
        const profile = await authService.getMe();
        await waitMinFeedback(startedAt, 320);
        if (!active) return;
        verifiedTokenRef.current = token;
        setUser(profile);
        setProfileVerified(true);
        localStorage.setItem('auth_user', JSON.stringify(profile));
      } catch (error: any) {
        await waitMinFeedback(startedAt, 320);
        if (!active) return;
        if ([401, 403].includes(error?.status)) {
          verifiedTokenRef.current = null;
          setToken(null);
          setUser(null);
          setProfileVerified(false);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const login = async (email: string, password: string) => {
    const startedAt = Date.now();
    try {
      const res = await authService.login({ email, password });
      await waitMinFeedback(startedAt, 450);
      localStorage.setItem('auth_token', res.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
      verifiedTokenRef.current = res.accessToken;
      setProfileVerified(true);
      setUser(res.user);
      setToken(res.accessToken);
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
    if (loggingOut) return;
    const clearSession = () => {
      verifiedTokenRef.current = null;
      setToken(null);
      setUser(null);
      setProfileVerified(false);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setLoggingOut(false);
      showToast(t('toasts.signed_out'));
    };
    setLoggingOut(true);
    logoutTimerRef.current = window.setTimeout(() => {
      logoutTimerRef.current = null;
      clearSession();
    }, 400);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const profile = await authService.getMe();
      verifiedTokenRef.current = token;
      setUser(profile);
      setProfileVerified(true);
      localStorage.setItem('auth_user', JSON.stringify(profile));
    } catch {
      // Token might be expired or invalid
    }
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = Boolean(profileVerified && user?.role === 'ADMIN');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        initializing,
        loggingOut,
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
