import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { logger } from "../lib/logger";

interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface ClientRecord {
  ws: WebSocket;
  userId: string;
  userName: string;
  role: "rider" | "driver";
  lat?: number;
  lng?: number;
  status?: "available" | "busy" | "offline";
}

interface RideRecord {
  id: string;
  riderId: string;
  riderName: string;
  driverId?: string;
  driverName?: string;
  status: "matching" | "driver_assigned" | "accepted" | "in_progress" | "completed" | "cancelled";
  pickup: GeoLocation;
  dropoff: GeoLocation;
  estimatedFare?: number;
  fare?: number;
  distance?: number;
  startedAt?: number;
}

const clients = new Map<string, ClientRecord>();
const rides = new Map<string, RideRecord>();

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcFare(distKm: number, durMin: number): number {
  return Math.max(5.0, 2.5 + distKm * 1.2 + durMin * 0.25);
}

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendToUser(userId: string, msg: object): void {
  const client = clients.get(userId);
  if (client) send(client.ws, msg);
}

function broadcastNearbyDrivers(): void {
  const driverList = [...clients.values()]
    .filter((c) => c.role === "driver" && c.status !== "offline" && c.lat != null && c.lng != null)
    .map((c) => ({ id: c.userId, name: c.userName, lat: c.lat!, lng: c.lng!, status: c.status! }));

  for (const client of clients.values()) {
    if (client.role === "rider") {
      send(client.ws, { type: "drivers:nearby", drivers: driverList });
    }
  }
}

function startDriverBroadcast(): void {
  setInterval(broadcastNearbyDrivers, 3000);
}

