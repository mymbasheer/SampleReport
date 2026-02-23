/**
 * Shared PDF HTML helpers — used by both lib/pdf.ts and
 * components/DocumentDetailScreen.tsx so styles are consistent.
 */
import { CompanyInfo, formatCompanyAddress } from "./company";

export function escHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function baseStyles(): string {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
        font-size: 11px;
        color: #1A1D26;
        background: #fff;
        padding: 20px 24px;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #0D7377;
        padding-bottom: 14px;
        margin-bottom: 18px;
      }
      .company-name { font-size: 18px; font-weight: 800; color: #0D7377; letter-spacing: -0.3px; }
      .company-meta { font-size: 10px; color: #6B7280; margin-top: 2px; }
      .report-title { font-size: 14px; font-weight: 700; color: #1A1D26; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      .report-subtitle { font-size: 11px; color: #6B7280; margin-top: 3px; }
      .report-date { font-size: 9px; color: #9CA3AF; margin-top: 4px; }
      .summary-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
      .summary-chip { flex: 1; min-width: 120px; background: #F5F7FA; border-radius: 8px; padding: 10px 14px; border-left: 3px solid #0D7377; }
      .summary-chip.red { border-left-color: #EF4444; }
      .summary-chip.blue { border-left-color: #3B82F6; }
      .summary-chip.amber { border-left-color: #D4A843; }
      .chip-label { font-size: 9px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.4px; }
      .chip-value { font-size: 14px; font-weight: 700; color: #1A1D26; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      thead tr { background: #0D7377; color: #fff; }
      thead th { padding: 8px 10px; text-align: left; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
      thead th.right { text-align: right; }
      thead th.center { text-align: center; }
      tbody tr:nth-child(even) { background: #F9FAFB; }
      tbody td { padding: 7px 10px; border-bottom: 1px solid #E5E7EB; vertical-align: middle; }
      tbody td.right { text-align: right; font-variant-numeric: tabular-nums; }
      tbody td.center { text-align: center; }
      .status-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
      .badge-green { background: #D1FAE5; color: #065F46; }
      .badge-red   { background: #FEE2E2; color: #991B1B; }
      .badge-amber { background: #FEF3C7; color: #92400E; }
      .badge-blue  { background: #DBEAFE; color: #1E40AF; }
      .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 9px; color: #9CA3AF; }
      .totals-row td { font-weight: 700; background: #E0F7F7 !important; border-top: 2px solid #0D7377; color: #1A1D26; }
      @media print { body { padding: 10px; } thead { display: table-header-group; } tbody tr { page-break-inside: avoid; } }
    </style>
  `;
}

export function reportHeader(
  company: CompanyInfo,
  title: string,
  subtitle?: string
): string {
  const address = formatCompanyAddress(company);
  const now = new Date().toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  return `
    <div class="header">
      <div class="company-name">${escHtml(company.name || "BizLedger")}</div>
      ${address ? `<div class="company-meta">${escHtml(address)}</div>` : ""}
      ${company.phone ? `<div class="company-meta">Tel: ${escHtml(company.phone)}</div>` : ""}
      ${company.email ? `<div class="company-meta">${escHtml(company.email)}</div>` : ""}
      ${company.taxNumber ? `<div class="company-meta">Tax No: ${escHtml(company.taxNumber)}</div>` : ""}
      <div class="report-title">${escHtml(title)}</div>
      ${subtitle ? `<div class="report-subtitle">${escHtml(subtitle)}</div>` : ""}
      <div class="report-date">Generated: ${now}</div>
    </div>`;
}

export function reportFooter(recordCount: number, label: string): string {
  return `
    <div class="footer">
      <span>BizLedger — Aronium POS Report Viewer</span>
      <span>${recordCount} ${label}</span>
    </div>`;
}
