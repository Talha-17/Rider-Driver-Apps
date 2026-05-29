import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useSocket, type GeoLocation } from "@/context/SocketContext";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_H } = Dimensions.get("window");

const DEFAULT_REGION = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function RiderMap() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const {
    connected,
    nearbyDrivers,
    currentRide,
    rideStatus,
    requestRide,
    cancelRide,
  } = useSocket();

  const mapRef = useRef<MapView>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [locGranted, setLocGranted] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          setLocGranted(true);
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLoc(coords);
          mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 800);
        }
      } else if (typeof navigator !== "undefined" && navigator.geolocation) {
        setLocGranted(true);
        navigator.geolocation.getCurrentPosition((pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserLoc(coords);
          mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 800);
        });
      }
    })();
  }, []);

  useEffect(() => {
    const isActive = rideStatus !== "idle";
    Animated.spring(sheetAnim, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [rideStatus]);

  useEffect(() => {
    if (currentRide?.driverLat && currentRide?.driverLng) {
      mapRef.current?.animateToRegion(
        {
          latitude: currentRide.driverLat,
          longitude: currentRide.driverLng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        500,
      );
    }
  }, [currentRide?.driverLat, currentRide?.driverLng]);

  const handleBook = () => {
    if (!destination.trim() || !userLoc) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pickup: GeoLocation = {
      lat: userLoc.latitude,
      lng: userLoc.longitude,
      address: "Current Location",
    };
    const offset = 0.02 + Math.random() * 0.03;
    const dropoff: GeoLocation = {
      lat: userLoc.latitude + offset,
      lng: userLoc.longitude + offset,
      address: destination,
    };
    requestRide(pickup, dropoff);
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cancelRide();
    setDestination("");
  };

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={locGranted}
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {nearbyDrivers.map((driver) => (
          <Marker
            key={driver.id}
            coordinate={{ latitude: driver.lat, longitude: driver.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.driverMarker, { backgroundColor: driver.status === "available" ? colors.primary : colors.mutedForeground }]}>
              <MaterialCommunityIcons name="car" size={14} color="#fff" />
            </View>
          </Marker>
        ))}
        {currentRide?.driverLat && currentRide?.driverLng && (
          <Marker
            coordinate={{ latitude: currentRide.driverLat, longitude: currentRide.driverLng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.driverMarkerActive, { backgroundColor: colors.accent }]}>
              <MaterialCommunityIcons name="car" size={16} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <View style={[styles.statusPill, { backgroundColor: colors.card + "EE" }]}>
          <View style={[styles.statusDot, { backgroundColor: connected ? colors.primary : colors.destructive }]} />
          <Text style={[styles.statusTxt, { color: colors.foreground }]}>
            {connected ? `${nearbyDrivers.length} drivers nearby` : "Connecting..."}
          </Text>
        </View>
      </View>

      {/* Bottom sheet — idle booking UI */}
      {rideStatus === "idle" && (
        <LinearGradient
          colors={["transparent", colors.background + "F8"]}
          style={[styles.bookingGradient, { paddingBottom: bottomPad + 16 }]}
        >
          <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={[styles.inputRow, { borderColor: colors.primary }]}>
              <View style={[styles.locDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Current Location</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.inputRow, { borderColor: colors.border }]}>
              <View style={[styles.locDot, { backgroundColor: colors.destructive }]} />
              <TextInput
                style={[styles.destInput, { color: colors.foreground }]}
                placeholder="Where to?"
                placeholderTextColor={colors.mutedForeground}
                value={destination}
                onChangeText={setDestination}
                returnKeyType="search"
                onSubmitEditing={handleBook}
              />
            </View>
          </View>

          <Pressable
            onPress={handleBook}
            disabled={!destination.trim() || !userLoc}
            style={({ pressed }) => [
              styles.bookBtn,
              {
                backgroundColor: destination.trim() && userLoc ? colors.primary : colors.muted,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.bookBtnTxt, { color: destination.trim() && userLoc ? colors.primaryForeground : colors.mutedForeground }]}>
              Book Ride
            </Text>
          </Pressable>
        </LinearGradient>
      )}

      {/* Active ride states */}
      {rideStatus !== "idle" && (
        <Animated.View
          style={[
            styles.rideSheet,
            {
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: bottomPad + 16,
              transform: [{ translateY: sheetTranslate }],
            },
          ]}
        >
          <RideStatusPanel
            status={rideStatus}
            ride={currentRide}
            onCancel={handleCancel}
            colors={colors}
          />
        </Animated.View>
      )}
    </View>
  );
}

function RideStatusPanel({
  status,
  ride,
  onCancel,
  colors,
}: {
  status: string;
  ride: ReturnType<typeof useSocket>["currentRide"];
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (status === "requesting" || status === "matching") {
    return (
      <View style={styles.statusPanel}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.statusTitle, { color: colors.foreground }]}>Finding your driver...</Text>
        <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
          {ride?.estimatedFare ? `Estimated fare $${ride.estimatedFare.toFixed(2)}` : "Matching you with a nearby driver"}
        </Text>
        <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.cancelTxt, { color: colors.mutedForeground }]}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (status === "driver_assigned" || status === "accepted") {
    return (
      <View style={styles.statusPanel}>
        <View style={[styles.driverBubble, { backgroundColor: colors.secondary }]}>
          <MaterialCommunityIcons name="steering" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.statusTitle, { color: colors.foreground }]}>
          {status === "driver_assigned" ? "Driver is on the way" : "Driver accepted your ride"}
        </Text>
        <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
          {ride?.driverName ?? "Your driver"} is heading to you
        </Text>
        {ride?.estimatedFare && (
          <View style={[styles.farePill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.fareAmt, { color: colors.accent }]}>${ride.estimatedFare.toFixed(2)}</Text>
            <Text style={[styles.fareLabel, { color: colors.mutedForeground }]}>estimated</Text>
          </View>
        )}
        <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.cancelTxt, { color: colors.mutedForeground }]}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (status === "in_progress") {
    return (
      <View style={styles.statusPanel}>
        <View style={[styles.progressRing, { borderColor: colors.primary }]}>
          <MaterialCommunityIcons name="car-side" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.statusTitle, { color: colors.foreground }]}>Ride in progress</Text>
        <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
          Heading to your destination with {ride?.driverName ?? "driver"}
        </Text>
      </View>
    );
  }

  if (status === "completed") {
    return (
      <View style={styles.statusPanel}>
        <View style={[styles.successRing, { borderColor: colors.primary, backgroundColor: colors.primary + "22" }]}>
          <Ionicons name="checkmark" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.statusTitle, { color: colors.foreground }]}>Ride completed!</Text>
        {ride?.fare != null && (
          <Text style={[styles.finalFare, { color: colors.accent }]}>${ride.fare.toFixed(2)}</Text>
        )}
        {ride?.distance != null && (
          <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
            {ride.distance.toFixed(1)} km traveled
          </Text>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bookingGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 40,
    gap: 12,
  },
  bookingCard: {
    borderWidth: 1,
    padding: 4,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  locDot: { width: 10, height: 10, borderRadius: 5 },
  inputLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  destInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", height: 24 },
  divider: { height: 1, marginHorizontal: 42 },
  bookBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnTxt: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  rideSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  statusPanel: {
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  statusTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  statusSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  driverMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  driverMarkerActive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  cancelBtn: { marginTop: 4, padding: 10 },
  cancelTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  driverBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  farePill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  fareAmt: { fontSize: 22, fontFamily: "Inter_700Bold" },
  fareLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  finalFare: { fontSize: 36, fontFamily: "Inter_700Bold" },
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];
