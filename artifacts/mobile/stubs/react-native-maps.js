import React from "react";
import { View, Text, StyleSheet } from "react-native";

const MapView = React.forwardRef(({ style, children }, _ref) => (
  <View style={[styles.placeholder, style]}>
    <Text style={styles.txt}>Map (web preview)</Text>
    {children}
  </View>
));
MapView.displayName = "MapView";

export const Marker = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const PROVIDER_DEFAULT = "default";
export const PROVIDER_GOOGLE = "google";
export default MapView;

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#1d2c4d",
    alignItems: "center",
    justifyContent: "center",
  },
  txt: { color: "#8ec3b9", fontSize: 14, fontFamily: "Inter_400Regular" },
});
