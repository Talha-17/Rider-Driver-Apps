import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function DriverProfile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userName, userId, history, setRole } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const driverTrips = history.filter((h) => h.role === "driver" && h.status === "completed");
  const totalEarned = driverTrips.reduce((s, t) => s + (t.fare ?? 0), 0);

  const handleSwitchRole = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Switch to Rider", "Switch to Rider mode?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Switch",
        onPress: async () => {
          await setRole("rider");
          router.replace("/(rider)/map");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
    >
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarTxt, { color: colors.primaryForeground }]}>
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{userName}</Text>
        <Text style={[styles.userId, { color: colors.mutedForeground }]}>Driver · {userId.slice(-6)}</Text>
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <StatCell label="Trips" value={driverTrips.length.toString()} colors={colors} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatCell label="Earned" value={`$${totalEarned.toFixed(2)}`} colors={colors} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatCell label="Rating" value="4.95" colors={colors} />
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={handleSwitchRole}
          style={({ pressed }) => [
            styles.menuItem,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1, borderRadius: colors.radius },
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary + "22" }]}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuLabel}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>Switch to Rider</Text>
            <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>Request rides as a passenger</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatCell({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    paddingBottom: 24,
    borderBottomWidth: 1,
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarTxt: { fontSize: 28, fontFamily: "Inter_700Bold" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold" },
  userId: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", paddingVertical: 20, borderBottomWidth: 1 },
  statCell: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, marginVertical: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1 },
  menuTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
