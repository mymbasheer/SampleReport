/**
 * Shared document detail screen used by both CustomerDetailScreen
 * and SupplierDetailScreen. Eliminates ~250 lines of duplication.
 */
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/lib/useTheme";
import { getQueryFn } from "@/lib/query-client";
import { useCompany } from "@/lib/company";
import { formatCurrency, formatDate } from "@/lib/format";
import { printAndShare } from "@/lib/pdf";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { ExpandableDocumentRow } from "@/components/DocumentLineItems";
import { escHtml, baseStyles, reportHeader, reportFooter } from "@/lib/pdfHelpers";

export interface DocItem {
  id: number;
  number: string;
  date: string;
  total: number;
  typeName: string;
  paid: number;
  balance: number;
}

interface Props {
  id: string;
  name: string;
  /** "customer" | "supplier" */
  type: "customer" | "supplier";
}

function DocumentRow({ item, accentColor }: { item: DocItem; accentColor: string }) {
  const C = useTheme();
  const hasBalance = item.balance > 0;

  return (
    <View style={[styles.docRow, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.docLeft}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: hasBalance ? accentColor : C.positive },
          ]}
        />
        <View style={styles.docInfo}>
          <Text style={[styles.docNumber, { color: C.text }]}>{item.number}</Text>
          <Text style={[styles.docType, { color: C.tint }]}>{item.typeName}</Text>
          <Text style={[styles.docDate, { color: C.textSecondary }]}>
            {formatDate(item.date)}
          </Text>
        </View>
      </View>
      <View style={styles.docRight}>
        <Text style={[styles.docTotal, { color: C.text }]}>
          {formatCurrency(item.total)}
        </Text>
        <Text style={[styles.docPaid, { color: C.positive }]}>
          Paid: {formatCurrency(item.paid)}
        </Text>
        <Text
          style={[
            styles.docBalance,
            { color: hasBalance ? accentColor : C.textSecondary },
          ]}
        >
          Bal: {formatCurrency(item.balance)}
        </Text>
      </View>
    </View>
  );
}

export function DocumentDetailScreen({ id, name, type }: Props) {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { data: company } = useCompany();

  const isCustomer = type === "customer";
  const accentColor = isCustomer ? C.negative : C.supplierAccent;
  const apiPath = isCustomer
    ? `/api/customer/${id}/documents`
    : `/api/supplier/${id}/documents`;
  const totalLabel = isCustomer ? "Total Sales" : "Total Purchases";
  const emptyText = isCustomer ? "No sales documents found" : "No purchase documents found";

  const { data, isLoading, refetch, isRefetching } = useQuery<DocItem[]>({
    queryKey: [apiPath],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const totalBalance = data?.reduce((sum, d) => sum + d.balance, 0) ?? 0;
  const totalAmount = data?.reduce((sum, d) => sum + d.total, 0) ?? 0;

  const handleExport = async () => {
    if (!data?.length || !company) return;
    const rows = data.map((item, idx) => {
      const hasBalance = item.balance > 0;
      const badge = hasBalance
        ? `<span class="status-badge ${isCustomer ? "badge-red" : "badge-blue"}">Outstanding</span>`
        : `<span class="status-badge badge-green">Settled</span>`;
      return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td><strong>${escHtml(item.number)}</strong></td>
          <td>${escHtml(item.typeName)}</td>
          <td>${escHtml(formatDate(item.date))}</td>
          <td class="center">${badge}</td>
          <td class="right">${formatCurrency(item.total)}</td>
          <td class="right" style="color:#10B981">${formatCurrency(item.paid)}</td>
          <td class="right" style="${hasBalance ? `color:${isCustomer ? "#EF4444" : "#3B82F6"};font-weight:700` : ""}">
            ${formatCurrency(item.balance)}
          </td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${isCustomer ? "Customer" : "Supplier"} Detail</title>${baseStyles()}
    </head><body>
      ${reportHeader(company,
        `${isCustomer ? "Customer" : "Supplier"} Document History`,
        escHtml(name)
      )}
      <div class="summary-row">
        <div class="summary-chip">
          <div class="chip-label">${totalLabel}</div>
          <div class="chip-value">${formatCurrency(totalAmount)}</div>
        </div>
        <div class="summary-chip ${isCustomer ? "red" : "blue"}">
          <div class="chip-label">Outstanding</div>
          <div class="chip-value">${formatCurrency(totalBalance)}</div>
        </div>
        <div class="summary-chip">
          <div class="chip-label">Documents</div>
          <div class="chip-value">${data.length}</div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th class="center">#</th>
          <th>Document No.</th>
          <th>Type</th>
          <th>Date</th>
          <th class="center">Status</th>
          <th class="right">Total</th>
          <th class="right">Paid</th>
          <th class="right">Balance</th>
        </tr></thead>
        <tbody>
          ${rows}
          <tr class="totals-row">
            <td colspan="5"><strong>TOTAL</strong></td>
            <td class="right"><strong>${formatCurrency(totalAmount)}</strong></td>
            <td></td>
            <td class="right"><strong>${formatCurrency(totalBalance)}</strong></td>
          </tr>
        </tbody>
      </table>
      ${reportFooter(data.length, "documents")}
    </body></html>`;

    await printAndShare(html, `${isCustomer ? "Customer" : "Supplier"}-${name}-Detail.pdf`);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12 + webTopInset,
            backgroundColor: C.surface,
            borderBottomColor: C.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={C.tint} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: C.text }]} numberOfLines={1}>
            {name || (isCustomer ? "Customer" : "Supplier")}
          </Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>
            {totalLabel}: {formatCurrency(totalAmount)} · Outstanding:{" "}
            <Text style={{ color: accentColor, fontWeight: "700" }}>
              {formatCurrency(totalBalance)}
            </Text>
          </Text>
        </View>
        {data && data.length > 0 && (
          <ExportPdfButton onExport={handleExport} label="PDF" />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ExpandableDocumentRow documentId={item.id} documentNumber={item.number}>
              <DocumentRow item={item} accentColor={accentColor} />
            </ExpandableDocumentRow>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={C.tint}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color={C.textSecondary}
              />
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                {emptyText}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 11, marginTop: 3 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 },
  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  docLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  docInfo: { flex: 1 },
  docNumber: { fontSize: 13, fontWeight: "600" },
  docType: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  docDate: { fontSize: 10, marginTop: 2 },
  docRight: { alignItems: "flex-end" },
  docTotal: { fontSize: 14, fontWeight: "700" },
  docPaid: { fontSize: 10, fontWeight: "500", marginTop: 2 },
  docBalance: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14 },
});
