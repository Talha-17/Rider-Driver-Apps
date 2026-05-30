import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RideHistoryItem } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return "--";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default function RideCard({ item }: { item: RideHistoryItem }) {
  const colors = useColors();
  const isCompleted = item.status === "completed";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.row}>
        <View style={[styles.statusDot, { backgroundColor: isCompleted ? colors.primary : colors.destructive }]} />
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDate(item.date)}</Text>
        {item.fare != null && (
          <Text style={[styles.fare, { color: colors.accent }]}>${item.fare.toFixed(2)}</Text>
        )}
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.location, { color: colors.foreground }]} numberOfLines={1}>
            {item.pickup}
          </Text>
        </View>
        <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.location, { color: colors.foreground }]} numberOfLines={1}>
            {item.dropoff}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        {item.distance != null && (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaTxt, { color: colors.mutedForeground }]}>{item.distance.toFixed(1)} km</Text>
          </View>
        )}
        {item.duration != null && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaTxt, { color: colors.mutedForeground }]}>{formatDuration(item.duration)}</Text>
          </View>
        )}
        {(item.driverName ?? item.riderName) && (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaTxt, { color: colors.mutedForeground }]}>
              {item.driverName ?? item.riderName}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  date: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  fare: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  route: {
    gap: 4,
    paddingLeft: 4,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    width: 2,
    height: 14,
    marginLeft: 3,
  },
  location: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  meta: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaTxt: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
