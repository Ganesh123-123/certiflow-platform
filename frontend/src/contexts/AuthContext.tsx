import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  switchUser: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const DEMO_USERS = [
  { name: 'Anika (Training Centre)', email: 'anika@certiflow.gov.in', role: 'TRAINING_CENTRE' },
  { name: 'Dev (District - Pune)', email: 'dev@certiflow.gov.in', role: 'DISTRICT_OFFICER' },
  { name: 'Meera (District - Pune)', email: 'meera@certiflow.gov.in', role: 'DISTRICT_OFFICER' },
  { name: 'Kabir (District - Mumbai)', email: 'kabir@certiflow.gov.in', role: 'DISTRICT_OFFICER' },
  { name: 'Neha (Quality Team)', email: 'neha@certiflow.gov.in', role: 'QUALITY_TEAM' },
  { name: 'Farah (State Officer)', email: 'farah@certiflow.gov.in', role: 'STATE_OFFICER' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const localToken = localStorage.getItem('certiflow_token');
    const localUser = localStorage.getItem('certiflow_user');
    const sessionToken = sessionStorage.getItem('certiflow_token');
    const sessionUser = sessionStorage.getItem('certiflow_user');
    const storedToken = localToken && localUser ? localToken : sessionToken;
    const storedUser = localToken && localUser ? localUser : sessionUser;
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      connectSocket(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe = true) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    storage.setItem('certiflow_token', newToken);
    storage.setItem('certiflow_user', JSON.stringify(newUser));
    otherStorage.removeItem('certiflow_token');
    otherStorage.removeItem('certiflow_user');
    connectSocket(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('certiflow_token');
    localStorage.removeItem('certiflow_user');
    sessionStorage.removeItem('certiflow_token');
    sessionStorage.removeItem('certiflow_user');
    disconnectSocket();
  };

  const switchUser = async (email: string) => {
    await login(email, 'Demo@1234');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
