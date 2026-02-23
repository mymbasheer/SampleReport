import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useTheme } from "@/lib/useTheme";
import { getQueryFn } from "@/lib/query-client";
import { formatCurrency } from "@/lib/format";
import { useCompany } from "@/lib/company";
import { generateCustomerPdf, printAndShare } from "@/lib/pdf";
import { ExportPdfButton } from "@/components/ExportPdfButton";

type CustomerFilter = "all" | "outstanding";

interface CustomerItem {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalSales: number;
  totalPaid: number;
  outstanding: number;
}

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function CustomerRow({ item, C }: { item: CustomerItem; C: ReturnType<typeof useTheme> }) {
  const hasOutstanding = item.outstanding > 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={() => {
        haptic();
        router.push({
          pathname: "/customer-detail/[id]",
          params: { id: item.id.toString(), name: item.name },
        });
      }}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.avatar, hasOutstanding && styles.avatarWarning]}>
          <Ionicons
            name="person"
            size={20}
            color={hasOutstanding ? C.negative : C.tint}
          />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          {item.code ? <Text style={styles.rowCode}>#{item.code}</Text> : null}
          {item.phone ? <Text style={styles.rowCode}>{item.phone}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text
          style={[
            styles.outstandingValue,
            hasOutstanding && { color: C.negative },
          ]}
        >
          {formatCurrency(item.outstanding)}
        </Text>
        <Text style={styles.rowSubtext}>Outstanding</Text>
        <Text style={styles.rowSubtext}>Sales: {formatCurrency(item.totalSales)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
    </Pressable>
  );
}

export default function CustomersScreen() {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const params = useLocalSearchParams<{ filter?: string }>();

  const [activeFilter, setActiveFilter] = useState<CustomerFilter>(
    (params.filter as CustomerFilter) || "all"
  );
  const [search, setSearch] = useState("");

  const { data: company } = useCompany();

  const { data, isLoading, refetch, isRefetching } = useQuery<CustomerItem[]>({
    queryKey: ["/api/customers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleExport = async () => {
    if (!filtered.length || !company) return;
    const filterLabel =
      activeFilter === "outstanding" ? "Outstanding Customers" :
      search ? `Search: "${search}"` : "All Customers";
    const html = generateCustomerPdf(filtered, company, filterLabel);
    await printAndShare(html, "Customer-Report.pdf");
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data;

    if (activeFilter === "outstanding") list = list.filter((c) => c.outstanding > 0);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }
    return list;
  }, [data, activeFilter, search]);

  const totalOutstanding = filtered.reduce((sum, c) => sum + c.outstanding, 0);
  const outstandingCount = data?.filter((c) => c.outstanding > 0).length ?? 0;

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  const filterTabs: { key: CustomerFilter; label: string; count: number }[] = [
    { key: "all", label: "All Customers", count: data?.length ?? 0 },
    { key: "outstanding", label: "Outstanding", count: outstandingCount },
  ];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 + webTopInset, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Customer Report</Text>
          <ExportPdfButton onExport={handleExport} />
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: C.background }]}>
          <Ionicons name="search" size={16} color={C.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search name, code or phone..."
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && Platform.OS !== "ios" && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={C.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
              onPress={() => { haptic(); setActiveFilter(tab.key); }}
            >
              <Text style={[styles.filterTabText, activeFilter === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.filterBadge, activeFilter === tab.key && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, activeFilter === tab.key && styles.filterBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: "#FEF2F2" }]}>
            <Ionicons name="arrow-down-circle" size={13} color={C.negative} />
            <Text style={[styles.summaryText, { color: C.negative }]}>
              Outstanding: {formatCurrency(totalOutstanding)}
            </Text>
          </View>
          {filtered.length !== data?.length && (
            <View style={styles.summaryChip}>
              <Ionicons name="funnel" size={13} color={C.textSecondary} />
              <Text style={styles.summaryText}>{filtered.length} shown</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <CustomerRow item={item} C={C} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.tint} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={search ? "search-outline" : "people-outline"}
              size={48}
              color={C.textSecondary}
            />
            <Text style={styles.emptyText}>
              {search
                ? `No customers matching "${search}"`
                : activeFilter === "outstanding"
                ? "No outstanding customers"
                : "No customers found"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "800", color: Colors.light.text, letterSpacing: -0.5 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.light.text, padding: 0 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.light.background,
  },
  filterTabActive: { backgroundColor: Colors.light.tint },
  filterTabText: { fontSize: 12, fontWeight: "600", color: Colors.light.textSecondary },
  filterTabTextActive: { color: "#fff" },
  filterBadge: { backgroundColor: Colors.light.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.light.textSecondary },
  filterBadgeTextActive: { color: "#fff" },
  summaryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  summaryText: { fontSize: 12, fontWeight: "600", color: Colors.light.text },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E0F7F7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarWarning: { backgroundColor: "#FEF2F2" },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "600", color: Colors.light.text },
  rowCode: { fontSize: 11, color: Colors.light.textSecondary, marginTop: 2 },
  rowRight: { alignItems: "flex-end" },
  outstandingValue: { fontSize: 15, fontWeight: "700", color: Colors.light.positive },
  rowSubtext: { fontSize: 11, color: Colors.light.textSecondary, marginTop: 1 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.light.textSecondary, textAlign: "center" },
});
