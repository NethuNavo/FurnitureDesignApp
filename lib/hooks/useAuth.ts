/**
 * useAuth Hook
 * Custom React hook for handling authentication
 * 
 * Usage:
 * const { user, token, login, logout, isLoading } = useAuth()
 */

"use client";

import { useEffect, useState } from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  saveToken,
  getToken,
  clearToken,
} from "@/lib/api";

interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const storedToken = getToken();
      if (storedToken) {
        const result = await getCurrentUser(storedToken);
        if (result.data) {
          setToken(storedToken);
          setUser(result.data.user);
        } else {
          // Token is invalid, clear it
          clearToken();
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await apiLogin(email, password);
      if (result.error) {
        console.error("Login failed:", result.error);
        return false;
      }

      const { token: newToken, user: newUser } = result.data!;
      saveToken(newToken);
      setToken(newToken);
      setUser(newUser);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token) {
        await apiLogout(token);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearToken();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    checkAuth,
  };
}

/**
 * Example usage in a component:
 * 
 * import { useAuth } from '@/lib/hooks/useAuth'
 * 
 * export default function Dashboard() {
 *   const { user, isAuthenticated, logout } = useAuth()
 *   
 *   if (!isAuthenticated) {
 *     return <div>Please log in</div>
 *   }
 *   
 *   return (
 *     <div>
 *       <h1>Welcome, {user?.name}</h1>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   )
 * }
 */
