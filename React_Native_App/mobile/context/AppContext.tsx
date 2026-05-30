import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserRole = "rider" | "driver";

export interface RideHistoryItem {
  id: string;
  role: UserRole;
  status: "completed" | "cancelled";
  pickup: string;
  dropoff: string;
  fare?: number;
  distance?: number;
  duration?: number;
  date: string;
  driverName?: string;
  riderName?: string;
}

interface AppContextType {
  role: UserRole | null;
  setRole: (role: UserRole) => Promise<void>;
  userId: string;
  userName: string;
  history: RideHistoryItem[];
  addToHistory: (item: RideHistoryItem) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function makeName(): string {
  const adjectives = ["Swift", "Bright", "Cool", "Bold", "Calm"];
  const nouns = ["Rider", "Driver", "Star", "Wave", "Pulse"];
  return adjectives[Math.floor(Math.random() * adjectives.length)] + nouns[Math.floor(Math.random() * nouns.length)];
}

const STATIC_USER_ID = "uid_" + makeId();
const STATIC_USER_NAME = makeName();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [history, setHistory] = useState<RideHistoryItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [r, h] = await Promise.all([
          AsyncStorage.getItem("tz_role"),
          AsyncStorage.getItem("tz_history"),
        ]);
        if (r) setRoleState(r as UserRole);
        if (h) setHistory(JSON.parse(h));
      } catch {}
    })();
  }, []);

  const setRole = async (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      await AsyncStorage.setItem("tz_role", newRole);
    } catch {}
  };

  const addToHistory = async (item: RideHistoryItem) => {
    const updated = [item, ...history].slice(0, 50);
    setHistory(updated);
    try {
      await AsyncStorage.setItem("tz_history", JSON.stringify(updated));
    } catch {}
  };

  const clearHistory = async () => {
    setHistory([]);
    try {
      await AsyncStorage.removeItem("tz_history");
    } catch {}
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        userId: STATIC_USER_ID,
        userName: STATIC_USER_NAME,
        history,
        addToHistory,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
