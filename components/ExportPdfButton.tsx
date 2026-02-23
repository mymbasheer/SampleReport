import { useState } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface Props {
  onExport: () => Promise<void>;
  label?: string;
}

export function ExportPdfButton({ onExport, label = "Export PDF" }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await onExport();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        loading && styles.btnLoading,
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name="document-text-outline" size={16} color="#fff" />
      )}
      <Text style={styles.label}>{loading ? "Generating..." : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnLoading: {
    opacity: 0.7,
  },
  label: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
