# Teyzix Ride

A real-time ride-sharing app (MAD-3 internship task) built in React Native (Expo) with a Node.js + Express + WebSocket backend. Single app with Rider and Driver modes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 / workflow-assigned)
- `pnpm --filter @workspace/mobile run dev` — run the Expo dev server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (if DB features are used)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: React Native 0.81 + Expo SDK 54 + Expo Router 6
- Maps: react-native-maps 1.18.0 (pinned — only Expo Go compatible version for RN 0.81)
- API: Express 5 + ws (WebSocket)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`

## Where things live

- `artifacts/mobile/` — Expo app (Rider + Driver modes)
  - `app/index.tsx` — Role selector (entry point)
  - `app/(rider)/` — Rider tabs: map, history, profile
  - `app/(driver)/` — Driver tabs: home, history, driverprofile
  - `context/AppContext.tsx` — user role, history, AsyncStorage persistence
  - `context/SocketContext.tsx` — WebSocket client, ride state machine
  - `constants/colors.ts` — dark/light design tokens (primary `#00C896`, accent `#F5A623`)
  - `stubs/react-native-maps.js` — web stub for react-native-maps (Metro resolver)
- `artifacts/api-server/` — Express + WebSocket backend
  - `src/socket/rideSocket.ts` — Full ride lifecycle over WebSocket
  - `src/index.ts` — http.createServer + ws upgrade at `/api/ws`

## Architecture decisions

- WebSocket server uses `noServer: true` pattern; HTTP upgrade events at path `/api/ws` are delegated to wss
- Metro config uses a custom `resolveRequest` to stub `react-native-maps` on web (avoids native-only import errors)
- React-native-maps is pinned at `1.18.0` — do NOT upgrade or add to `plugins` in app.json
- Fare formula: `max($5.00, $2.50 + dist_km × $1.20 + dur_min × $0.25)`
- Driver location is broadcast to the matched rider in real-time; all drivers' positions are broadcast to all riders every 3s

## Product

- **Rider mode**: Select destination, book a ride, see nearby drivers on map, track driver live, view fare on completion
- **Driver mode**: Go online/offline, receive incoming ride requests with fare estimate, accept/reject, start and complete rides, view earnings history
- **Ride lifecycle**: idle → requesting → matching → driver_assigned → accepted → in_progress → completed

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `react-native-maps` MUST stay at `1.18.0` and must NOT be added to `plugins` in `app.json`
- Web bundling requires the Metro stub in `stubs/react-native-maps.js`
- `expo-location` has no web support — always use `Platform.OS !== 'web'` guards + `navigator.geolocation` fallback
- WS URL: `wss://${EXPO_PUBLIC_DOMAIN}/api/ws`; server handles upgrade at path `/api/ws`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
