/**
 * Expandable line-items panel shown inside a document row.
 * Tapping a document row toggles this to show the products on that invoice.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  View, Text, Pressable, ActivityIndicator, StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/useTheme";
import { getQueryFn } from "@/lib/query-client";
import { formatCurrency, formatQty } from "@/lib/format";

interface LineItem {
  id: number;
  productName: string;
  productCode: string;
  unit: string;
  quantity: number;
  price: number;
  cost: number;
  discount: number;
  total: number;
}

interface Props {
  documentId: number;
  documentNumber: string;
  onClose: () => void;
}

export function DocumentLineItems({ documentId, documentNumber, onClose }: Props) {
  const C = useTheme();
  const { data, isLoading } = useQuery<LineItem[]>({
    queryKey: [`/api/document/${documentId}/items`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const totalRevenue = data?.reduce((s, i) => s + i.total, 0) ?? 0;
  const totalCogs    = data?.reduce((s, i) => s + i.cost * i.quantity, 0) ?? 0;
  const grossProfit  = totalRevenue - totalCogs;

  return (
    <View style={[styles.container, { backgroundColor: C.background, borderColor: C.border }]}>
      {/* Header row */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <View style={[styles.docTag, { backgroundColor: C.tint + "18" }]}>
          <Ionicons name="document-text" size={13} color={C.tint} />
          <Text style={[styles.docNumber, { color: C.tint }]}>{documentNumber}</Text>
        </View>
        <Text style={[styles.headerTitle, { color: C.textSecondary }]}>Line Items</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="chevron-up" size={18} color={C.textSecondary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={C.tint} />
      ) : !data?.length ? (
        <Text style={[styles.empty, { color: C.textSecondary }]}>No items found</Text>
      ) : (
        <>
          {/* Column headers */}
          <View style={[styles.colHeaders, { borderBottomColor: C.border }]}>
            <Text style={[styles.colH, { color: C.textSecondary, flex: 2 }]}>Product</Text>
            <Text style={[styles.colH, { color: C.textSecondary }]}>Qty</Text>
            <Text style={[styles.colH, { color: C.textSecondary }]}>Price</Text>
            <Text style={[styles.colH, { color: C.textSecondary }]}>Total</Text>
          </View>

          {/* Item rows */}
          {data.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                { borderBottomColor: C.border },
                idx % 2 === 1 && { backgroundColor: C.background + "80" },
              ]}
            >
              <View style={{ flex: 2 }}>
                <Text style={[styles.itemName, { color: C.text }]} numberOfLines={2}>
                  {item.productName}
                </Text>
                {item.productCode ? (
                  <Text style={[styles.itemCode, { color: C.textSecondary }]}>
                    {item.productCode}
                    {item.unit ? ` · ${item.unit}` : ""}
                  </Text>
                ) : null}
                {item.discount > 0 ? (
                  <Text style={[styles.itemDiscount, { color: C.warning }]}>
                    Disc: {item.discount}%
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.itemQty, { color: C.text }]}>
                {formatQty(item.quantity)}
              </Text>
              <Text style={[styles.itemPrice, { color: C.textSecondary }]}>
                {formatCurrency(item.price)}
              </Text>
              <Text style={[styles.itemTotal, { color: C.text }]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}

          {/* Totals footer */}
          <View style={[styles.totalsRow, { borderTopColor: C.tint, backgroundColor: C.stockInBg }]}>
            <Text style={[styles.totalsLabel, { color: C.tint }]}>
              {data.length} item{data.length !== 1 ? "s" : ""}
            </Text>
            <View style={styles.totalsRight}>
              <View style={styles.totalItem}>
                <Text style={[styles.totalKey, { color: C.textSecondary }]}>Revenue</Text>
                <Text style={[styles.totalVal, { color: C.text }]}>{formatCurrency(totalRevenue)}</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalKey, { color: C.textSecondary }]}>COGS</Text>
                <Text style={[styles.totalVal, { color: C.negative }]}>{formatCurrency(totalCogs)}</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalKey, { color: C.textSecondary }]}>Profit</Text>
                <Text style={[styles.totalVal, { color: grossProfit >= 0 ? C.positive : C.negative, fontWeight: "700" }]}>
                  {formatCurrency(grossProfit)}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

// ── Wrapper used inside DocumentDetailScreen rows ─────────────────────────────
export function ExpandableDocumentRow({
  children,
  documentId,
  documentNumber,
}: {
  children: React.ReactNode;
  documentId: number;
  documentNumber: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const C = useTheme();

  return (
    <View>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {children}
        {/* Expand hint */}
        <View style={[styles.expandHint, { borderTopColor: C.border }]}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={12}
            color={C.textSecondary}
          />
          <Text style={[styles.expandText, { color: C.textSecondary }]}>
            {expanded ? "Hide items" : "View items"}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <DocumentLineItems
          documentId={documentId}
          documentNumber={documentNumber}
          onClose={() => setExpanded(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  docTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docNumber: { fontSize: 11, fontWeight: "700" },
  headerTitle: { flex: 1, fontSize: 11, fontWeight: "600" },
  closeBtn: { padding: 4 },
  loader: { paddingVertical: 20 },
  empty: { textAlign: "center", paddingVertical: 16, fontSize: 12 },
  colHeaders: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 8,
  },
  colH: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, flex: 1 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  itemName: { fontSize: 12, fontWeight: "600" },
  itemCode: { fontSize: 10, marginTop: 1 },
  itemDiscount: { fontSize: 10, marginTop: 1 },
  itemQty: { fontSize: 12, fontWeight: "600", flex: 1, textAlign: "right" },
  itemPrice: { fontSize: 11, flex: 1, textAlign: "right" },
  itemTotal: { fontSize: 12, fontWeight: "700", flex: 1, textAlign: "right" },
  totalsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 2,
    gap: 8,
  },
  totalsLabel: { fontSize: 11, fontWeight: "700" },
  totalsRight: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  totalItem: { alignItems: "flex-end" },
  totalKey: { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.3 },
  totalVal: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  expandHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderTopWidth: 1,
    gap: 4,
  },
  expandText: { fontSize: 10, fontWeight: "600" },
});
