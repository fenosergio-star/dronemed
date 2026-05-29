import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as authLogin, register as authRegister, logout as authLogout, getStoredUser, getToken } from '../services/auth';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    (async () => {
      const [token, user] = await Promise.all([getToken(), getStoredUser()]);
      if (token && user) {
        setState({ user, token, loading: false });
      } else {
        setState({ user: null, token: null, loading: false });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authLogin(email, password);
    setState({ user, token, loading: false });
  }, []);

  const register = useCallback(async (data: any) => {
    const { token, user } = await authRegister(data);
    setState({ user, token, loading: false });
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setState({ user: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
