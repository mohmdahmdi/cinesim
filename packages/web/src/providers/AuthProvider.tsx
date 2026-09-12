"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import localStorageManager from "@/utils/localStorageManager";
import { decodeJwtPayload } from "@/utils/jwt";

type AuthUser = { username: string; role: "user" | "admin" };

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  setSession: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Reading localStorage must happen post-hydration (server has no access to it),
    // so this one-time sync can't be done via a lazy useState initializer instead.
    const token = localStorageManager.get("authToken");
    if (token) {
      const payload = decodeJwtPayload(token);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (payload) setUser({ username: payload.username, role: payload.role });
    }
    setIsReady(true);
  }, []);

  const setSession = (token: string) => {
    localStorageManager.set("authToken", token);
    const payload = decodeJwtPayload(token);
    if (payload) setUser({ username: payload.username, role: payload.role });
  };

  const logout = () => {
    localStorageManager.remove("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isReady, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
