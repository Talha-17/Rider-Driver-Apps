---
name: react-native-maps web stub
description: How to use react-native-maps in an Expo project that also targets web
---

**Rule:** Pin `react-native-maps` at `1.18.0` for Expo SDK 54 / RN 0.81 Expo Go compatibility. Do NOT add it to `plugins` in `app.json`.

**Why:** The package imports `react-native/Libraries/Utilities/codegenNativeCommands` which is native-only and crashes the Metro web bundler.

**How to apply:**
1. Create `stubs/react-native-maps.js` — a React component stub with a View placeholder, exporting `Marker`, `Polyline`, `PROVIDER_DEFAULT`, etc. as no-ops.
2. In `metro.config.js`, add a custom `resolveRequest`:
   ```js
   config.resolver.resolveRequest = (context, moduleName, platform) => {
     if (moduleName === "react-native-maps" && platform === "web") {
       return { filePath: path.resolve(__dirname, "stubs/react-native-maps.js"), type: "sourceFile" };
     }
     return context.resolveRequest(context, moduleName, platform);
   };
   ```
