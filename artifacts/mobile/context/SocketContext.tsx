import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { useApp } from "./AppContext";
import type { RideHistoryItem } from "./AppContext";

export type RideStatus =
  | "idle"
  | "requesting"
  | "matching"
  | "driver_assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "available" | "busy" | "offline";
  rating?: number;
}

export interface RideInfo {
  id: string;
  riderId: string;
  riderName?: string;
  driverId?: string;
  driverName?: string;
  status: RideStatus;
  pickup: GeoLocation;
  dropoff: GeoLocation;
  driverLat?: number;
  driverLng?: number;
  fare?: number;
  distance?: number;
  estimatedFare?: number;
  duration?: number;
}

interface SocketContextType {
  connected: boolean;
  nearbyDrivers: DriverInfo[];
  currentRide: RideInfo | null;
  rideStatus: RideStatus;
  requestRide: (pickup: GeoLocation, dropoff: GeoLocation) => void;
  cancelRide: () => void;
  driverStatus: "available" | "busy" | "offline";
  setDriverOnline: (online: boolean) => void;
  incomingRequest: RideInfo | null;
  activeRide: RideInfo | null;
  acceptRide: (rideId: string) => void;
  rejectRide: (rideId: string) => void;
  startRide: (rideId: string) => void;
  completeRide: (rideId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

function getWsUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `wss://${domain}/api/ws`;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/ws`;
  }
  return "ws://localhost:80/api/ws";
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { userId, userName, role, addToHistory } = useApp();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchRef = useRef<number | null>(null);

  const [connected, setConnected] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<DriverInfo[]>([]);
  const [currentRide, setCurrentRide] = useState<RideInfo | null>(null);
  const [rideStatus, setRideStatus] = useState<RideStatus>("idle");
  const [driverStatus, setDriverStatus] = useState<"available" | "busy" | "offline">("offline");
  const [incomingRequest, setIncomingRequest] = useState<RideInfo | null>(null);
  const [activeRide, setActiveRide] = useState<RideInfo | null>(null);

  const roleRef = useRef(role);
  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);
  const addToHistoryRef = useRef(addToHistory);
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { addToHistoryRef.current = addToHistory; }, [addToHistory]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleMsg = useCallback((raw: string) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw); } catch { return; }

    const t = msg.type as string;

    if (t === "drivers:nearby") {
      setNearbyDrivers((msg.drivers as DriverInfo[]) || []);
      return;
    }

    if (t === "ride:status") {
      const st = msg.status as string;
      if (st === "matching") {
        setRideStatus("matching");
        setCurrentRide(prev =>
          prev
            ? { ...prev, id: msg.rideId as string, estimatedFare: msg.estimatedFare as number }
            : null,
        );
      } else if (st === "driver_assigned") {
        setRideStatus("driver_assigned");
        setCurrentRide(prev =>
          prev ? { ...prev, driverId: msg.driverId as string, driverName: msg.driverName as string, driverLat: msg.driverLat as number, driverLng: msg.driverLng as number, status: "driver_assigned" } : null,
        );
      } else if (st === "accepted") {
        setRideStatus("accepted");
        setCurrentRide(prev => prev ? { ...prev, status: "accepted" } : null);
      } else if (st === "in_progress") {
        setRideStatus("in_progress");
        setCurrentRide(prev => prev ? { ...prev, status: "in_progress" } : null);
      } else if (st === "no_drivers") {
        setRideStatus("idle");
        setCurrentRide(null);
      }
      return;
    }

    if (t === "ride:completed") {
      const ride = msg.ride as Record<string, unknown>;
      if (roleRef.current === "rider") {
        setRideStatus("completed");
        setCurrentRide(prev =>
          prev ? { ...prev, status: "completed", fare: ride.fare as number, distance: ride.distance as number, duration: ride.duration as number } : null,
        );
        const histItem: RideHistoryItem = {
          id: ride.id as string,
          role: "rider",
          status: "completed",
          pickup: (ride.pickup as GeoLocation).address || `${(ride.pickup as GeoLocation).lat.toFixed(4)}, ${(ride.pickup as GeoLocation).lng.toFixed(4)}`,
          dropoff: (ride.dropoff as GeoLocation).address || `${(ride.dropoff as GeoLocation).lat.toFixed(4)}, ${(ride.dropoff as GeoLocation).lng.toFixed(4)}`,
          fare: ride.fare as number,
          distance: ride.distance as number,
          duration: ride.duration as number,
          date: new Date().toISOString(),
          driverName: ride.driverName as string,
        };
        addToHistoryRef.current(histItem);
        setTimeout(() => {
          setRideStatus("idle");
          setCurrentRide(null);
        }, 8000);
      } else {
        setActiveRide(null);
        setDriverStatus("available");
        const histItem: RideHistoryItem = {
          id: ride.id as string,
          role: "driver",
          status: "completed",
          pickup: (ride.pickup as GeoLocation).address || `${(ride.pickup as GeoLocation).lat.toFixed(4)}, ${(ride.pickup as GeoLocation).lng.toFixed(4)}`,
          dropoff: (ride.dropoff as GeoLocation).address || `${(ride.dropoff as GeoLocation).lat.toFixed(4)}, ${(ride.dropoff as GeoLocation).lng.toFixed(4)}`,
          fare: ride.fare as number,
          distance: ride.distance as number,
          duration: ride.duration as number,
          date: new Date().toISOString(),
          riderName: ride.riderName as string,
        };
        addToHistoryRef.current(histItem);
      }
      return;
    }

    if (t === "ride:cancelled") {
      if (roleRef.current === "rider") {
        setRideStatus("idle");
        setCurrentRide(null);
      } else {
        setActiveRide(null);
        setDriverStatus("available");
        setIncomingRequest(null);
      }
      return;
    }

    if (t === "driver:location_update") {
      setCurrentRide(prev =>
        prev ? { ...prev, driverLat: msg.lat as number, driverLng: msg.lng as number } : null,
      );
      return;
    }

    if (t === "ride:request") {
      setIncomingRequest(msg.ride as RideInfo);
      return;
    }

    if (t === "ride:accept_confirmed") {
      setIncomingRequest(prev => {
        if (prev) {
          setActiveRide({ ...prev, id: msg.rideId as string, status: "accepted", driverId: userIdRef.current });
        }
        return null;
      });
      setDriverStatus("busy");
      return;
    }
  }, []);

  useEffect(() => {
    if (!userId || !role) return;

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      try {
        const ws = new WebSocket(getWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          if (destroyed) { ws.close(); return; }
          setConnected(true);
          ws.send(JSON.stringify({ type: "register", role, userId, userName }));
        };

        ws.onmessage = (e: MessageEvent) => {
          handleMsg(e.data as string);
        };

        ws.onclose = () => {
          setConnected(false);
          wsRef.current = null;
          if (!destroyed) reconnectRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => ws.close();
      } catch {}
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId, role, userName, handleMsg]);

  const startLocationTracking = useCallback(async () => {
    if (Platform.OS !== "web") {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      locationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          send({ type: "driver:location", driverId: userIdRef.current, lat: loc.coords.latitude, lng: loc.coords.longitude });
        },
      );
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      webWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          send({ type: "driver:location", driverId: userIdRef.current, lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        null,
        { maximumAge: 0, enableHighAccuracy: true },
      );
    }
  }, [send]);

  const stopLocationTracking = useCallback(() => {
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
    if (webWatchRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation?.clearWatch(webWatchRef.current);
      webWatchRef.current = null;
    }
  }, []);

  const setDriverOnline = useCallback(
    (online: boolean) => {
      const newStatus = online ? "available" : "offline";
      setDriverStatus(newStatus);
      send({ type: "driver:status", driverId: userId, status: newStatus });
      if (online) startLocationTracking();
      else stopLocationTracking();
    },
    [userId, send, startLocationTracking, stopLocationTracking],
  );

  const requestRide = useCallback(
    (pickup: GeoLocation, dropoff: GeoLocation) => {
      setRideStatus("requesting");
      setCurrentRide({ id: "", riderId: userId, status: "requesting", pickup, dropoff });
      send({ type: "ride:request", riderId: userId, riderName: userName, pickup, dropoff });
    },
    [userId, userName, send],
  );

  const cancelRide = useCallback(() => {
    setCurrentRide(prev => {
      if (prev?.id) send({ type: "ride:cancel", userId, rideId: prev.id });
      return null;
    });
    setRideStatus("idle");
  }, [userId, send]);

  const acceptRide = useCallback(
    (rideId: string) => {
      send({ type: "ride:accept", driverId: userId, rideId });
      setIncomingRequest(prev => {
        if (prev) setActiveRide({ ...prev, id: rideId, status: "accepted", driverId: userId });
        return null;
      });
    },
    [userId, send],
  );

  const rejectRide = useCallback(
    (rideId: string) => {
      send({ type: "ride:reject", driverId: userId, rideId });
      setIncomingRequest(null);
      setDriverStatus("available");
    },
    [userId, send],
  );

  const startRide = useCallback(
    (rideId: string) => {
      send({ type: "ride:start", driverId: userId, rideId });
      setActiveRide(prev => (prev ? { ...prev, status: "in_progress" } : null));
    },
    [userId, send],
  );

  const completeRide = useCallback(
    (rideId: string) => {
      send({ type: "ride:complete", driverId: userId, rideId });
    },
    [userId, send],
  );

  return (
    <SocketContext.Provider
      value={{
        connected,
        nearbyDrivers,
        currentRide,
        rideStatus,
        requestRide,
        cancelRide,
        driverStatus,
        setDriverOnline,
        incomingRequest,
        activeRide,
        acceptRide,
        rejectRide,
        startRide,
        completeRide,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
