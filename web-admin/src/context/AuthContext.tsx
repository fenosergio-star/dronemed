import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.defaults.headers.Authorization = `Bearer ${token}`;
    api.get('/auth/me').then(r => {
      setUser(r.data.data);
    }).catch(() => {
      localStorage.removeItem('token');
      setToken(null);
    }).finally(() => setLoading(false));
  }, [token]);

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    const { token: t, ...u } = r.data.data;
    localStorage.setItem('token', t);
    api.defaults.headers.Authorization = `Bearer ${t}`;
    setToken(t);
    setUser(u);
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    const r = await api.post('/auth/register', { name, email, password, role });
    const { token: t, ...u } = r.data.data;
    localStorage.setItem('token', t);
    api.defaults.headers.Authorization = `Bearer ${t}`;
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.Authorization;
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