export function createRideSocket(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  startDriverBroadcast();

  wss.on("connection", (ws: WebSocket) => {
    let clientId: string | null = null;

    ws.on("message", (data: Buffer | string) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      const t = msg.type as string;

      if (t === "register") {
        const userId = msg.userId as string;
        const role = msg.role as "rider" | "driver";
        const userName = (msg.userName as string) || "User";
        clientId = userId;
        clients.set(userId, { ws, userId, userName, role, status: role === "driver" ? "offline" : undefined });
        logger.info({ userId, role }, "Client registered");

        if (role === "rider") {
          const driverList = [...clients.values()]
            .filter((c) => c.role === "driver" && c.status !== "offline" && c.lat != null && c.lng != null)
            .map((c) => ({ id: c.userId, name: c.userName, lat: c.lat!, lng: c.lng!, status: c.status! }));
          send(ws, { type: "drivers:nearby", drivers: driverList });
        }
        return;
      }

      if (t === "driver:location") {
        const driverId = msg.driverId as string;
        const lat = msg.lat as number;
        const lng = msg.lng as number;
        const record = clients.get(driverId);
        if (record) {
          record.lat = lat;
          record.lng = lng;
        }
        const rideForDriver = [...rides.values()].find(
          (r) => r.driverId === driverId && (r.status === "accepted" || r.status === "in_progress"),
        );
        if (rideForDriver) {
          sendToUser(rideForDriver.riderId, { type: "driver:location_update", lat, lng });
        }
        return;
      }

      if (t === "driver:status") {
        const driverId = msg.driverId as string;
        const status = msg.status as "available" | "busy" | "offline";
        const record = clients.get(driverId);
        if (record) record.status = status;
        logger.info({ driverId, status }, "Driver status updated");
        return;
      }

      if (t === "ride:request") {
        const riderId = msg.riderId as string;
        const riderName = (msg.riderName as string) || "Rider";
        const pickup = msg.pickup as GeoLocation;
        const dropoff = msg.dropoff as GeoLocation;

        const distKm = haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
        const estimatedFare = calcFare(distKm, (distKm / 30) * 60);

        const rideId = "ride_" + makeId();
        const ride: RideRecord = {
          id: rideId,
          riderId,
          riderName,
          status: "matching",
          pickup,
          dropoff,
          estimatedFare,
        };
        rides.set(rideId, ride);

        send(clients.get(riderId)!.ws, {
          type: "ride:status",
          status: "matching",
          rideId,
          estimatedFare,
        });

        const availableDrivers = [...clients.values()].filter(
          (c) => c.role === "driver" && c.status === "available" && c.lat != null && c.lng != null,
        );

        if (availableDrivers.length === 0) {
          setTimeout(() => {
            const r = rides.get(rideId);
            if (r && r.status === "matching") {
              send(clients.get(riderId)?.ws!, { type: "ride:status", status: "no_drivers" });
              rides.delete(rideId);
            }
          }, 8000);
          return;
        }

        availableDrivers.sort((a, b) => {
          const da = haversineKm(a.lat!, a.lng!, pickup.lat, pickup.lng);
          const db = haversineKm(b.lat!, b.lng!, pickup.lat, pickup.lng);
          return da - db;
        });

        const driver = availableDrivers[0]!;
        send(driver.ws, {
          type: "ride:request",
          ride: {
            id: rideId,
            riderId,
            riderName,
            pickup,
            dropoff,
            estimatedFare,
            riderLat: pickup.lat,
            riderLng: pickup.lng,
          },
        });

        logger.info({ rideId, riderId, driverId: driver.userId }, "Ride request dispatched");
        return;
      }

      if (t === "ride:accept") {
        const driverId = msg.driverId as string;
        const rideId = msg.rideId as string;
        const ride = rides.get(rideId);
        if (!ride || ride.status !== "matching") return;

        const driver = clients.get(driverId);
        if (!driver) return;

        ride.status = "driver_assigned";
        ride.driverId = driverId;
        ride.driverName = driver.userName;
        if (driver) driver.status = "busy";

        sendToUser(ride.riderId, {
          type: "ride:status",
          status: "driver_assigned",
          rideId,
          driverId,
          driverName: driver.userName,
          driverLat: driver.lat,
          driverLng: driver.lng,
        });

        send(driver.ws, { type: "ride:accept_confirmed", rideId });
        logger.info({ rideId, driverId }, "Ride accepted");
        return;
      }

      if (t === "ride:reject") {
        const driverId = msg.driverId as string;
        const rideId = msg.rideId as string;
        const ride = rides.get(rideId);
        if (!ride) return;

        const availableDrivers = [...clients.values()].filter(
          (c) => c.role === "driver" && c.status === "available" && c.userId !== driverId && c.lat != null,
        );

        if (availableDrivers.length > 0) {
          const nextDriver = availableDrivers[0]!;
          send(nextDriver.ws, {
            type: "ride:request",
            ride: {
              id: rideId,
              riderId: ride.riderId,
              riderName: ride.riderName,
              pickup: ride.pickup,
              dropoff: ride.dropoff,
              estimatedFare: ride.estimatedFare,
            },
          });
        } else {
          sendToUser(ride.riderId, { type: "ride:status", status: "no_drivers" });
          rides.delete(rideId);
        }
        return;
      }

      if (t === "ride:start") {
        const driverId = msg.driverId as string;
        const rideId = msg.rideId as string;
        const ride = rides.get(rideId);
        if (!ride || ride.driverId !== driverId) return;

        ride.status = "in_progress";
        ride.startedAt = Date.now();

        sendToUser(ride.riderId, { type: "ride:status", status: "in_progress", rideId });
        logger.info({ rideId }, "Ride started");
        return;
      }

      if (t === "ride:complete") {
        const driverId = msg.driverId as string;
        const rideId = msg.rideId as string;
        const ride = rides.get(rideId);
        if (!ride || ride.driverId !== driverId) return;

        const distKm = haversineKm(ride.pickup.lat, ride.pickup.lng, ride.dropoff.lat, ride.dropoff.lng);
        const durMs = ride.startedAt ? Date.now() - ride.startedAt : distKm * 2 * 60000;
        const durMin = durMs / 60000;
        const fare = calcFare(distKm, durMin);

        ride.status = "completed";
        ride.fare = fare;
        ride.distance = distKm;

        const completedPayload = {
          type: "ride:completed",
          ride: {
            id: rideId,
            riderId: ride.riderId,
            riderName: ride.riderName,
            driverId,
            driverName: ride.driverName,
            pickup: ride.pickup,
            dropoff: ride.dropoff,
            fare: parseFloat(fare.toFixed(2)),
            distance: parseFloat(distKm.toFixed(2)),
            duration: durMs,
          },
        };

        sendToUser(ride.riderId, completedPayload);
        sendToUser(driverId, completedPayload);

        const driver = clients.get(driverId);
        if (driver) driver.status = "available";

        rides.delete(rideId);
        logger.info({ rideId, fare: fare.toFixed(2) }, "Ride completed");
        return;
      }

      if (t === "ride:cancel") {
        const rideId = msg.rideId as string;
        const ride = rides.get(rideId);
        if (!ride) return;

        const cancelPayload = { type: "ride:cancelled", rideId };
        sendToUser(ride.riderId, cancelPayload);
        if (ride.driverId) {
          sendToUser(ride.driverId, cancelPayload);
          const driver = clients.get(ride.driverId);
          if (driver) driver.status = "available";
        }
        rides.delete(rideId);
        logger.info({ rideId }, "Ride cancelled");
        return;
      }
    });

    ws.on("close", () => {
      if (clientId) {
        const record = clients.get(clientId);
        if (record?.role === "driver") {
          for (const ride of rides.values()) {
            if (ride.driverId === clientId && ride.status !== "completed" && ride.status !== "cancelled") {
              sendToUser(ride.riderId, { type: "ride:cancelled", rideId: ride.id });
              rides.delete(ride.id);
            }
          }
        }
        clients.delete(clientId);
        logger.info({ clientId }, "Client disconnected");
      }
    });

    ws.on("error", (err) => logger.error({ err }, "WebSocket error"));
  });

  return wss;
}
