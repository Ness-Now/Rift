"use client";

import type { AuthTokenResponse, AuthUser } from "@rift/shared-types";
import { createContext, useContext, useEffect, useState } from "react";

import {
  getCurrentUser,
  login as loginRequest,
  signup as signupRequest,
  type AuthCredentials
} from "@/lib/api";

const AUTH_STORAGE_KEY = "rift.auth.token";

type AuthContextValue = {
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => void;
  signup: (credentials: AuthCredentials) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persistToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token === null) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
}

function readToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function applySession(session: AuthTokenResponse) {
    persistToken(session.access_token);
    setToken(session.access_token);
    setUser(session.user);
  }

  function clearSession() {
    persistToken(null);
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    const storedToken = readToken();
    if (storedToken === null) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    void getCurrentUser(storedToken)
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  async function login(credentials: AuthCredentials) {
    const session = await loginRequest(credentials);
    applySession(session);
  }

  async function signup(credentials: AuthCredentials) {
    const session = await signupRequest(credentials);
    applySession(session);
  }

  function logout() {
    clearSession();
  }

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        token,
        user,
        login,
        logout,
        signup
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}