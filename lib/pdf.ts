/**
 * PDF generation using expo-print + expo-sharing.
 *
 * Works on iOS, Android, and Web (web triggers a browser print dialog).
 * All reports are generated as HTML then printed/saved as PDF on-device.
 */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import { CompanyInfo } from "./company";
import { formatCurrency, formatQty } from "./format";
import { escHtml, baseStyles, reportHeader, reportFooter } from "./pdfHelpers";

// Helpers imported from pdfHelpers

// ── Print / Share ─────────────────────────────────────────────────────────────

export async function printAndShare(html: string, filename: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      // Web: open print dialog in a new window
      const printWindow = globalThis.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
      return;
    }

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Save ${filename}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      // Fallback: open the print dialog directly
      await Print.printAsync({ uri });
    }
  } catch (err: any) {
    Alert.alert("Export Failed", err.message || "Could not generate PDF.");
  }
}

// ── Stock Report ──────────────────────────────────────────────────────────────

export interface StockItem {
  id: number;
  name: string;
  code: string;
  unit: string;
  price: number;
  cost: number;
  quantity: number;
  costValue: number;
  saleValue: number;
}

export function generateStockPdf(
  items: StockItem[],
  company: CompanyInfo,
  filterLabel: string
): string {
  const totalQty = items.reduce((s, i) => s + Math.max(i.quantity, 0), 0);
  const totalCostValue = items.reduce((s, i) => s + Math.max(i.costValue, 0), 0);
  const totalSaleValue = items.reduce((s, i) => s + Math.max(i.saleValue, 0), 0);
  const inStockCount = items.filter((i) => i.quantity > 0).length;
  const outCount = items.filter((i) => i.quantity <= 0).length;

  const rows = items.map((item, idx) => {
    const isOut = item.quantity <= 0;
    const isLow = item.quantity > 0 && item.quantity <= 5;
    const badge = isOut
      ? `<span class="status-badge badge-red">Out</span>`
      : isLow
      ? `<span class="status-badge badge-amber">Low</span>`
      : `<span class="status-badge badge-green">In Stock</span>`;

    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td><strong>${escHtml(item.name)}</strong></td>
        <td>${escHtml(item.code) || "—"}</td>
        <td>${escHtml(item.unit) || "—"}</td>
        <td class="center">${badge}</td>
        <td class="right">${formatQty(item.quantity)}</td>
        <td class="right">${formatCurrency(item.cost)}</td>
        <td class="right">${formatCurrency(item.price)}</td>
        <td class="right">${formatCurrency(Math.max(item.costValue, 0))}</td>
        <td class="right">${formatCurrency(Math.max(item.saleValue, 0))}</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Stock Report</title>${baseStyles()}
  </head><body>
    ${reportHeader(company, "Stock Report", filterLabel)}
    <div class="summary-row">
      <div class="summary-chip">
        <div class="chip-label">Total Items</div>
        <div class="chip-value">${items.length}</div>
      </div>
      <div class="summary-chip badge-green">
        <div class="chip-label">In Stock</div>
        <div class="chip-value">${inStockCount}</div>
      </div>
      <div class="summary-chip red">
        <div class="chip-label">Out of Stock</div>
        <div class="chip-value">${outCount}</div>
      </div>
      <div class="summary-chip amber">
        <div class="chip-label">Total Qty</div>
        <div class="chip-value">${formatQty(totalQty)}</div>
      </div>
      <div class="summary-chip">
        <div class="chip-label">Cost Value</div>
        <div class="chip-value">${formatCurrency(totalCostValue)}</div>
      </div>
      <div class="summary-chip amber">
        <div class="chip-label">Sale Value</div>
        <div class="chip-value">${formatCurrency(totalSaleValue)}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th class="center">#</th>
        <th>Product Name</th>
        <th>Code</th>
        <th>Unit</th>
        <th class="center">Status</th>
        <th class="right">Qty</th>
        <th class="right">Cost</th>
        <th class="right">Price</th>
        <th class="right">Cost Value</th>
        <th class="right">Sale Value</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="totals-row">
          <td colspan="5"><strong>TOTAL</strong></td>
          <td class="right"><strong>${formatQty(totalQty)}</strong></td>
          <td></td><td></td>
          <td class="right"><strong>${formatCurrency(totalCostValue)}</strong></td>
          <td class="right"><strong>${formatCurrency(totalSaleValue)}</strong></td>
        </tr>
      </tbody>
    </table>
    ${reportFooter(items.length, "products")}
  </body></html>`;
}

// ── Customer Report ───────────────────────────────────────────────────────────

export interface CustomerItem {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalSales: number;
  totalPaid: number;
  outstanding: number;
}

export function generateCustomerPdf(
  items: CustomerItem[],
  company: CompanyInfo,
  filterLabel: string
): string {
  const totalSales = items.reduce((s, c) => s + c.totalSales, 0);
  const totalPaid = items.reduce((s, c) => s + c.totalPaid, 0);
  const totalOutstanding = items.reduce((s, c) => s + c.outstanding, 0);
  const outstandingCount = items.filter((c) => c.outstanding > 0).length;

  const rows = items.map((item, idx) => {
    const hasOutstanding = item.outstanding > 0;
    const badge = hasOutstanding
      ? `<span class="status-badge badge-red">Outstanding</span>`
      : `<span class="status-badge badge-green">Settled</span>`;

    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>
          <strong>${escHtml(item.name)}</strong>
          ${item.code ? `<br><span style="color:#6B7280;font-size:9px;">#${escHtml(item.code)}</span>` : ""}
        </td>
        <td>${escHtml(item.phone) || "—"}</td>
        <td>${escHtml(item.email) || "—"}</td>
        <td class="center">${badge}</td>
        <td class="right">${formatCurrency(item.totalSales)}</td>
        <td class="right">${formatCurrency(item.totalPaid)}</td>
        <td class="right" style="${hasOutstanding ? "color:#EF4444;font-weight:700;" : ""}">
          ${formatCurrency(item.outstanding)}
        </td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Customer Report</title>${baseStyles()}
  </head><body>
    ${reportHeader(company, "Customer Report", filterLabel)}
    <div class="summary-row">
      <div class="summary-chip">
        <div class="chip-label">Total Customers</div>
        <div class="chip-value">${items.length}</div>
      </div>
      <div class="summary-chip red">
        <div class="chip-label">With Outstanding</div>
        <div class="chip-value">${outstandingCount}</div>
      </div>
      <div class="summary-chip">
        <div class="chip-label">Total Sales</div>
        <div class="chip-value">${formatCurrency(totalSales)}</div>
      </div>
      <div class="summary-chip">
        <div class="chip-label">Total Paid</div>
        <div class="chip-value">${formatCurrency(totalPaid)}</div>
      </div>
      <div class="summary-chip red">
        <div class="chip-label">Total Outstanding</div>
        <div class="chip-value">${formatCurrency(totalOutstanding)}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th class="center">#</th>
        <th>Customer</th>
        <th>Phone</th>
        <th>Email</th>
        <th class="center">Status</th>
        <th class="right">Total Sales</th>
        <th class="right">Paid</th>
        <th class="right">Outstanding</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="totals-row">
          <td colspan="5"><strong>TOTAL</strong></td>
          <td class="right"><strong>${formatCurrency(totalSales)}</strong></td>
          <td class="right"><strong>${formatCurrency(totalPaid)}</strong></td>
          <td class="right"><strong>${formatCurrency(totalOutstanding)}</strong></td>
        </tr>
      </tbody>
    </table>
    ${reportFooter(items.length, "customers")}
  </body></html>`;
}

// ── Supplier Report ───────────────────────────────────────────────────────────

export interface SupplierItem {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalPurchases: number;
  totalPaid: number;
  outstanding: number;
}

export function generateSupplierPdf(
  items: SupplierItem[],
  company: CompanyInfo,
  filterLabel: string
): string {
  const totalPurchases = items.reduce((s, c) => s + c.totalPurchases, 0);
  const totalPaid = items.reduce((s, c) => s + c.totalPaid, 0);
  const totalOutstanding = items.reduce((s, c) => s + c.outstanding, 0);
  const outstandingCount = items.filter((c) => c.outstanding > 0).length;

  const rows = items.map((item, idx) => {
    const hasOutstanding = item.outstanding > 0;
    const badge = hasOutstanding
      ? `<span class="status-badge badge-blue">Payable</span>`
      : `<span class="status-badge badge-green">Settled</span>`;

    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>
          <strong>${escHtml(item.name)}</strong>
          ${item.code ? `<br><span style="color:#6B7280;font-size:9px;">#${escHtml(item.code)}</span>` : ""}
        </td>
        <td>${escHtml(item.phone) || "—"}</td>
        <td>${escHtml(item.email) || "—"}</td>
        <td class="center">${badge}</td>
        <td class="right">${formatCurrency(item.totalPurchases)}</td>
        <td class="right">${formatCurrency(item.totalPaid)}</td>
        <td class="right" style="${hasOutstanding ? "color:#3B82F6;font-weight:700;" : ""}">
          ${formatCurrency(item.outstanding)}
        </td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Supplier Report</title>${baseStyles()}
  </head><body>
    ${reportHeader(company, "Supplier Report", filterLabel)}
    <div class="summary-row">
      <div class="summary-chip">
        <div class="chip-label">Total Suppliers</div>
        <div class="chip-value">${items.length}</div>
      </div>
      <div class="summary-chip blue">
        <div class="chip-label">With Payable</div>
        <div class="chip-value">${outstandingCount}</div>
      </div>
      <div class="summary-chip">
        <div class="chip-label">Total Purchases</div>
        <div class="chip-value">${formatCurrency(totalPurchases)}</div>
      </div>
      <div class="summary-chip">
        <div class="chip-label">Total Paid</div>
        <div class="chip-value">${formatCurrency(totalPaid)}</div>
      </div>
      <div class="summary-chip blue">
        <div class="chip-label">Total Payable</div>
        <div class="chip-value">${formatCurrency(totalOutstanding)}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th class="center">#</th>
        <th>Supplier</th>
        <th>Phone</th>
        <th>Email</th>
        <th class="center">Status</th>
        <th class="right">Total Purchases</th>
        <th class="right">Paid</th>
        <th class="right">Outstanding</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="totals-row">
          <td colspan="5"><strong>TOTAL</strong></td>
          <td class="right"><strong>${formatCurrency(totalPurchases)}</strong></td>
          <td class="right"><strong>${formatCurrency(totalPaid)}</strong></td>
          <td class="right"><strong>${formatCurrency(totalOutstanding)}</strong></td>
        </tr>
      </tbody>
    </table>
    ${reportFooter(items.length, "suppliers")}
  </body></html>`;
}
