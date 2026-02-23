import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  Platform, Pressable, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/lib/useTheme";
import { getQueryFn } from "@/lib/query-client";
import { useCompany } from "@/lib/company";
import { formatCurrency, formatQty } from "@/lib/format";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { printAndShare } from "@/lib/pdf";
import { escHtml, baseStyles, reportHeader, reportFooter } from "@/lib/pdfHelpers";

type ReportTab = "sales" | "purchases" | "payments" | "pnl" | "voids" | "zreport" | "inventory";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SummaryChip({
  label, value, color, bg,
}: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderLeftColor: color }]}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const C = useTheme();
  return <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{title}</Text>;
}

function MonthRow({
  month, txns, total, extra, extraLabel, extraColor,
}: {
  month: string; txns: number; total: number;
  extra?: number; extraLabel?: string; extraColor?: string;
}) {
  const C = useTheme();
  const [year, mon] = month.split("-");
  const monthName = new Date(`${year}-${mon}-01`).toLocaleString("default", { month: "short" });

  return (
    <View style={[styles.monthRow, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.monthBadge, { backgroundColor: C.background }]}>
        <Text style={[styles.monthMon, { color: C.tint }]}>{monthName}</Text>
        <Text style={[styles.monthYear, { color: C.textSecondary }]}>{year}</Text>
      </View>
      <View style={styles.monthInfo}>
        <Text style={[styles.monthTotal, { color: C.text }]}>{formatCurrency(total)}</Text>
        <Text style={[styles.monthSub, { color: C.textSecondary }]}>{txns} transactions</Text>
      </View>
      {extra !== undefined && (
        <View style={styles.monthExtra}>
          <Text style={[styles.monthExtraVal, { color: extraColor || C.tint }]}>
            {formatCurrency(extra)}
          </Text>
          <Text style={[styles.monthSub, { color: C.textSecondary }]}>{extraLabel}</Text>
        </View>
      )}
    </View>
  );
}

function TopRow({
  rank, name, code, value, sub,
}: { rank: number; name: string; code?: string; value: string; sub: string }) {
  const C = useTheme();
  return (
    <View style={[styles.topRow, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.rankBadge, { backgroundColor: rank <= 3 ? C.tint : C.background }]}>
        <Text style={[styles.rankText, { color: rank <= 3 ? "#fff" : C.textSecondary }]}>
          {rank}
        </Text>
      </View>
      <View style={styles.topInfo}>
        <Text style={[styles.topName, { color: C.text }]} numberOfLines={1}>{name}</Text>
        {code ? <Text style={[styles.topCode, { color: C.textSecondary }]}>{code}</Text> : null}
      </View>
      <View style={styles.topRight}>
        <Text style={[styles.topValue, { color: C.tint }]}>{value}</Text>
        <Text style={[styles.monthSub, { color: C.textSecondary }]}>{sub}</Text>
      </View>
    </View>
  );
}

// ── Report panels ─────────────────────────────────────────────────────────────

