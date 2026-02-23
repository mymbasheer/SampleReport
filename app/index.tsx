import { useState } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTheme } from "@/lib/useTheme";
import { getApiUrl, queryClient } from "@/lib/query-client";

export default function WelcomeScreen() {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const handlePickFile = async () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const fileName = file.name.toLowerCase();

      if (
        !fileName.endsWith(".db") &&
        !fileName.endsWith(".sqlite") &&
        !fileName.endsWith(".sqlite3")
      ) {
        Alert.alert(
          "Invalid File",
          "Please select a .db, .sqlite, or .sqlite3 database file.\n\nYou can sync your Aronium POS database from Google Drive, OneDrive, or Dropbox."
        );
        return;
      }

      setIsLoading(true);
      setLoadingText("Uploading database...");

      const formData = new FormData();
      const baseUrl = getApiUrl();
      const uploadUrl = `${baseUrl}/api/upload-db`;

      if (Platform.OS === "web") {
        // Web: fetch the blob from the object URL
        const response = await globalThis.fetch(file.uri);
        const blob = await response.blob();
        formData.append("database", blob, file.name);
      } else {
        // Native iOS / Android: append as a file object understood by FormData
        formData.append("database", {
          uri: file.uri,
          name: file.name,
          type: "application/octet-stream",
        } as any);
      }

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(errText || "Upload failed");
      }

      setLoadingText("Loading data...");

      // Invalidate all cached queries so the new DB data is fetched fresh
      await queryClient.invalidateQueries();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load database file.");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleUseDefault = async () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setIsLoading(true);
      setLoadingText("Checking database...");

      const baseUrl = getApiUrl();
      const statusRes = await fetch(`${baseUrl}/api/status`);
      const status = await statusRes.json();

      if (status.loaded) {
        router.replace("/(tabs)");
      } else {
        Alert.alert(
          "No Database",
          "No default database is available. Please select a .db file from your cloud drive (Google Drive, OneDrive, or Dropbox)."
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Connection failed.");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset,
          paddingBottom: insets.bottom + webBottomInset,
        },
      ]}
    >
      <LinearGradient
        colors={["#0D7377", "#14919B", "#0D7377"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        entering={Platform.OS !== "web" ? FadeInUp.delay(100).springify() : undefined}
        style={styles.logoSection}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="book" size={40} color="#0D7377" />
        </View>
        <Text style={styles.appName}>BizLedger</Text>
        <Text style={styles.tagline}>Your POS Business Reports</Text>
      </Animated.View>

      <Animated.View
        entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}
        style={styles.cardSection}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connect Your Database</Text>
          <Text style={styles.cardDesc}>
            Select your Aronium POS database file synced from your cloud drive.
            Supports Google Drive, OneDrive, and Dropbox.
          </Text>

          <View style={styles.providersRow}>
            <View style={styles.providerChip}>
              <MaterialCommunityIcons name="google-drive" size={18} color="#4285F4" />
              <Text style={styles.providerText}>Google Drive</Text>
            </View>
            <View style={styles.providerChip}>
              <MaterialCommunityIcons name="microsoft-onedrive" size={18} color="#0078D4" />
              <Text style={styles.providerText}>OneDrive</Text>
            </View>
            <View style={styles.providerChip}>
              <MaterialCommunityIcons name="dropbox" size={18} color="#0061FF" />
              <Text style={styles.providerText}>Dropbox</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.tint} />
              <Text style={styles.loadingText}>{loadingText}</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                onPress={handlePickFile}
              >
                <Ionicons name="cloud-upload" size={22} color="#fff" />
                <Text style={styles.primaryBtnText}>Select Database File</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleUseDefault}
              >
                <Ionicons name="server" size={18} color={Colors.light.tint} />
                <Text style={styles.secondaryBtnText}>Use Sample Database</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.hint}>
          Your database file is read-only and never shared with anyone.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between" },
  logoSection: { alignItems: "center", paddingTop: 60 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginTop: 16,
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 6 },
  cardSection: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  providersRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  providerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F7FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  providerText: { fontSize: 12, fontWeight: "600", color: Colors.light.text },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "600", color: Colors.light.tint },
  loadingContainer: { alignItems: "center", paddingVertical: 24, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.light.textSecondary },
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 16,
  },
});
