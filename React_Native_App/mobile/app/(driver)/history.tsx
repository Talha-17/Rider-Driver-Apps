import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RideCard from "@/components/RideCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function DriverHistory() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { history, clearHistory } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const driverHistory = history.filter((h) => h.role === "driver");
  const totalEarned = driverHistory
    .filter((h) => h.status === "completed")
    .reduce((s, h) => s + (h.fare ?? 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Earnings</Text>
          {driverHistory.length > 0 && (
            <Text style={[styles.total, { color: colors.accent }]}>
              ${totalEarned.toFixed(2)} total
            </Text>
          )}
        </View>
        {driverHistory.length > 0 && (
          <Pressable onPress={clearHistory} hitSlop={8}>
            <Text style={[styles.clearBtn, { color: colors.mutedForeground }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={driverHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RideCard item={item} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80 },
        ]}
        scrollEnabled={!!driverHistory.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No trips yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Go online and accept rides to start earning
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  total: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  clearBtn: { fontSize: 14, fontFamily: "Inter_500Medium" },
  listContent: { paddingTop: 8 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
