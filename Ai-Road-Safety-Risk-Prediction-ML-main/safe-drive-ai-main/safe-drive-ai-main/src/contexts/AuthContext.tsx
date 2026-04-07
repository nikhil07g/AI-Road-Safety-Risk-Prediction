import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CredentialResponse } from "@react-oauth/google";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  googleSignIn: (credentialResponse: CredentialResponse) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const USERS_KEY = "wrp_users";
const SESSION_KEY = "wrp_session";

// Decode JWT token manually (no external library needed)
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        setUser(JSON.parse(session));
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const getUsers = (): Array<User & { password: string }> => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const users = getUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    const users = getUsers();
    if (users.find((u) => u.email === email)) return false;
    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      role: email.includes("admin") ? "admin" : "user",
    };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const { password: _, ...userData } = newUser;
    setUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    return true;
  };

  const googleSignIn = async (credentialResponse: CredentialResponse): Promise<boolean> => {
    try {
      if (!credentialResponse.credential) {
        return false;
      }

      // Decode the JWT credential to get user info
      const decoded = parseJwt(credentialResponse.credential);

      if (!decoded) {
        return false;
      }

      const googleUser: User = {
        id: decoded.sub,
        name: decoded.name || "Google User",
        email: decoded.email,
        role: "user",
        picture: decoded.picture,
      };

      setUser(googleUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(googleUser));
      return true;
    } catch (error) {
      console.error('Google sign-in error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, googleSignIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
