import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { useTheme } from "@/lib/useTheme";
import { getQueryFn } from "@/lib/query-client";
import { useCompany } from "@/lib/company";
import { formatCurrency, formatQty } from "@/lib/format";

interface DashboardData {
  stock: {
    totalQty: number;
    totalCostValue: number;
    totalSaleValue: number;
    inStockCount: number;
    outOfStockCount: number;
  };
  customerOutstanding: number;
  supplierOutstanding: number;
  counts: { products: number; customers: number; suppliers: number };
}

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// ── Tappable count badge ──────────────────────────────────────────────────────
function CountBadge({
  icon,
  label,
  count,
  onPress,
  C,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  onPress: () => void;
  C: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.countBadge,
        pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
      ]}
      onPress={() => { haptic(); onPress(); }}
    >
      <Ionicons name={icon} size={18} color={C.tint} />
      <View>
        <Text style={styles.countValue}>{count}</Text>
        <Text style={styles.countLabel}>{label}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={12}
        color={C.textSecondary}
        style={styles.countChevron}
      />
    </Pressable>
  );
}

// ── Tappable summary card ─────────────────────────────────────────────────────
function SummaryCard({
  icon,
  iconColor,
  label,
  value,
  subtitle,
  badge,
  gradientColors,
  index,
  onPress,
  C,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  subtitle?: string;
  badge?: string;
  gradientColors: readonly [string, string];
  index: number;
  onPress: () => void;
  C: ReturnType<typeof useTheme>;
}) {
  return (
    <Animated.View
      entering={Platform.OS !== "web" ? FadeInDown.delay(index * 100).springify() : undefined}
      style={styles.cardWrapper}
    >
      <Pressable
        onPress={() => { haptic(); onPress(); }}
        style={({ pressed }) => [
          { opacity: pressed ? 0.82 : 1, transform: pressed ? [{ scale: 0.98 }] : [] },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardIconRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
              <Ionicons name={icon} size={22} color={iconColor} />
            </View>
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>View</Text>
              <Ionicons name="chevron-forward" size={12} color={C.textSecondary} />
            </View>
          </View>
          <Text style={styles.cardValue}>{value}</Text>
          <Text style={styles.cardLabel}>{label}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
          {badge ? (
            <View style={[styles.badge, { backgroundColor: `${iconColor}18` }]}>
              <Text style={[styles.badgeText, { color: iconColor }]}>{badge}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: company } = useCompany();

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.textSecondary} />
        <Text style={styles.errorText}>Unable to load dashboard</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => { haptic(); refetch(); }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const companyName = company?.name || "BizLedger";

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={C.tint}
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInUp.delay(50).springify() : undefined}
          style={styles.headerRow}
        >
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={1}>{companyName}</Text>
            <Text style={styles.subtitle}>Business Overview</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.settingsBtn, { backgroundColor: C.surface }, pressed && { opacity: 0.7 }]}
            onPress={() => { haptic(); router.push("/settings"); }}
          >
            <Ionicons name="settings-outline" size={20} color={C.tint} />
          </Pressable>
        </Animated.View>

        {/* Count badges — tap to navigate to the respective tab */}
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}
          style={styles.countsRow}
        >
          <CountBadge
            icon="pricetag"
            label="Products"
            count={data.counts.products}
            onPress={() => router.push({ pathname: "/(tabs)/stock", params: { filter: "all" } })}
            C={C}
          />
          <CountBadge
            icon="people"
            label="Customers"
            count={data.counts.customers}
            onPress={() => router.push({ pathname: "/(tabs)/customers", params: { filter: "all" } })}
            C={C}
          />
          <CountBadge
            icon="cube"
            label="Suppliers"
            count={data.counts.suppliers}
            onPress={() => router.push({ pathname: "/(tabs)/suppliers", params: { filter: "all" } })}
            C={C}
          />
        </Animated.View>

        {/* Summary cards */}
        <View style={styles.cardsGrid}>
          {/* Stock Quantity — tap → stock tab (all) */}
          <SummaryCard
            icon="layers"
            iconColor="#0D7377"
            label="Stock Quantity"
            value={formatQty(data.stock.totalQty)}
            subtitle={`${data.stock.inStockCount} in stock · ${data.stock.outOfStockCount} out of stock`}
            gradientColors={["#E0F7F7", "#F0FDFD"] as const}
            index={0}
            onPress={() => router.push({ pathname: "/(tabs)/stock", params: { filter: "all" } })}
            C={C}
          />

          {/* Stock Value — tap → stock tab (in-stock only) */}
          <SummaryCard
            icon="wallet"
            iconColor="#D4A843"
            label="Stock Value (Cost)"
            value={formatCurrency(data.stock.totalCostValue)}
            subtitle={`Sale value: ${formatCurrency(data.stock.totalSaleValue)}`}
            gradientColors={["#FEF9E7", "#FFFDF5"] as const}
            index={1}
            onPress={() => router.push({ pathname: "/(tabs)/stock", params: { filter: "instock" } })}
            C={C}
          />

          {/* Customer Outstanding — tap → customers tab (outstanding only) */}
          <SummaryCard
            icon="arrow-down-circle"
            iconColor="#EF4444"
            label="Customer Outstanding"
            value={formatCurrency(data.customerOutstanding)}
            badge="Receivable"
            gradientColors={["#FEF2F2", "#FFF5F5"] as const}
            index={2}
            onPress={() => router.push({ pathname: "/(tabs)/customers", params: { filter: "outstanding" } })}
            C={C}
          />

          {/* Supplier Outstanding — tap → suppliers tab (outstanding only) */}
          <SummaryCard
            icon="arrow-up-circle"
            iconColor="#3B82F6"
            label="Supplier Outstanding"
            value={formatCurrency(data.supplierOutstanding)}
            badge="Payable"
            gradientColors={["#EFF6FF", "#F5F9FF"] as const}
            index={3}
            onPress={() => router.push({ pathname: "/(tabs)/suppliers", params: { filter: "outstanding" } })}
            C={C}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  scrollContent: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: { flex: 1 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 3,
    marginBottom: 20,
  },
  countsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  countBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  countValue: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
  },
  countLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  countChevron: {
    marginLeft: "auto" as any,
  },
  cardsGrid: { gap: 12 },
  cardWrapper: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  card: { borderRadius: 20, padding: 20 },
  cardIconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tapHintText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 3,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  errorText: { fontSize: 16, color: Colors.light.textSecondary },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
