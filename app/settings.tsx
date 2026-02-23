import { useState } from "react";
import {
  StyleSheet, Text, View, ScrollView, Pressable,
  Platform, Alert, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";

import { useTheme } from "@/lib/useTheme";
import { useCompany } from "@/lib/company";
import { getApiUrl, queryClient } from "@/lib/query-client";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function SettingRow({
  icon, label, subtitle, value, onPress, danger, chevron = true,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  const C = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: C.surface, borderColor: C.border },
        pressed && onPress && { opacity: 0.7 },
      ]}
      onPress={onPress ? () => { haptic(); onPress(); } : undefined}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? C.stockOutBg : C.stockInBg }]}>
        <Ionicons
          name={icon as any}
          size={18}
          color={danger ? C.negative : C.tint}
        />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: danger ? C.negative : C.text }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: C.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[styles.rowValue, { color: C.textSecondary }]}>{value}</Text> : null}
      {chevron && onPress ? (
        <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
      ) : null}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const C = useTheme();
  return <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{title}</Text>;
}

export default function SettingsScreen() {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [isLoading, setIsLoading] = useState(false);
  const { data: company } = useCompany();

  const handleChangeDb = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const fileName = file.name.toLowerCase();

      if (!fileName.endsWith(".db") && !fileName.endsWith(".sqlite") && !fileName.endsWith(".sqlite3")) {
        Alert.alert("Invalid File", "Please select a .db, .sqlite, or .sqlite3 file.");
        return;
      }

      setIsLoading(true);
      const formData = new FormData();
      const uploadUrl = `${getApiUrl()}/api/upload-db`;

      if (Platform.OS === "web") {
        const response = await globalThis.fetch(file.uri);
        const blob = await response.blob();
        formData.append("database", blob, file.name);
      } else {
        formData.append("database", { uri: file.uri, name: file.name, type: "application/octet-stream" } as any);
      }

      const res = await fetch(uploadUrl, { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());

      await queryClient.invalidateQueries();
      Alert.alert("Success", `Database "${file.name}" loaded successfully.`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached data and reload from the server. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await queryClient.clear();
            Alert.alert("Done", "Cache cleared.");
          },
        },
      ]
    );
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + 16 + webTopInset,
        backgroundColor: C.surface,
        borderBottomColor: C.border,
      }]}>
        <Pressable onPress={() => { haptic(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.tint} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Company Info card */}
        {company && (
          <View style={[styles.companyCard, { backgroundColor: C.tint }]}>
            <View style={styles.companyIconRow}>
              <View style={styles.companyIconCircle}>
                <Ionicons name="business" size={24} color={C.tint} />
              </View>
            </View>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address || company.city ? (
              <Text style={styles.companyMeta}>
                {[company.address, company.city].filter(Boolean).join(", ")}
              </Text>
            ) : null}
            {company.phone ? (
              <Text style={styles.companyMeta}>{company.phone}</Text>
            ) : null}
            {company.email ? (
              <Text style={styles.companyMeta}>{company.email}</Text>
            ) : null}
            {company.taxNumber ? (
              <Text style={styles.companyMeta}>Tax: {company.taxNumber}</Text>
            ) : null}
          </View>
        )}

        {/* Database section */}
        <SectionHeader title="DATABASE" />
        <SettingRow
          icon="cloud-upload-outline"
          label={isLoading ? "Loading..." : "Change Database File"}
          subtitle="Load a different .db file from your cloud drive"
          onPress={isLoading ? undefined : handleChangeDb}
        />
        <SettingRow
          icon="home-outline"
          label="Go to Welcome Screen"
          subtitle="Return to file picker screen"
          onPress={handleGoHome}
        />

        {/* Cache section */}
        <SectionHeader title="CACHE & DATA" />
        <SettingRow
          icon="refresh-outline"
          label="Clear Data Cache"
          subtitle="Forces a fresh reload of all data from server"
          onPress={handleClearData}
        />

        {/* About section */}
        <SectionHeader title="ABOUT" />
        <SettingRow
          icon="information-circle-outline"
          label="App Name"
          value="BizLedger"
          chevron={false}
        />
        <SettingRow
          icon="code-slash-outline"
          label="Built on"
          value="Aronium POS"
          chevron={false}
        />
        <SettingRow
          icon="phone-portrait-outline"
          label="Platform"
          value={Platform.OS === "web" ? "Web" : Platform.OS === "ios" ? "iOS" : "Android"}
          chevron={false}
        />
        <SettingRow
          icon="document-text-outline"
          label="Supported Formats"
          value=".db · .sqlite · .sqlite3"
          chevron={false}
        />
        <SettingRow
          icon="lock-closed-outline"
          label="Data Privacy"
          subtitle="Your database is read-only. Data never leaves your server."
          chevron={false}
        />

        <Text style={[styles.footer, { color: C.textSecondary }]}>
          BizLedger · Powered by Aronium POS{"\n"}
          Data is read-only and stays on your device.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  content: { padding: 16, gap: 0 },
  companyCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  companyIconRow: { marginBottom: 10 },
  companyIconCircle: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center", alignItems: "center",
  },
  companyName: {
    fontSize: 20, fontWeight: "800", color: "#fff",
    letterSpacing: -0.3, textAlign: "center",
  },
  companyMeta: {
    fontSize: 12, color: "rgba(255,255,255,0.8)",
    marginTop: 3, textAlign: "center",
  },
  sectionHeader: {
    fontSize: 11, fontWeight: "700",
    letterSpacing: 0.6, textTransform: "uppercase",
    marginTop: 20, marginBottom: 8, marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 11, marginTop: 2 },
  rowValue: { fontSize: 12, fontWeight: "500" },
  footer: {
    textAlign: "center", fontSize: 11,
    marginTop: 32, lineHeight: 18,
  },
});
