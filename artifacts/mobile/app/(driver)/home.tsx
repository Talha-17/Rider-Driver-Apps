import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useSocket } from "@/context/SocketContext";
import { useColors } from "@/hooks/useColors";

export default function DriverHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userName } = useApp();
  const {
    connected,
    driverStatus,
    setDriverOnline,
    incomingRequest,
    activeRide,
    acceptRide,
    rejectRide,
    startRide,
    completeRide,
  } = useSocket();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const requestAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isOnline = driverStatus === "available" || driverStatus === "busy";

  useEffect(() => {
    Animated.timing(requestAnim, {
      toValue: incomingRequest ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [incomingRequest]);

  useEffect(() => {
    if (isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline]);

  const toggleOnline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDriverOnline(!isOnline);
  };

  const handleAccept = () => {
    if (!incomingRequest) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptRide(incomingRequest.id);
  };

  const handleReject = () => {
    if (!incomingRequest) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rejectRide(incomingRequest.id);
  };

  const handleStart = () => {
    if (!activeRide) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startRide(activeRide.id);
  };

  const handleComplete = () => {
    if (!activeRide) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeRide(activeRide.id);
  };

  const requestTranslate = requestAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const statusColor = isOnline ? colors.primary : colors.mutedForeground;
  const statusLabel = driverStatus === "available" ? "Online" : driverStatus === "busy" ? "On Trip" : "Offline";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.card, colors.background]}
        style={[styles.topSection, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Welcome back</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>{userName}</Text>
          </View>
          <View style={[styles.connBadge, { backgroundColor: connected ? colors.primary + "22" : colors.destructive + "22" }]}>
            <View style={[styles.connDot, { backgroundColor: connected ? colors.primary : colors.destructive }]} />
            <Text style={[styles.connTxt, { color: connected ? colors.primary : colors.destructive }]}>
              {connected ? "Live" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={styles.toggleSection}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable
              onPress={toggleOnline}
              style={({ pressed }) => [
                styles.toggleBtn,
                {
                  backgroundColor: isOnline ? colors.primary : colors.secondary,
                  borderColor: isOnline ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isOnline ? "steering" : "steering"}
                size={40}
                color={isOnline ? colors.primaryForeground : colors.mutedForeground}
              />
            </Pressable>
          </Animated.View>
          <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
            {isOnline ? "Tap to go offline" : "Tap to start receiving rides"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: bottomPad + 100, gap: 14, padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Active ride card */}
        {activeRide && (
          <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.accent, borderRadius: colors.radius }]}>
            <View style={styles.activeHeader}>
              <View style={[styles.activeBadge, { backgroundColor: colors.accent + "22" }]}>
                <Text style={[styles.activeBadgeTxt, { color: colors.accent }]}>
                  {activeRide.status === "in_progress" ? "In Progress" : "Accepted"}
                </Text>
              </View>
              {activeRide.estimatedFare != null && (
                <Text style={[styles.farePreview, { color: colors.accent }]}>
                  ~${(activeRide.estimatedFare ?? 0).toFixed(2)}
                </Text>
              )}
            </View>

            <RouteDisplay
              pickup={activeRide.pickup?.address ?? `${activeRide.pickup?.lat?.toFixed(4)}, ${activeRide.pickup?.lng?.toFixed(4)}`}
              dropoff={activeRide.dropoff?.address ?? `${activeRide.dropoff?.lat?.toFixed(4)}, ${activeRide.dropoff?.lng?.toFixed(4)}`}
              riderName={activeRide.riderName ?? "Rider"}
              colors={colors}
            />

            <View style={styles.actionRow}>
              {activeRide.status === "accepted" && (
                <Pressable
                  onPress={handleStart}
                  style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Ionicons name="play" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.actionBtnTxt, { color: colors.primaryForeground }]}>Start Ride</Text>
                </Pressable>
              )}
              {activeRide.status === "in_progress" && (
                <Pressable
                  onPress={handleComplete}
                  style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.accent, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Ionicons name="checkmark-circle" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.actionBtnTxt, { color: colors.primaryForeground }]}>Complete Ride</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Idle state hint */}
        {isOnline && !activeRide && !incomingRequest && (
          <View style={[styles.waitingCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="car-clock" size={36} color={colors.mutedForeground} />
            <Text style={[styles.waitingTitle, { color: colors.foreground }]}>Waiting for rides</Text>
            <Text style={[styles.waitingSub, { color: colors.mutedForeground }]}>
              Stay online to receive ride requests in your area
            </Text>
          </View>
        )}

        {!isOnline && (
          <View style={[styles.waitingCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="weather-night" size={36} color={colors.mutedForeground} />
            <Text style={[styles.waitingTitle, { color: colors.foreground }]}>You're offline</Text>
            <Text style={[styles.waitingSub, { color: colors.mutedForeground }]}>
              Go online to start receiving rides and earning
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Incoming request overlay */}
      {incomingRequest && (
        <Animated.View
          style={[
            styles.requestOverlay,
            {
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: bottomPad + 16,
              transform: [{ translateY: requestTranslate }],
            },
          ]}
        >
          <View style={styles.handleBar} />
          <View style={[styles.requestBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.requestBadgeTxt, { color: colors.primary }]}>New Ride Request</Text>
          </View>

          <RouteDisplay
            pickup={incomingRequest.pickup?.address ?? `${incomingRequest.pickup?.lat?.toFixed(4)}, ${incomingRequest.pickup?.lng?.toFixed(4)}`}
            dropoff={incomingRequest.dropoff?.address ?? `${incomingRequest.dropoff?.lat?.toFixed(4)}, ${incomingRequest.dropoff?.lng?.toFixed(4)}`}
            riderName={incomingRequest.riderName ?? "Rider"}
            colors={colors}
          />

          {incomingRequest.estimatedFare != null && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareAmount, { color: colors.accent }]}>
                ~${(incomingRequest.estimatedFare ?? 0).toFixed(2)}
              </Text>
              <Text style={[styles.fareHint, { color: colors.mutedForeground }]}>estimated fare</Text>
            </View>
          )}

          <View style={styles.decisionRow}>
            <Pressable
              onPress={handleReject}
              style={({ pressed }) => [
                styles.rejectBtn,
                { borderColor: colors.destructive, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.rejectTxt, { color: colors.destructive }]}>Decline</Text>
            </Pressable>
            <Pressable
              onPress={handleAccept}
              style={({ pressed }) => [
                styles.acceptBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="checkmark" size={20} color={colors.primaryForeground} />
              <Text style={[styles.acceptTxt, { color: colors.primaryForeground }]}>Accept</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function RouteDisplay({
  pickup,
  dropoff,
  riderName,
  colors,
}: {
  pickup: string;
  dropoff: string;
  riderName: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.routeBlock}>
      <View style={styles.riderRow}>
        <View style={[styles.riderAvatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.riderInitial, { color: colors.foreground }]}>
            {riderName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.riderName, { color: colors.mutedForeground }]}>{riderName}</Text>
      </View>
      <View style={styles.routePoints}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.routeAddr, { color: colors.foreground }]} numberOfLines={1}>{pickup}</Text>
        </View>
        <View style={[styles.routeVert, { backgroundColor: colors.border }]} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.routeAddr, { color: colors.foreground }]} numberOfLines={1}>{dropoff}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  connBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  connTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  toggleSection: { alignItems: "center", gap: 12 },
  toggleBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scrollArea: { flex: 1 },
  activeCard: { borderWidth: 2, padding: 16, gap: 14 },
  activeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadgeTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  farePreview: { fontSize: 18, fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, height: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waitingCard: { borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  waitingTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  waitingSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  requestOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
  },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#444", alignSelf: "center", marginBottom: 4 },
  requestBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  requestBadgeTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fareRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  fareAmount: { fontSize: 28, fontFamily: "Inter_700Bold" },
  fareHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  decisionRow: { flexDirection: "row", gap: 12 },
  rejectBtn: { flex: 1, height: 50, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  rejectTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  acceptBtn: { flex: 2, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  acceptTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  routeBlock: { gap: 10 },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  riderAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  riderInitial: { fontSize: 13, fontFamily: "Inter_700Bold" },
  riderName: { fontSize: 13, fontFamily: "Inter_400Regular" },
  routePoints: { gap: 6 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeVert: { width: 2, height: 16, marginLeft: 4 },
  routeAddr: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
