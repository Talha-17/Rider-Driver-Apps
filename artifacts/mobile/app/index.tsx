import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type UserRole } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function RoleSelector() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, setRole } = useApp();
  const [selected, setSelected] = useState<UserRole>(role ?? "rider");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setRole(selected);
    if (selected === "rider") {
      router.replace("/(rider)/map");
    } else {
      router.replace("/(driver)/home");
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.secondary]}
      style={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad + 20 }]}
    >
      <View style={styles.header}>
        <View style={[styles.logoRing, { borderColor: colors.primary }]}>
          <MaterialCommunityIcons name="car-speed-limiter" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.brand, { color: colors.foreground }]}>TEYZIX</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Choose how you want to ride today
        </Text>
      </View>

      <View style={styles.cards}>
        <RoleCard
          type="rider"
          selected={selected === "rider"}
          onSelect={() => {
            setSelected("rider");
            Haptics.selectionAsync();
          }}
          colors={colors}
        />
        <RoleCard
          type="driver"
          selected={selected === "driver"}
          onSelect={() => {
            setSelected("driver");
            Haptics.selectionAsync();
          }}
          colors={colors}
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.continueTxt, { color: colors.primaryForeground }]}>
            Continue as {selected === "rider" ? "Rider" : "Driver"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
        </Pressable>
        <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>
          You can switch roles anytime
        </Text>
      </View>
    </LinearGradient>
  );
}

function RoleCard({
  type,
  selected,
  onSelect,
  colors,
}: {
  type: UserRole;
  selected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isRider = type === "rider";

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.card : colors.secondary,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
          opacity: pressed ? 0.92 : 1,
          borderRadius: colors.radius,
        },
      ]}
    >
      <LinearGradient
        colors={
          selected
            ? [colors.primary + "22", colors.primary + "08"]
            : ["transparent", "transparent"]
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.iconBox, { backgroundColor: isRider ? "#00C896" + "22" : "#F5A623" + "22", borderRadius: colors.radius }]}>
        {isRider ? (
          <Ionicons name="person" size={30} color={isRider ? colors.primary : colors.accent} />
        ) : (
          <MaterialCommunityIcons name="steering" size={30} color={colors.accent} />
        )}
      </View>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
        {isRider ? "Rider" : "Driver"}
      </Text>
      <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
        {isRider
          ? "Request rides, track live location, view fare & history"
          : "Go online, accept trips, earn money, track earnings"}
      </Text>
      {selected && (
        <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={12} color={colors.primaryForeground} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    gap: 10,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  cards: {
    gap: 14,
  },
  card: {
    padding: 20,
    overflow: "hidden",
    gap: 8,
    position: "relative",
  },
  iconBox: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  selectedBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    gap: 12,
    alignItems: "center",
  },
  continueBtn: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  continueTxt: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  switchHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
