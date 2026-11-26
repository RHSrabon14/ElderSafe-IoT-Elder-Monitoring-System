import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  relationship_to_elderly: string | null;
  profile_picture: string | null; // <-- ADD THIS
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user", error);
      // If token is invalid, log out
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser(token);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) await fetchUser(token);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}