function SalesReport() {
  const C = useTheme();
  const { data: company } = useCompany();
  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ["/api/reports/sales"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleExport = async () => {
    if (!data || !company) return;
    const { monthly, totals, topProducts } = data;

    const monthRows = monthly.map((m: any, i: number) => `
      <tr>
        <td>${escHtml(m.month)}</td>
        <td class="right">${m.txns}</td>
        <td class="right">${formatCurrency(m.total)}</td>
        <td class="right" style="color:#10B981">${formatCurrency(m.paid)}</td>
        <td class="right" style="color:#EF4444">${formatCurrency(m.outstanding)}</td>
      </tr>`).join("");

    const prodRows = topProducts.map((p: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${escHtml(p.name)}</td>
        <td class="right">${formatQty(p.qty)}</td>
        <td class="right">${formatCurrency(p.revenue)}</td>
        <td class="right">${p.txns}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Sales Report</title>${baseStyles()}
    </head><body>
      ${reportHeader(company, "Sales Report", "All Time")}
      <div class="summary-row">
        <div class="summary-chip"><div class="chip-label">Total Transactions</div><div class="chip-value">${totals?.totalTxns ?? 0}</div></div>
        <div class="summary-chip"><div class="chip-label">Total Revenue</div><div class="chip-value">${formatCurrency(totals?.totalRevenue ?? 0)}</div></div>
        <div class="summary-chip"><div class="chip-label">Total Paid</div><div class="chip-value">${formatCurrency(totals?.totalPaid ?? 0)}</div></div>
        <div class="summary-chip red"><div class="chip-label">Outstanding</div><div class="chip-value">${formatCurrency(totals?.totalOutstanding ?? 0)}</div></div>
        <div class="summary-chip"><div class="chip-label">Unique Customers</div><div class="chip-value">${totals?.uniqueCustomers ?? 0}</div></div>
      </div>
      <h3 style="margin:16px 0 8px;font-size:11px;text-transform:uppercase;color:#6B7280;letter-spacing:0.4px">Monthly Breakdown</h3>
      <table>
        <thead><tr><th>Month</th><th class="right">Txns</th><th class="right">Revenue</th><th class="right">Paid</th><th class="right">Outstanding</th></tr></thead>
        <tbody>${monthRows}</tbody>
      </table>
      <h3 style="margin:20px 0 8px;font-size:11px;text-transform:uppercase;color:#6B7280;letter-spacing:0.4px">Top Products by Revenue</h3>
      <table>
        <thead><tr><th class="center">#</th><th>Product</th><th class="right">Qty Sold</th><th class="right">Revenue</th><th class="right">Txns</th></tr></thead>
        <tbody>${prodRows}</tbody>
      </table>
      ${reportFooter(monthly.length, "months")}
    </body></html>`;

    await printAndShare(html, "Sales-Report.pdf");
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={C.tint} />;

  const { monthly = [], totals = {}, topProducts = [] } = data || {};

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.tint} />}
      contentContainerStyle={styles.reportContent}
    >
      {/* Summary chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          <SummaryChip label="Transactions" value={String(totals.totalTxns ?? 0)} color={C.tint} bg={C.stockInBg} />
          <SummaryChip label="Revenue" value={formatCurrency(totals.totalRevenue ?? 0)} color={C.tint} bg={C.stockInBg} />
          <SummaryChip label="Paid" value={formatCurrency(totals.totalPaid ?? 0)} color={C.positive} bg="#D1FAE5" />
          <SummaryChip label="Outstanding" value={formatCurrency(totals.totalOutstanding ?? 0)} color={C.negative} bg={C.stockOutBg} />
          <SummaryChip label="Customers" value={String(totals.uniqueCustomers ?? 0)} color={C.accent} bg={C.stockLowBg} />
        </View>
      </ScrollView>

      {/* Export */}
      <View style={styles.exportRow}>
        <ExportPdfButton onExport={handleExport} label="Export Sales PDF" />
      </View>

      {/* Monthly breakdown */}
      <SectionTitle title="Monthly Revenue" />
      {monthly.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>No sales data found</Text>
      ) : (
        monthly.map((m: any) => (
          <MonthRow
            key={m.month}
            month={m.month}
            txns={m.txns}
            total={m.total}
            extra={m.outstanding}
            extraLabel="Outstanding"
            extraColor={C.negative}
          />
        ))
      )}

      {/* Top products */}
      {topProducts.length > 0 && (
        <>
          <SectionTitle title="Top Products by Revenue" />
          {topProducts.map((p: any, i: number) => (
            <TopRow
              key={p.name}
              rank={i + 1}
              name={p.name}
              code={p.code}
              value={formatCurrency(p.revenue)}
              sub={`${formatQty(p.qty)} units · ${p.txns} txns`}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function PurchasesReport() {
  const C = useTheme();
  const { data: company } = useCompany();
  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ["/api/reports/purchases"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleExport = async () => {
    if (!data || !company) return;
    const { monthly, totals, topSuppliers } = data;

    const monthRows = monthly.map((m: any) => `
      <tr>
        <td>${escHtml(m.month)}</td>
        <td class="right">${m.txns}</td>
        <td class="right">${formatCurrency(m.total)}</td>
        <td class="right" style="color:#10B981">${formatCurrency(m.paid)}</td>
        <td class="right" style="color:#3B82F6">${formatCurrency(m.outstanding)}</td>
      </tr>`).join("");

    const suppRows = topSuppliers.map((s: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${escHtml(s.name)}</td>
        <td class="right">${s.txns}</td>
        <td class="right">${formatCurrency(s.total)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Purchase Report</title>${baseStyles()}
    </head><body>
      ${reportHeader(company, "Purchase Report", "All Time")}
      <div class="summary-row">
        <div class="summary-chip"><div class="chip-label">Transactions</div><div class="chip-value">${totals?.totalTxns ?? 0}</div></div>
        <div class="summary-chip blue"><div class="chip-label">Total Spend</div><div class="chip-value">${formatCurrency(totals?.totalSpend ?? 0)}</div></div>
        <div class="summary-chip"><div class="chip-label">Total Paid</div><div class="chip-value">${formatCurrency(totals?.totalPaid ?? 0)}</div></div>
        <div class="summary-chip blue"><div class="chip-label">Payable</div><div class="chip-value">${formatCurrency(totals?.totalOutstanding ?? 0)}</div></div>
        <div class="summary-chip"><div class="chip-label">Suppliers</div><div class="chip-value">${totals?.uniqueSuppliers ?? 0}</div></div>
      </div>
      <h3 style="margin:16px 0 8px;font-size:11px;text-transform:uppercase;color:#6B7280;letter-spacing:0.4px">Monthly Breakdown</h3>
      <table>
        <thead><tr><th>Month</th><th class="right">Txns</th><th class="right">Total</th><th class="right">Paid</th><th class="right">Payable</th></tr></thead>
        <tbody>${monthRows}</tbody>
      </table>
      ${topSuppliers.length > 0 ? `
      <h3 style="margin:20px 0 8px;font-size:11px;text-transform:uppercase;color:#6B7280;letter-spacing:0.4px">Top Suppliers</h3>
      <table>
        <thead><tr><th class="center">#</th><th>Supplier</th><th class="right">Transactions</th><th class="right">Total</th></tr></thead>
        <tbody>${suppRows}</tbody>
      </table>` : ""}
      ${reportFooter(monthly.length, "months")}
    </body></html>`;

    await printAndShare(html, "Purchase-Report.pdf");
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={C.tint} />;

  const { monthly = [], totals = {}, topSuppliers = [] } = data || {};

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.tint} />}
      contentContainerStyle={styles.reportContent}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          <SummaryChip label="Transactions" value={String(totals.totalTxns ?? 0)} color={C.supplierAccent} bg={C.chipSupplier} />
          <SummaryChip label="Total Spend" value={formatCurrency(totals.totalSpend ?? 0)} color={C.supplierAccent} bg={C.chipSupplier} />
          <SummaryChip label="Paid" value={formatCurrency(totals.totalPaid ?? 0)} color={C.positive} bg="#D1FAE5" />
          <SummaryChip label="Payable" value={formatCurrency(totals.totalOutstanding ?? 0)} color={C.supplierAccent} bg={C.chipSupplier} />
          <SummaryChip label="Suppliers" value={String(totals.uniqueSuppliers ?? 0)} color={C.accent} bg={C.stockLowBg} />
        </View>
      </ScrollView>

      <View style={styles.exportRow}>
        <ExportPdfButton onExport={handleExport} label="Export Purchases PDF" />
      </View>

      <SectionTitle title="Monthly Purchases" />
      {monthly.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>No purchase data found</Text>
      ) : (
        monthly.map((m: any) => (
          <MonthRow
            key={m.month}
            month={m.month}
            txns={m.txns}
            total={m.total}
            extra={m.outstanding}
            extraLabel="Payable"
            extraColor={C.supplierAccent}
          />
        ))
      )}

      {topSuppliers.length > 0 && (
        <>
          <SectionTitle title="Top Suppliers by Spend" />
          {topSuppliers.map((s: any, i: number) => (
            <TopRow
              key={s.name}
              rank={i + 1}
              name={s.name}
              code={s.code}
              value={formatCurrency(s.total)}
              sub={`${s.txns} transactions`}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function PaymentsReport() {
  const C = useTheme();
  const { data: company } = useCompany();
  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ["/api/reports/payments"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const COLORS = ["#0D7377", "#3B82F6", "#D4A843", "#10B981", "#EF4444", "#8B5CF6", "#F59E0B"];

  const handleExport = async () => {
    if (!data || !company) return;
    const rows = data.methods.map((m: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${escHtml(m.method)}</td>
        <td class="right">${m.count}</td>
        <td class="right">${formatCurrency(m.total)}</td>
        <td class="right">${m.percentage}%</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Payment Methods Report</title>${baseStyles()}
    </head><body>
      ${reportHeader(company, "Payment Methods Report")}
      <div class="summary-row">
        <div class="summary-chip"><div class="chip-label">Total Received</div><div class="chip-value">${formatCurrency(data.grandTotal)}</div></div>
        <div class="summary-chip"><div class="chip-label">Payment Methods</div><div class="chip-value">${data.methods.length}</div></div>
      </div>
      <table>
        <thead><tr><th class="center">#</th><th>Payment Method</th><th class="right">Transactions</th><th class="right">Amount</th><th class="right">Share</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${reportFooter(data.methods.length, "payment methods")}
    </body></html>`;
    await printAndShare(html, "Payment-Methods-Report.pdf");
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={C.tint} />;
  const { methods = [], grandTotal = 0 } = data || {};

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.tint} />}
      contentContainerStyle={styles.reportContent}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          <SummaryChip label="Total Received" value={formatCurrency(grandTotal)} color={C.tint} bg={C.stockInBg} />
          <SummaryChip label="Methods" value={String(methods.length)} color={C.accent} bg={C.stockLowBg} />
        </View>
      </ScrollView>

      <View style={styles.exportRow}>
        <ExportPdfButton onExport={handleExport} label="Export Payments PDF" />
      </View>

      <SectionTitle title="Breakdown by Method" />
      {methods.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>No payment data found</Text>
      ) : (
        methods.map((m: any, i: number) => {
          const color = COLORS[i % COLORS.length];
          const pct = parseFloat(m.percentage);
          return (
            <View key={m.method} style={[styles.payRow, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.payDot, { backgroundColor: color }]} />
              <View style={styles.payInfo}>
                <Text style={[styles.payMethod, { color: C.text }]}>{m.method}</Text>
                <Text style={[styles.monthSub, { color: C.textSecondary }]}>{m.count} transactions</Text>
                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                </View>
              </View>
              <View style={styles.payRight}>
                <Text style={[styles.payAmount, { color: C.text }]}>{formatCurrency(m.total)}</Text>
                <Text style={[styles.payPct, { color }]}>{m.percentage}%</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function PnLReport() {
  const C = useTheme();
  const { data: company } = useCompany();
  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ["/api/reports/pnl"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleExport = async () => {
    if (!data || !company) return;
    const rows = data.monthly.map((m: any) => {
      const margin = m.revenue > 0 ? ((m.grossProfit / m.revenue) * 100).toFixed(1) : "0.0";
      return `
        <tr>
          <td>${escHtml(m.month)}</td>
          <td class="right">${formatCurrency(m.revenue)}</td>
          <td class="right">${formatCurrency(m.cogs)}</td>
          <td class="right" style="color:#10B981;font-weight:700">${formatCurrency(m.grossProfit)}</td>
          <td class="right">${margin}%</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Profit & Loss Report</title>${baseStyles()}
    </head><body>
      ${reportHeader(company, "Profit & Loss Report")}
      <div class="summary-row">
        <div class="summary-chip"><div class="chip-label">Revenue</div><div class="chip-value">${formatCurrency(data.totals?.totalRevenue ?? 0)}</div></div>
        <div class="summary-chip"><div class="chip-label">Cost of Goods</div><div class="chip-value">${formatCurrency(data.totals?.totalCOGS ?? 0)}</div></div>
        <div class="summary-chip"><div class="chip-label">Gross Profit</div><div class="chip-value">${formatCurrency(data.totals?.grossProfit ?? 0)}</div></div>
        <div class="summary-chip"><div class="chip-label">Gross Margin</div><div class="chip-value">${data.totals?.margin ?? "0.0"}%</div></div>
      </div>
      <table>
        <thead><tr><th>Month</th><th class="right">Revenue</th><th class="right">COGS</th><th class="right">Gross Profit</th><th class="right">Margin</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${reportFooter(data.monthly.length, "months")}
    </body></html>`;
    await printAndShare(html, "PnL-Report.pdf");
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={C.tint} />;
  const { monthly = [], totals = {} } = data || {};

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.tint} />}
      contentContainerStyle={styles.reportContent}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          <SummaryChip label="Revenue" value={formatCurrency(totals.totalRevenue ?? 0)} color={C.tint} bg={C.stockInBg} />
          <SummaryChip label="COGS" value={formatCurrency(totals.totalCOGS ?? 0)} color={C.negative} bg={C.stockOutBg} />
          <SummaryChip label="Gross Profit" value={formatCurrency(totals.grossProfit ?? 0)} color={C.positive} bg="#D1FAE5" />
          <SummaryChip label="Margin" value={`${totals.margin ?? "0.0"}%`} color={C.accent} bg={C.stockLowBg} />
        </View>
      </ScrollView>

      <View style={styles.exportRow}>
        <ExportPdfButton onExport={handleExport} label="Export P&L PDF" />
      </View>

      <SectionTitle title="Monthly Profit & Loss" />
      {monthly.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>No sales data for P&L calculation</Text>
      ) : (
        monthly.map((m: any) => {
          const isProfit = m.grossProfit >= 0;
          const margin = m.revenue > 0 ? ((m.grossProfit / m.revenue) * 100).toFixed(1) : "0.0";
          const [year, mon] = m.month.split("-");
          const monthName = new Date(`${year}-${mon}-01`).toLocaleString("default", { month: "short" });
          return (
            <View key={m.month} style={[styles.pnlRow, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.monthBadge, { backgroundColor: C.background }]}>
                <Text style={[styles.monthMon, { color: C.tint }]}>{monthName}</Text>
                <Text style={[styles.monthYear, { color: C.textSecondary }]}>{year}</Text>
              </View>
              <View style={styles.pnlInfo}>
                <View style={styles.pnlLine}>
                  <Text style={[styles.pnlLabel, { color: C.textSecondary }]}>Revenue</Text>
                  <Text style={[styles.pnlVal, { color: C.text }]}>{formatCurrency(m.revenue)}</Text>
                </View>
                <View style={styles.pnlLine}>
                  <Text style={[styles.pnlLabel, { color: C.textSecondary }]}>COGS</Text>
                  <Text style={[styles.pnlVal, { color: C.negative }]}>−{formatCurrency(m.cogs)}</Text>
                </View>
                <View style={[styles.pnlLine, styles.pnlTotal]}>
                  <Text style={[styles.pnlLabel, { color: isProfit ? C.positive : C.negative, fontWeight: "700" }]}>
                    Gross Profit
                  </Text>
                  <Text style={[styles.pnlVal, { color: isProfit ? C.positive : C.negative, fontWeight: "700" }]}>
                    {formatCurrency(m.grossProfit)} ({margin}%)
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function VoidsReport() {
  const C = useTheme();
  const { data: company } = useCompany();
  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ["/api/reports/voids"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleExport = async () => {
    if (!data || !company) return;
    const rows = (data.voids || []).map((v: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${v.date ? new Date(v.date).toLocaleDateString() : "—"}</td>
        <td>${escHtml(v.productName) || "—"}</td>
        <td>${escHtml(v.productCode) || "—"}</td>
        <td class="right">${formatCurrency(v.total)}</td>
        <td>${escHtml(v.reason) || "—"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Void Report</title>${baseStyles()}
    </head><body>
      ${reportHeader(company, "Void / Cancelled Items Report")}
      <div class="summary-row">
        <div class="summary-chip red"><div class="chip-label">Total Voids</div><div class="chip-value">${data.summary?.count ?? 0}</div></div>
        <div class="summary-chip red"><div class="chip-label">Total Value Voided</div><div class="chip-value">${formatCurrency(data.summary?.total ?? 0)}</div></div>
      </div>
      ${rows ? `<table>
        <thead><tr><th class="center">#</th><th>Date</th><th>Product</th><th>Code</th><th class="right">Total</th><th>Reason</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : "<p style='color:#6B7280;font-size:12px'>No void records found.</p>"}
      ${reportFooter(data.voids?.length ?? 0, "voids")}
    </body></html>`;
    await printAndShare(html, "Void-Report.pdf");
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={C.tint} />;
  const { voids = [], summary = {} } = data || {};

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.tint} />}
      contentContainerStyle={styles.reportContent}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          <SummaryChip label="Total Voids" value={String(summary.count ?? 0)} color={C.negative} bg={C.stockOutBg} />
          <SummaryChip label="Value Voided" value={formatCurrency(summary.total ?? 0)} color={C.negative} bg={C.stockOutBg} />
        </View>
      </ScrollView>

      <View style={styles.exportRow}>
        <ExportPdfButton onExport={handleExport} label="Export Voids PDF" />
      </View>

      <SectionTitle title="Voided Transactions" />
      {voids.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="checkmark-circle-outline" size={48} color={C.positive} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>No voided transactions</Text>
        </View>
      ) : (
        voids.map((v: any) => (
          <View key={v.id} style={[styles.voidRow, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.voidDot, { backgroundColor: C.negative }]} />
            <View style={styles.voidInfo}>
              <Text style={[styles.voidProduct, { color: C.text }]}>{v.productName || "Unknown Product"}</Text>
              {v.productCode ? <Text style={[styles.topCode, { color: C.textSecondary }]}>{v.productCode}</Text> : null}
              {v.date && <Text style={[styles.monthSub, { color: C.textSecondary }]}>{new Date(v.date).toLocaleDateString()}</Text>}
              {v.reason && <Text style={[styles.monthSub, { color: C.textSecondary }]}>Reason: {v.reason}</Text>}
            </View>
            <Text style={[styles.voidAmount, { color: C.negative }]}>{formatCurrency(v.total)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}


function ZReportPanel() {
  const C = useTheme();
  const { data: company } = useCompany();
  const { data, isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["/api/reports/zreport"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleExport = async () => {
    if (!data?.length || !company) return;
    const rows = data.map((z: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${escHtml(z.date ? new Date(z.date).toLocaleString() : "—")}</td>
        <td class="right">${z.salesCount}</td>
        <td class="right">${formatCurrency(z.salesTotal)}</td>
        <td class="right" style="color:#EF4444">${formatCurrency(z.refundTotal)}</td>
        <td class="right" style="color:#10B981;font-weight:700">${formatCurrency(z.netTotal)}</td>
        <td>${(z.payments || []).map((p: any) => escHtml(p.method) + ": " + formatCurrency(p.total)).join(" | ")}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Z-Report</title>${baseStyles()}
    </head><body>
      ${reportHeader(company, "Z-Report / Daily Closing")}
      <table>
        <thead><tr>
          <th class="center">#</th><th>Date/Time</th><th class="right">Sales</th>
          <th class="right">Revenue</th><th class="right">Refunds</th>
          <th class="right">Net Total</th><th>Payments</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${reportFooter(data.length, "Z-reports")}
    </body></html>`;
    await printAndShare(html, "Z-Report.pdf");
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={C.tint} />;

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.tint} />}
      contentContainerStyle={styles.reportContent}
    >
      <View style={styles.exportRow}>
        <ExportPdfButton onExport={handleExport} label="Export Z-Report PDF" />
      </View>
      <SectionTitle title="Daily Closing Records" />
      {!data?.length ? (
        <View style={styles.emptyBox}>
          <Ionicons name="receipt-outline" size={48} color={C.textSecondary} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>No Z-reports found</Text>
        </View>
      ) : (
        data.map((z: any) => (
          <View key={z.id} style={[styles.monthRow, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.monthBadge, { backgroundColor: C.background }]}>
              <Ionicons name="receipt" size={20} color={C.tint} />
              <Text style={[styles.monthYear, { color: C.textSecondary }]}>#{z.id}</Text>
            </View>
            <View style={styles.monthInfo}>
              <Text style={[styles.monthTotal, { color: C.text }]}>{formatCurrency(z.netTotal)}</Text>
              <Text style={[styles.monthSub, { color: C.textSecondary }]}>
                {z.salesCount} sales · Refunds: {formatCurrency(z.refundTotal)}
              </Text>
              {z.date ? (
                <Text style={[styles.monthSub, { color: C.textSecondary }]}>
                  {new Date(z.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </Text>
              ) : null}
            </View>
            <View style={styles.monthExtra}>
              <Text style={[styles.monthExtraVal, { color: C.positive }]}>
                {formatCurrency(z.salesTotal)}
              </Text>
              <Text style={[styles.monthSub, { color: C.textSecondary }]}>Revenue</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function InventoryReportPanel() {
  const C = useTheme();
  const { data: company } = useCompany();
  const { data, isLoading, refetch, isRefetching } = useQuery<any>({
    queryKey: ["/api/reports/inventory"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleExport = async () => {
    if (!data || !company) return;
    const ldRows = (data.lossAndDamage || []).map((d: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${escHtml(d.number)}</td>
        <td>${d.date ? new Date(d.date).toLocaleDateString() : "—"}</td>
        <td class="right">${d.itemCount}</td>
        <td class="right" style="color:#EF4444">${formatCurrency(d.total)}</td>
      </tr>`).join("");

    const icRows = (data.inventoryCount || []).map((d: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${escHtml(d.number)}</td>
        <td>${d.date ? new Date(d.date).toLocaleDateString() : "—"}</td>
        <td class="right">${d.itemCount}</td>
        <td class="right">${formatCurrency(d.total)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Inventory Report</title>${baseStyles()}
    </head><body>
      ${reportHeader(company, "Inventory & Loss Report")}
      <div class="summary-row">
        <div class="summary-chip red">
          <div class="chip-label">Loss & Damage Records</div>
          <div class="chip-value">${data.ldSummary?.count ?? 0}</div>
        </div>
        <div class="summary-chip red">
          <div class="chip-label">Total Loss Value</div>
          <div class="chip-value">${formatCurrency(data.ldSummary?.total ?? 0)}</div>
        </div>
        <div class="summary-chip">
          <div class="chip-label">Inventory Counts</div>
          <div class="chip-value">${(data.inventoryCount || []).length}</div>
        </div>
      </div>
      ${ldRows ? `<h3 style="margin:16px 0 8px;font-size:11px;text-transform:uppercase;color:#6B7280">Loss & Damage</h3>
      <table>
        <thead><tr><th class="center">#</th><th>Document</th><th>Date</th><th class="right">Items</th><th class="right">Total Loss</th></tr></thead>
        <tbody>${ldRows}</tbody>
      </table>` : ""}
      ${icRows ? `<h3 style="margin:20px 0 8px;font-size:11px;text-transform:uppercase;color:#6B7280">Inventory Counts</h3>
      <table>
        <thead><tr><th class="center">#</th><th>Document</th><th>Date</th><th class="right">Items</th><th class="right">Total</th></tr></thead>
        <tbody>${icRows}</tbody>
      </table>` : ""}
      ${reportFooter((data.lossAndDamage?.length ?? 0) + (data.inventoryCount?.length ?? 0), "records")}
    </body></html>`;
    await printAndShare(html, "Inventory-Loss-Report.pdf");
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={C.tint} />;
  const { lossAndDamage = [], inventoryCount = [], ldSummary = {} } = data || {};

  const DocCard = ({ doc, isLoss }: { doc: any; isLoss: boolean }) => (
    <View style={[styles.monthRow, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.monthBadge, { backgroundColor: isLoss ? C.stockOutBg : C.stockInBg }]}>
        <Ionicons name={isLoss ? "warning" : "clipboard"} size={18} color={isLoss ? C.negative : C.tint} />
      </View>
      <View style={styles.monthInfo}>
        <Text style={[styles.monthTotal, { color: C.text }]}>{doc.number}</Text>
        <Text style={[styles.monthSub, { color: C.textSecondary }]}>
          {doc.date ? new Date(doc.date).toLocaleDateString() : "—"} · {doc.itemCount} item{doc.itemCount !== 1 ? "s" : ""}
        </Text>
      </View>
      <Text style={[styles.monthExtraVal, { color: isLoss ? C.negative : C.tint }]}>
        {formatCurrency(doc.total)}
      </Text>
    </View>
  );

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.tint} />}
      contentContainerStyle={styles.reportContent}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          <SummaryChip label="Loss Records" value={String(ldSummary.count ?? 0)} color={C.negative} bg={C.stockOutBg} />
          <SummaryChip label="Total Loss" value={formatCurrency(ldSummary.total ?? 0)} color={C.negative} bg={C.stockOutBg} />
          <SummaryChip label="Inventory Counts" value={String(inventoryCount.length)} color={C.tint} bg={C.stockInBg} />
        </View>
      </ScrollView>

      <View style={styles.exportRow}>
        <ExportPdfButton onExport={handleExport} label="Export Inventory PDF" />
      </View>

      <SectionTitle title="Loss & Damage" />
      {lossAndDamage.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="checkmark-circle-outline" size={40} color={C.positive} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>No loss & damage records</Text>
        </View>
      ) : (
        lossAndDamage.map((d: any) => <DocCard key={d.id} doc={d} isLoss={true} />)
      )}

      <SectionTitle title="Inventory Counts" />
      {inventoryCount.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="clipboard-outline" size={40} color={C.textSecondary} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>No inventory count records</Text>
        </View>
      ) : (
        inventoryCount.map((d: any) => <DocCard key={d.id} doc={d} isLoss={false} />)
      )}
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const TABS: { key: ReportTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "sales",     label: "Sales",     icon: "trending-up" },
  { key: "purchases", label: "Purchases", icon: "cart" },
  { key: "payments",  label: "Payments",  icon: "card" },
  { key: "pnl",       label: "P&L",       icon: "analytics" },
  { key: "voids",     label: "Voids",     icon: "close-circle" },
  { key: "zreport",   label: "Z-Report",  icon: "receipt" },
  { key: "inventory", label: "Inventory", icon: "clipboard" },
];

export default function ReportsScreen() {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16 + webTopInset,
            backgroundColor: C.surface,
            borderBottomColor: C.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: C.text }]}>Reports</Text>

        {/* Report type tabs — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, active && { backgroundColor: C.tint }]}
                onPress={() => { haptic(); setActiveTab(tab.key); }}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={active ? "#fff" : C.textSecondary}
                />
                <Text style={[styles.tabText, { color: active ? "#fff" : C.textSecondary }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {activeTab === "sales"     && <SalesReport />}
      {activeTab === "purchases" && <PurchasesReport />}
      {activeTab === "payments"  && <PaymentsReport />}
      {activeTab === "pnl"       && <PnLReport />}
      {activeTab === "voids"     && <VoidsReport />}
      {activeTab === "zreport"   && <ZReportPanel />}
      {activeTab === "inventory" && <InventoryReportPanel />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  tabsContainer: { gap: 8, paddingRight: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: { fontSize: 12, fontWeight: "600" },
  reportContent: { padding: 16, paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
  chipsScroll: { marginBottom: 4 },
  chipsRow: { flexDirection: "row", gap: 8 },
  chip: {
    minWidth: 100,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
  },
  chipLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  chipValue: { fontSize: 16, fontWeight: "800", marginTop: 3 },
  exportRow: { marginBottom: 16, alignItems: "flex-start" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 10,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  monthBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  monthMon: { fontSize: 13, fontWeight: "700" },
  monthYear: { fontSize: 9, fontWeight: "500", marginTop: 1 },
  monthInfo: { flex: 1 },
  monthTotal: { fontSize: 15, fontWeight: "700" },
  monthSub: { fontSize: 10, marginTop: 2 },
  monthExtra: { alignItems: "flex-end" },
  monthExtraVal: { fontSize: 13, fontWeight: "700" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: { fontSize: 13, fontWeight: "800" },
  topInfo: { flex: 1 },
  topName: { fontSize: 13, fontWeight: "600" },
  topCode: { fontSize: 10, marginTop: 2 },
  topRight: { alignItems: "flex-end" },
  topValue: { fontSize: 14, fontWeight: "700" },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  payDot: { width: 12, height: 12, borderRadius: 6 },
  payInfo: { flex: 1 },
  payMethod: { fontSize: 14, fontWeight: "600" },
  progressTrack: { height: 5, borderRadius: 3, marginTop: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  payRight: { alignItems: "flex-end" },
  payAmount: { fontSize: 14, fontWeight: "700" },
  payPct: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  pnlRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  pnlInfo: { flex: 1 },
  pnlLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  pnlTotal: { borderTopWidth: 1, marginTop: 4, paddingTop: 6, borderColor: "#E5E7EB" },
  pnlLabel: { fontSize: 11 },
  pnlVal: { fontSize: 11 },
  voidRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
  },
  voidDot: { width: 10, height: 10, borderRadius: 5 },
  voidInfo: { flex: 1 },
  voidProduct: { fontSize: 13, fontWeight: "600" },
  voidAmount: { fontSize: 14, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", marginTop: 8 },
  emptyBox: { alignItems: "center", paddingTop: 40, gap: 8 },
});
