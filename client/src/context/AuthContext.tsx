import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user on mount
  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        credentials: 'include', // Send cookies
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setError(null);
      } else {
        setUser(null);
        setError(null); // Not an error, just not logged in
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Start Google OAuth flow
  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  // Logout: call server + clear local state
  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        credentials: 'include',
        method: 'GET',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}