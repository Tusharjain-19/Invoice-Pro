'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { AppSettings, Invoice, Expense } from '@/types';
import type { ProfitMarginData } from './ProfitMarginMatrix';
import type { TaxLiabilityData } from './TaxLiabilityMatrix';
import type { PaymentModesData } from './PaymentModesBreakdown';
import type { TopProductItem } from './TopProductsMatrix';
import type { CustomerAgingData } from './CustomerAgingMatrix';
import type { FinancialGrowthMetric } from './GrowthMatrixView';

// Safe Currency formatting helper for PDF
const formatPDFCurrency = (amount: number) => {
  return `INR ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatShortCurrency = (amount: number) => {
  const val = Number(amount || 0);
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)} k`;
  return `₹${val.toFixed(0)}`;
};

export interface DesignerReportData {
  settings: AppSettings;
  periodLabel: string;
  dateWindow?: string;
  generatedDate: string;
  themeColor?: string; // defaults to #0f172a
  profitData: ProfitMarginData;
  taxData: TaxLiabilityData;
  paymentData: PaymentModesData;
  topProducts: TopProductItem[];
  agingData: CustomerAgingData;

  // Multi-page Auditor Engine extensions
  comparisonLabels?: {
    current: string;
    previous: string;
    previousType: string;
    yoy: string;
  };
  growthMetrics?: FinancialGrowthMetric[];
  salesRegister?: Invoice[];
  expensesList?: Expense[];
  currentMetrics?: {
    totalSales: number;
    cogs: number;
    grossProfit: number;
    grossMargin: number;
    fixedCosts: number;
    variableCosts: number;
    totalExpenses: number;
    netProfit: number;
    netMargin: number;
    totalTax: number;
    cgst: number;
    sgst: number;
    igst: number;
    orderCount: number;
    averageOrderValue: number;
    fixedBreakdown?: Record<string, number>;
    variableBreakdown?: Record<string, number>;
  };
}

// ----------------------------------------------------
// Auditor Minimal Theme Stylesheet (Obsidian Slate #0f172a)
// ----------------------------------------------------
const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },

  // Running Header & Footer
  runningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    marginBottom: 10,
    fontSize: 7,
    color: '#64748b',
  },
  runningFooter: {
    position: 'absolute',
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 6.5,
    color: '#94a3b8',
  },

  // Section Headers
  sectionHeaderBox: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 1.5,
  },

  // Page 1 Header Banner
  coverHeaderBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  companyDetails: {
    fontSize: 7.5,
    color: '#475569',
    marginTop: 2,
    lineHeight: 1.3,
  },
  reportDocBadge: {
    alignItems: 'flex-end',
  },
  reportMainTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  reportPeriodBadge: {
    marginTop: 3,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 7.5,
    fontWeight: 'bold',
  },

  // Narrative Card
  narrativeCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 7,
    marginBottom: 9,
  },
  narrativeText: {
    fontSize: 7.2,
    color: '#334155',
    lineHeight: 1.35,
  },

  // Scorecard Grid
  scorecardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 9,
  },
  scorecardTile: {
    width: '32%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
  },
  scorecardLabel: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scorecardValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  scorecardSubtext: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 1,
  },

  // Tables
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 9,
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 3.5,
    paddingHorizontal: 6,
  },
  tableHeaderCol: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableTotalsRow: {
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1.5,
    borderTopColor: '#0f172a',
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontWeight: 'bold',
  },

  // Visual Vector Graphs & Charts
  chartContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 7,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  barGroupRow: {
    marginBottom: 5,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.8,
    color: '#334155',
    marginBottom: 2,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFillCurrent: {
    backgroundColor: '#0f172a',
    height: '100%',
  },
  barFillPrevious: {
    backgroundColor: '#475569',
    height: '100%',
  },
  barFillYoY: {
    backgroundColor: '#94a3b8',
    height: '100%',
  },

  // Segmented Ribbon
  ribbonTrack: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 5,
  },
  ribbonLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 6.5,
    color: '#475569',
  },
  legendSwatch: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    marginRight: 3,
  },

  // Variance Badges
  variancePositive: {
    color: '#15803d',
    fontWeight: 'bold',
  },
  varianceNegative: {
    color: '#b91c1c',
    fontWeight: 'bold',
  },
  varianceNeutral: {
    color: '#475569',
  },

  // Sign-off Block
  signoffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  signoffBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 7,
    height: 65,
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
  },
  signoffTitle: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  signoffLine: {
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 3,
  },
  signoffName: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signoffRole: {
    fontSize: 6,
    color: '#64748b',
  },
});

// Running Header Component
const RunningHeader = ({ title, section, period, company }: { title: string; section: string; period: string; company: string }) => (
  <View style={styles.runningHeader} fixed>
    <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{company || 'INVOICEPRO ENTITY'} • STATUTORY FINANCIAL AUDIT</Text>
    <Text>{section} • {period}</Text>
  </View>
);

// Running Footer Component
const RunningFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.runningFooter} fixed>
    <Text>Official Statutory Management Audit • Strictly Confidential for Tax &amp; Board Review</Text>
    <Text>Powered by InvoicePro Auditor Engine</Text>
    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </View>
);

// ----------------------------------------------------
// Main Pro Auditor 10-Page PDF Document Component
// ----------------------------------------------------
export function DesignerReportPDFDocument({ data }: { data: DesignerReportData }) {
  const { settings, periodLabel, dateWindow, generatedDate, profitData, taxData, paymentData, topProducts, agingData, growthMetrics, comparisonLabels, salesRegister, expensesList, currentMetrics } = data;

  const company = settings.companyName || 'Business Enterprise';
  const gstin = settings.companyGstin || 'Unregistered / Exempt';
  const address = settings.companyAddress || 'Corporate Headquarters';
  const phone = settings.companyPhone || 'N/A';
  const state = settings.companyState || 'State Office';

  // Metrics
  const totalSales = currentMetrics?.totalSales ?? profitData.grossRevenue ?? 0;
  const cogs = currentMetrics?.cogs ?? profitData.cogs ?? 0;
  const grossProfit = currentMetrics?.grossProfit ?? profitData.grossProfit ?? 0;
  const grossMargin = currentMetrics?.grossMargin ?? profitData.grossMarginPct ?? 0;
  const fixedCosts = currentMetrics?.fixedCosts ?? 0;
  const variableCosts = currentMetrics?.variableCosts ?? 0;
  const totalExpenses = currentMetrics?.totalExpenses ?? profitData.operatingExpenses ?? 0;
  const netProfit = currentMetrics?.netProfit ?? profitData.netProfit ?? 0;
  const netMargin = currentMetrics?.netMargin ?? profitData.netMarginPct ?? 0;
  const orderCount = currentMetrics?.orderCount ?? profitData.totalOrders ?? 0;
  const averageOrderValue = currentMetrics?.averageOrderValue ?? profitData.averageOrderValue ?? 0;
  const totalTax = currentMetrics?.totalTax ?? taxData.totalTax ?? 0;

  // Unit economics percentages
  const safeSales = totalSales > 0 ? totalSales : 1;
  const cogsPct = (cogs / safeSales) * 100;
  const fixedPct = (fixedCosts / safeSales) * 100;
  const variablePct = (variableCosts / safeSales) * 100;
  const netProfitPct = (netProfit / safeSales) * 100;

  // Helper for variance text
  const renderVariance = (val: number) => {
    if (val > 0) return <Text style={styles.variancePositive}>+{val.toFixed(1)}%</Text>;
    if (val < 0) return <Text style={styles.varianceNegative}>{val.toFixed(1)}%</Text>;
    return <Text style={styles.varianceNeutral}>0.0%</Text>;
  };

  const TOTAL_PAGES = 10;

  return (
    <Document title={`Auditor_Report_${periodLabel}_${company}`}>
      {/* ============================================================== */}
      {/* PAGE 1: EXECUTIVE AUDITOR SUMMARY & PRIMARY SCORECARD           */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Executive Summary" section="Section 1: Executive Audit" period={periodLabel} company={company} />

        {/* Corporate Header Banner */}
        <View style={styles.coverHeaderBanner}>
          <View style={{ flex: 1.8 }}>
            <Text style={styles.companyName}>{company}</Text>
            <Text style={styles.companyDetails}>
              {address} • GSTIN: {gstin} • Tel: {phone} • State: {state}
            </Text>
          </View>
          <View style={[styles.reportDocBadge, { flex: 1.2 }]}>
            <Text style={styles.reportMainTitle}>STATUTORY AUDIT REPORT</Text>
            <Text style={{ fontSize: 6.5, color: '#64748b', marginTop: 1 }}>
              Official Auditor Verification Review
            </Text>
            <Text style={styles.reportPeriodBadge}>{periodLabel}</Text>
          </View>
        </View>

        {/* Metadata Strip */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6, backgroundColor: '#f8fafc', borderRadius: 3, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 10 }}>
          <Text style={{ fontSize: 7, color: '#334155' }}>
            <Text style={{ fontWeight: 'bold' }}>Reporting Window: </Text>{dateWindow || periodLabel}
          </Text>
          <Text style={{ fontSize: 7, color: '#334155' }}>
            <Text style={{ fontWeight: 'bold' }}>Generated On: </Text>{generatedDate}
          </Text>
          <Text style={{ fontSize: 7, color: '#334155' }}>
            <Text style={{ fontWeight: 'bold' }}>Auditor Ref: </Text>AUD-{new Date().getFullYear()}-{periodLabel.substring(0, 3).toUpperCase()}
          </Text>
        </View>

        {/* Executive Narrative */}
        <View style={styles.narrativeCard}>
          <Text style={[styles.narrativeText, { fontWeight: 'bold', color: '#0f172a', marginBottom: 2 }]}>
            EXECUTIVE AUDITOR OPINION &amp; OPERATIONAL SUMMARY:
          </Text>
          <Text style={styles.narrativeText}>
            This statutory management report reflects financial performance for {periodLabel}. Total recognized sales turnover stands at {formatPDFCurrency(totalSales)} with net operating surplus of {formatPDFCurrency(netProfit)} (net yield of {netMargin.toFixed(1)}%). Statutory tax liability under GST provisions totals {formatPDFCurrency(totalTax)}. Direct product procurement costs (COGS) absorbed {cogsPct.toFixed(1)}% of top-line revenue, leaving a gross contribution margin of {grossMargin.toFixed(1)}%. Fixed overheads and variable operating costs accounted for {fixedPct.toFixed(1)}% and {variablePct.toFixed(1)}% of turnover respectively.
          </Text>
        </View>

        {/* Primary Financial Scorecard */}
        <View style={styles.scorecardGrid}>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Gross Realized Turnover</Text>
            <Text style={styles.scorecardValue}>{formatPDFCurrency(totalSales)}</Text>
            <Text style={styles.scorecardSubtext}>{orderCount} invoices · AOV {formatPDFCurrency(averageOrderValue)}</Text>
          </View>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Gross Profit Margin</Text>
            <Text style={[styles.scorecardValue, { color: '#0f172a' }]}>{grossMargin.toFixed(1)}%</Text>
            <Text style={styles.scorecardSubtext}>{formatPDFCurrency(grossProfit)} contribution</Text>
          </View>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Net Operating Surplus</Text>
            <Text style={[styles.scorecardValue, { color: netProfit >= 0 ? '#15803d' : '#b91c1c' }]}>
              {formatPDFCurrency(netProfit)}
            </Text>
            <Text style={styles.scorecardSubtext}>{netMargin.toFixed(1)}% bottom line yield</Text>
          </View>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Total GST Tax Outflow</Text>
            <Text style={styles.scorecardValue}>{formatPDFCurrency(totalTax)}</Text>
            <Text style={styles.scorecardSubtext}>CGST/SGST/IGST verified</Text>
          </View>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Operating Overheads (OpEx)</Text>
            <Text style={styles.scorecardValue}>{formatPDFCurrency(totalExpenses)}</Text>
            <Text style={styles.scorecardSubtext}>Fixed {formatShortCurrency(fixedCosts)} · Variable {formatShortCurrency(variableCosts)}</Text>
          </View>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Debtors Outstanding</Text>
            <Text style={[styles.scorecardValue, { color: agingData.totalOverdue > 0 ? '#b91c1c' : '#15803d' }]}>
              {formatPDFCurrency(agingData.totalOverdue)}
            </Text>
            <Text style={styles.scorecardSubtext}>{(agingData.buckets || []).reduce((a, b) => a + b.count, 0)} pending bills</Text>
          </View>
        </View>

        {/* High-Level P&L Summary Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '40%' }]}>Accounting Line Item</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%', textAlign: 'right' }]}>Period Amount (INR)</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%', textAlign: 'right' }]}>% of Turnover</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%', textAlign: 'right' }]}>Per ₹100 Sold</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ width: '40%', fontWeight: 'bold' }}>Gross Recognized Sales (Turnover)</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(totalSales)}</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>100.0%</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>₹100.00</Text>
          </View>
          <View style={[styles.tableRow, styles.tableRowAlt]}>
            <Text style={{ width: '40%' }}>Less: Cost of Goods Sold (Procurement)</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>({formatPDFCurrency(cogs)})</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>{cogsPct.toFixed(1)}%</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>₹{cogsPct.toFixed(2)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ width: '40%', fontWeight: 'bold' }}>GROSS CONTRIBUTION MARGIN (CM1)</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(grossProfit)}</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>{grossMargin.toFixed(1)}%</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>₹{(100 - cogsPct).toFixed(2)}</Text>
          </View>
          <View style={[styles.tableRow, styles.tableRowAlt]}>
            <Text style={{ width: '40%' }}>Less: Fixed Administrative &amp; Establishment Overheads</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>({formatPDFCurrency(fixedCosts)})</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>{fixedPct.toFixed(1)}%</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>₹{fixedPct.toFixed(2)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={{ width: '40%' }}>Less: Variable Selling, Logistics &amp; Utilities</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>({formatPDFCurrency(variableCosts)})</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>{variablePct.toFixed(1)}%</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>₹{variablePct.toFixed(2)}</Text>
          </View>
          <View style={styles.tableTotalsRow}>
            <Text style={{ width: '40%', fontWeight: 'bold', color: '#0f172a' }}>NET OPERATING SURPLUS / PROFIT</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold', color: netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
              {formatPDFCurrency(netProfit)}
            </Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>{netMargin.toFixed(1)}%</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold', color: netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
              ₹{netProfitPct.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Verification Footer Notes */}
        <View style={{ marginTop: 'auto', padding: 5, backgroundColor: '#f1f5f9', borderRadius: 3, borderWidth: 1, borderColor: '#cbd5e1' }}>
          <Text style={{ fontSize: 6.5, color: '#475569', lineHeight: 1.3 }}>
            STATUTORY NOTE: Figures certified herein are compiled directly from source transactional vouchers recorded in the InvoicePro relational ledger. Continuing on subsequent pages: Section 2 (Growth Matrix &amp; Comparative Charts), Section 3 (Unit Economics), Section 4 (Sales Register), Section 5 (GST Tax Schedule), Section 6 (Expense Breakdown), and Section 7 (Statutory Attestation).
          </Text>
        </View>

        <RunningFooter pageNum={1} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 2: MULTI-PERIOD GROWTH & VARIANCE MATRIX (TABLE)          */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Growth Matrix" section="Section 2: Growth & Variance" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Section 2: Multi-Period Growth &amp; Variance Matrix</Text>
          <Text style={styles.sectionSubtitle}>
            Detailed comparison evaluating {comparisonLabels?.current || 'Current Period'} against {comparisonLabels?.previous || 'Prior Period'} (MoM) and {comparisonLabels?.yoy || 'Prior Year'} (YoY).
          </Text>
        </View>

        {/* Multi-Period Comparative Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '26%' }]}>Financial Metric</Text>
            <Text style={[styles.tableHeaderCol, { width: '18%', textAlign: 'right' }]}>Current ({comparisonLabels?.current || 'Current'})</Text>
            <Text style={[styles.tableHeaderCol, { width: '17%', textAlign: 'right' }]}>Prior ({comparisonLabels?.previous || 'Prior'})</Text>
            <Text style={[styles.tableHeaderCol, { width: '10%', textAlign: 'right' }]}>MoM %</Text>
            <Text style={[styles.tableHeaderCol, { width: '17%', textAlign: 'right' }]}>Prior Year ({comparisonLabels?.yoy || 'YoY'})</Text>
            <Text style={[styles.tableHeaderCol, { width: '12%', textAlign: 'right' }]}>YoY %</Text>
          </View>
          {(growthMetrics || []).map((m, idx) => {
            const momGrowth = m.previous !== 0 ? ((m.current - m.previous) / Math.abs(m.previous)) * 100 : (m.current > 0 ? 100 : 0);
            const yoyGrowth = m.yoy !== 0 ? ((m.current - m.yoy) / Math.abs(m.yoy)) * 100 : (m.current > 0 ? 100 : 0);
            return (
              <View key={m.key || idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={{ width: '26%', fontWeight: m.key === 'sales' || m.key === 'net_profit' ? 'bold' : 'normal' }}>
                  {m.name}
                </Text>
                <Text style={{ width: '18%', textAlign: 'right' }}>
                  {formatShortCurrency(m.current)}
                </Text>
                <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                  {formatShortCurrency(m.previous)}
                </Text>
                <View style={{ width: '10%', alignItems: 'flex-end' }}>
                  {renderVariance(momGrowth)}
                </View>
                <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                  {formatShortCurrency(m.yoy)}
                </Text>
                <View style={{ width: '12%', alignItems: 'flex-end' }}>
                  {renderVariance(yoyGrowth)}
                </View>
              </View>
            );
          })}
        </View>

        {/* Narrative Observations */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Auditor Variance Diagnostics</Text>
          <View style={{ gap: 4 }}>
            {(growthMetrics || []).slice(0, 4).map((m) => (
              <View key={m.key} style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#0f172a', width: '28%' }}>• {m.name}:</Text>
                <Text style={{ fontSize: 7, color: '#475569', width: '72%', lineHeight: 1.3 }}>{m.benchmarkText}</Text>
              </View>
            ))}
          </View>
        </View>

        <RunningFooter pageNum={2} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 3: GROWTH VECTOR CHARTS & TRAJECTORIES                    */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Growth Trajectory" section="Section 2 (Cont.): Growth Charts" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Visual Multi-Period Trajectory &amp; Growth Charts</Text>
          <Text style={styles.sectionSubtitle}>
            Horizontal vector benchmarking for sales, profit, operating costs, and tax liabilities.
          </Text>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Performance Comparison Graphs (Current vs MoM vs YoY)</Text>

          {/* Metric 1: Gross Sales */}
          <View style={styles.barGroupRow}>
            <View style={styles.barLabelRow}>
              <Text style={{ fontWeight: 'bold' }}>1. Gross Revenue Turnover</Text>
              <Text style={{ fontWeight: 'bold' }}>Current: {formatShortCurrency(totalSales)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFillCurrent, { width: '100%' }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 6, color: '#64748b', marginTop: 1.5 }}>
              <Text>Current: {formatShortCurrency(totalSales)}</Text>
              <Text>Prior MoM: {formatShortCurrency(growthMetrics?.find(g => g.key === 'sales')?.previous || 0)}</Text>
              <Text>Prior YoY: {formatShortCurrency(growthMetrics?.find(g => g.key === 'sales')?.yoy || 0)}</Text>
            </View>
          </View>

          {/* Metric 2: Gross Contribution */}
          <View style={styles.barGroupRow}>
            <View style={styles.barLabelRow}>
              <Text style={{ fontWeight: 'bold' }}>2. Gross Contribution Margin (CM1)</Text>
              <Text style={{ fontWeight: 'bold' }}>Current: {formatShortCurrency(grossProfit)} ({grossMargin.toFixed(1)}%)</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFillCurrent, { width: `${Math.min(100, Math.max(10, grossMargin))}%`, backgroundColor: '#334155' }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 6, color: '#64748b', marginTop: 1.5 }}>
              <Text>Current Contribution: {formatShortCurrency(grossProfit)}</Text>
              <Text>Prior MoM: {formatShortCurrency(growthMetrics?.find(g => g.key === 'gross_profit')?.previous || 0)}</Text>
              <Text>Prior YoY: {formatShortCurrency(growthMetrics?.find(g => g.key === 'gross_profit')?.yoy || 0)}</Text>
            </View>
          </View>

          {/* Metric 3: Operating Expenses */}
          <View style={styles.barGroupRow}>
            <View style={styles.barLabelRow}>
              <Text style={{ fontWeight: 'bold' }}>3. Operating Expenses (OpEx)</Text>
              <Text style={{ fontWeight: 'bold' }}>Current: {formatShortCurrency(totalExpenses)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFillPrevious, { width: `${Math.min(100, Math.max(10, (totalExpenses / safeSales) * 100))}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 6, color: '#64748b', marginTop: 1.5 }}>
              <Text>Fixed Overheads: {formatShortCurrency(fixedCosts)}</Text>
              <Text>Variable Costs: {formatShortCurrency(variableCosts)}</Text>
              <Text>Prior MoM OpEx: {formatShortCurrency(growthMetrics?.find(g => g.key === 'total_expenses')?.previous || 0)}</Text>
            </View>
          </View>

          {/* Metric 4: Net Operating Profit */}
          <View style={styles.barGroupRow}>
            <View style={styles.barLabelRow}>
              <Text style={{ fontWeight: 'bold' }}>4. Net Operating Surplus / Profit</Text>
              <Text style={{ fontWeight: 'bold', color: netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                Current: {formatShortCurrency(netProfit)} ({netMargin.toFixed(1)}%)
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFillCurrent, { width: `${Math.min(100, Math.max(5, (Math.max(0, netProfit) / safeSales) * 100))}%`, backgroundColor: netProfit >= 0 ? '#0f172a' : '#b91c1c' }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 6, color: '#64748b', marginTop: 1.5 }}>
              <Text>Net Margin: {netMargin.toFixed(1)}%</Text>
              <Text>Prior MoM Net: {formatShortCurrency(growthMetrics?.find(g => g.key === 'net_profit')?.previous || 0)}</Text>
              <Text>Prior YoY Net: {formatShortCurrency(growthMetrics?.find(g => g.key === 'net_profit')?.yoy || 0)}</Text>
            </View>
          </View>

          {/* Metric 5: Total GST Tax Liability */}
          <View style={styles.barGroupRow}>
            <View style={styles.barLabelRow}>
              <Text style={{ fontWeight: 'bold' }}>5. GST Tax Liability Outflow</Text>
              <Text style={{ fontWeight: 'bold' }}>Current: {formatShortCurrency(totalTax)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFillYoY, { width: `${Math.min(100, Math.max(5, (totalTax / safeSales) * 100))}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 6, color: '#64748b', marginTop: 1.5 }}>
              <Text>CGST: {formatShortCurrency(taxData.cgst)}</Text>
              <Text>SGST: {formatShortCurrency(taxData.sgst)}</Text>
              <Text>IGST: {formatShortCurrency(taxData.igst)}</Text>
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.ribbonLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#0f172a' }]} />
            <Text>Current Period Level</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#475569' }]} />
            <Text>Preceding Period Level (MoM)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#94a3b8' }]} />
            <Text>Prior Fiscal Year Level (YoY)</Text>
          </View>
        </View>

        <RunningFooter pageNum={3} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 4: UNIT ECONOMICS & ₹100 COST ALLOCATION RIBBON           */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Unit Economics" section="Section 3: Unit Economics" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Section 3: Unit Economics &amp; Cost Decomposition</Text>
          <Text style={styles.sectionSubtitle}>
            Deconstruction of every ₹100 in realized turnover across procurement, fixed overheads, variable costs, and profit yield.
          </Text>
        </View>

        {/* Visual Allocation Ribbon */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Normalized Revenue Absorption Ribbon (Where Every ₹100 Goes)</Text>
          <View style={styles.ribbonTrack}>
            <View style={{ width: `${Math.max(2, Math.min(100, cogsPct))}%`, backgroundColor: '#0f172a' }} />
            <View style={{ width: `${Math.max(2, Math.min(100, fixedPct))}%`, backgroundColor: '#334155' }} />
            <View style={{ width: `${Math.max(2, Math.min(100, variablePct))}%`, backgroundColor: '#64748b' }} />
            <View style={{ width: `${Math.max(2, Math.min(100, Math.max(0, netProfitPct)))}%`, backgroundColor: netProfit >= 0 ? '#15803d' : '#b91c1c' }} />
          </View>
          <View style={styles.ribbonLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#0f172a' }]} />
              <Text>COGS Procurement: ₹{cogsPct.toFixed(2)} ({cogsPct.toFixed(1)}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#334155' }]} />
              <Text>Fixed Overhead: ₹{fixedPct.toFixed(2)} ({fixedPct.toFixed(1)}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#64748b' }]} />
              <Text>Variable OpEx: ₹{variablePct.toFixed(2)} ({variablePct.toFixed(1)}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: netProfit >= 0 ? '#15803d' : '#b91c1c' }]} />
              <Text>Net Retained Profit: ₹{netProfitPct.toFixed(2)} ({netProfitPct.toFixed(1)}%)</Text>
            </View>
          </View>
        </View>

        {/* Line-by-Line Spending Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '30%' }]}>Cost Allocation Item</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%' }]}>Classification</Text>
            <Text style={[styles.tableHeaderCol, { width: '18%', textAlign: 'right' }]}>Period Total (INR)</Text>
            <Text style={[styles.tableHeaderCol, { width: '16%', textAlign: 'right' }]}>Per ₹100 Sale</Text>
            <Text style={[styles.tableHeaderCol, { width: '16%', textAlign: 'right' }]}>Auditor Benchmark</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={{ width: '30%', fontWeight: 'bold' }}>Gross Selling Price</Text>
            <Text style={{ width: '20%', color: '#64748b' }}>Recognized Revenue</Text>
            <Text style={{ width: '18%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(totalSales)}</Text>
            <Text style={{ width: '16%', textAlign: 'right', fontWeight: 'bold' }}>₹100.00</Text>
            <Text style={{ width: '16%', textAlign: 'right', color: '#64748b' }}>100.0%</Text>
          </View>

          <View style={[styles.tableRow, styles.tableRowAlt]}>
            <Text style={{ width: '30%' }}>Product Procurement / COGS</Text>
            <Text style={{ width: '20%', color: '#64748b' }}>Direct Material Cost</Text>
            <Text style={{ width: '18%', textAlign: 'right' }}>{formatPDFCurrency(cogs)}</Text>
            <Text style={{ width: '16%', textAlign: 'right' }}>₹{cogsPct.toFixed(2)}</Text>
            <Text style={{ width: '16%', textAlign: 'right', color: '#64748b' }}>&lt; 50.0%</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={{ width: '30%', fontWeight: 'bold' }}>Gross Contribution</Text>
            <Text style={{ width: '20%', color: '#64748b' }}>Gross Profit Margin</Text>
            <Text style={{ width: '18%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(grossProfit)}</Text>
            <Text style={{ width: '16%', textAlign: 'right', fontWeight: 'bold' }}>₹{(100 - cogsPct).toFixed(2)}</Text>
            <Text style={{ width: '16%', textAlign: 'right', color: '#64748b' }}>&gt; 50.0%</Text>
          </View>

          {/* Fixed Breakdown rows */}
          {Object.entries(currentMetrics?.fixedBreakdown || {}).slice(0, 4).map(([cat, amt], idx) => {
            const catPer100 = (amt / safeSales) * 100;
            return (
              <View key={cat} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={{ width: '30%', paddingLeft: 6 }}>• {cat}</Text>
                <Text style={{ width: '20%', color: '#64748b' }}>Fixed Overhead</Text>
                <Text style={{ width: '18%', textAlign: 'right' }}>{formatPDFCurrency(amt)}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>₹{catPer100.toFixed(2)}</Text>
                <Text style={{ width: '16%', textAlign: 'right', color: '#64748b' }}>Target &lt; 5.0%</Text>
              </View>
            );
          })}

          {/* Variable Breakdown rows */}
          {Object.entries(currentMetrics?.variableBreakdown || {}).slice(0, 3).map(([cat, amt], idx) => {
            const catPer100 = (amt / safeSales) * 100;
            return (
              <View key={cat} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={{ width: '30%', paddingLeft: 6 }}>• {cat}</Text>
                <Text style={{ width: '20%', color: '#64748b' }}>Variable Operating</Text>
                <Text style={{ width: '18%', textAlign: 'right' }}>{formatPDFCurrency(amt)}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>₹{catPer100.toFixed(2)}</Text>
                <Text style={{ width: '16%', textAlign: 'right', color: '#64748b' }}>Target &lt; 8.0%</Text>
              </View>
            );
          })}

          <View style={styles.tableTotalsRow}>
            <Text style={{ width: '30%', fontWeight: 'bold' }}>Net Retained Earnings</Text>
            <Text style={{ width: '20%', color: '#0f172a' }}>Bottom Line Yield</Text>
            <Text style={{ width: '18%', textAlign: 'right', fontWeight: 'bold', color: netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
              {formatPDFCurrency(netProfit)}
            </Text>
            <Text style={{ width: '16%', textAlign: 'right', fontWeight: 'bold', color: netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
              ₹{netProfitPct.toFixed(2)}
            </Text>
            <Text style={{ width: '16%', textAlign: 'right', fontWeight: 'bold' }}>&gt; 15.0%</Text>
          </View>
        </View>

        {/* Financial Leverage & Breakeven Cockpit */}
        <View style={styles.scorecardGrid}>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Breakeven Sales Required</Text>
            <Text style={styles.scorecardValue}>
              {grossMargin > 0 ? formatPDFCurrency((fixedCosts / grossMargin) * 100) : 'N/A'}
            </Text>
            <Text style={styles.scorecardSubtext}>Fixed Costs / Gross Margin</Text>
          </View>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Margin of Safety (%)</Text>
            <Text style={[styles.scorecardValue, { color: '#15803d' }]}>
              {totalSales > 0 && grossMargin > 0 ? `${Math.max(0, ((totalSales - ((fixedCosts / grossMargin) * 100)) / totalSales) * 100).toFixed(1)}%` : 'N/A'}
            </Text>
            <Text style={styles.scorecardSubtext}>Buffer Above Zero Profit</Text>
          </View>
          <View style={styles.scorecardTile}>
            <Text style={styles.scorecardLabel}>Operating Leverage Ratio</Text>
            <Text style={styles.scorecardValue}>
              {netProfit > 0 ? `${(grossProfit / netProfit).toFixed(2)}x` : 'N/A'}
            </Text>
            <Text style={styles.scorecardSubtext}>Contribution / Operating Profit</Text>
          </View>
        </View>

        <RunningFooter pageNum={4} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 5: UNIT ECONOMICS DEEP-DIVE & PRODUCT MARGINS            */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Unit Economics Deep-Dive" section="Section 3 (Cont.): Margins & Products" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Section 3 (Cont.): Product Margin Contributions &amp; Cost Structure</Text>
          <Text style={styles.sectionSubtitle}>
            Item-level contribution to the ₹100 revenue pool, cost elasticity, and working capital efficiency.
          </Text>
        </View>

        {/* Top Contributing Products Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '34%' }]}>Top Contributing Product / SKU</Text>
            <Text style={[styles.tableHeaderCol, { width: '16%' }]}>Category</Text>
            <Text style={[styles.tableHeaderCol, { width: '14%', textAlign: 'center' }]}>Units Sold</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%', textAlign: 'right' }]}>Realized Turnover (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '16%', textAlign: 'right' }]}>Share Rev %</Text>
          </View>

          {(topProducts || []).slice(0, 8).map((p, idx) => {
            const share = totalSales > 0 ? (p.revenue / totalSales) * 100 : 0;
            return (
              <View key={p.id || idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={{ width: '34%', fontWeight: 'bold' }}>{p.name}</Text>
                <Text style={{ width: '16%', color: '#64748b' }}>{p.category}</Text>
                <Text style={{ width: '14%', textAlign: 'center' }}>{p.quantitySold} {p.unit || 'pcs'}</Text>
                <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(p.revenue)}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>{share.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>

        {/* Cost Elasticity & Working Capital Card */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Operating Cost Structure &amp; Working Capital Efficiency</Text>
          <Text style={{ fontSize: 7, color: '#334155', lineHeight: 1.4, marginBottom: 6 }}>
            Fixed overhead commitments total {formatPDFCurrency(fixedCosts)} ({fixedPct.toFixed(1)}% of sales). Variable operating expenditures total {formatPDFCurrency(variableCosts)} ({variablePct.toFixed(1)}% of sales). When sales expand by 10%, fixed overhead per unit drops by {(fixedPct * 0.09).toFixed(2)}%, delivering positive operating leverage to the bottom line.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 6 }}>
            <View>
              <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#64748b' }}>Procurement Intensity</Text>
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0f172a' }}>{cogsPct.toFixed(1)}% of Revenue</Text>
            </View>
            <View>
              <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#64748b' }}>Fixed Cost Burden</Text>
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0f172a' }}>{fixedPct.toFixed(1)}% of Revenue</Text>
            </View>
            <View>
              <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#64748b' }}>Variable Cost Elasticity</Text>
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#0f172a' }}>{variablePct.toFixed(1)}% of Revenue</Text>
            </View>
            <View>
              <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#64748b' }}>Net Capital Yield</Text>
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: netProfit >= 0 ? '#15803d' : '#b91c1c' }}>{netMargin.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <RunningFooter pageNum={5} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 6: ITEMIZED SALES REGISTER (TRANCHE 1: INVOICES 1-18)     */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Sales Register" section="Section 4: Sales Register (Part 1)" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Section 4: Itemized Sales Register &amp; Revenue Ledger (Part 1)</Text>
          <Text style={styles.sectionSubtitle}>
            Electronic invoice audit log for transactions 1 through {Math.min(18, (salesRegister || []).length)} of {(salesRegister || []).length} total records.
          </Text>
        </View>

        {/* Invoices Table Tranche 1 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '15%' }]}>Invoice No</Text>
            <Text style={[styles.tableHeaderCol, { width: '12%' }]}>Date</Text>
            <Text style={[styles.tableHeaderCol, { width: '23%' }]}>Customer / GSTIN</Text>
            <Text style={[styles.tableHeaderCol, { width: '14%', textAlign: 'right' }]}>Tax Base (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '12%', textAlign: 'right' }]}>GST (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '14%', textAlign: 'right' }]}>Total (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '10%', textAlign: 'center' }]}>Status</Text>
          </View>

          {(salesRegister || []).slice(0, 18).map((inv, idx) => {
            const isCancelled = inv.status === 'cancelled';
            return (
              <View key={inv.id || idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}, isCancelled ? { backgroundColor: '#fff1f2' } : {}]}>
                <Text style={{ width: '15%', fontWeight: 'bold', color: isCancelled ? '#b91c1c' : '#0f172a' }}>
                  {inv.invoiceNumber}
                </Text>
                <Text style={{ width: '12%', color: '#475569' }}>
                  {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
                <View style={{ width: '23%' }}>
                  <Text style={{ fontWeight: 'bold', color: isCancelled ? '#9f1239' : '#0f172a' }}>
                    {inv.customerName}
                  </Text>
                  <Text style={{ fontSize: 5.5, color: '#64748b' }}>{inv.customerGstin || 'No GSTIN'}</Text>
                </View>
                <Text style={{ width: '14%', textAlign: 'right', color: isCancelled ? '#9f1239' : '#0f172a' }}>
                  {formatShortCurrency(inv.taxableAmount)}
                </Text>
                <Text style={{ width: '12%', textAlign: 'right', color: '#64748b' }}>
                  {formatShortCurrency(inv.totalTax)}
                </Text>
                <Text style={{ width: '14%', textAlign: 'right', fontWeight: 'bold', color: isCancelled ? '#b91c1c' : '#0f172a' }}>
                  {formatShortCurrency(inv.totalAmount)}
                </Text>
                <View style={{ width: '10%', alignItems: 'center' }}>
                  {isCancelled ? (
                    <Text style={{ fontSize: 5.5, color: '#e11d48', fontWeight: 'bold', backgroundColor: '#ffe4e6', paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 }}>
                      VOID
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 5.5, color: '#15803d', fontWeight: 'bold', backgroundColor: '#dcfce7', paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 }}>
                      {inv.status.toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={{ fontSize: 6.5, color: '#64748b', fontStyle: 'italic', marginBottom: 6 }}>
          * Notice: Cancelled bills marked VOID have had stock automatically returned to inventory and balances zeroed out under statutory audit guidelines.
        </Text>

        <RunningFooter pageNum={6} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 7: SALES REGISTER TRANCHE 2 & SETTLEMENT RECONCILIATION   */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Sales Register (Cont.)" section="Section 4: Sales Register (Part 2)" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Section 4 (Cont.): Sales Register &amp; Reconciliation Analysis</Text>
          <Text style={styles.sectionSubtitle}>
            {(salesRegister || []).length > 18 ? `Transactional vouchers 19 through ${Math.min(36, (salesRegister || []).length)} and collection reconciliation.` : 'Collection realization breakdown, voucher status audit, and customer concentration analysis.'}
          </Text>
        </View>

        {(salesRegister || []).length > 18 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCol, { width: '15%' }]}>Invoice No</Text>
              <Text style={[styles.tableHeaderCol, { width: '12%' }]}>Date</Text>
              <Text style={[styles.tableHeaderCol, { width: '23%' }]}>Customer / GSTIN</Text>
              <Text style={[styles.tableHeaderCol, { width: '14%', textAlign: 'right' }]}>Tax Base (₹)</Text>
              <Text style={[styles.tableHeaderCol, { width: '12%', textAlign: 'right' }]}>GST (₹)</Text>
              <Text style={[styles.tableHeaderCol, { width: '14%', textAlign: 'right' }]}>Total (₹)</Text>
              <Text style={[styles.tableHeaderCol, { width: '10%', textAlign: 'center' }]}>Status</Text>
            </View>

            {(salesRegister || []).slice(18, 36).map((inv, idx) => {
              const isCancelled = inv.status === 'cancelled';
              return (
                <View key={inv.id || idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}, isCancelled ? { backgroundColor: '#fff1f2' } : {}]}>
                  <Text style={{ width: '15%', fontWeight: 'bold', color: isCancelled ? '#b91c1c' : '#0f172a' }}>
                    {inv.invoiceNumber}
                  </Text>
                  <Text style={{ width: '12%', color: '#475569' }}>
                    {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                  <View style={{ width: '23%' }}>
                    <Text style={{ fontWeight: 'bold', color: isCancelled ? '#9f1239' : '#0f172a' }}>
                      {inv.customerName}
                    </Text>
                    <Text style={{ fontSize: 5.5, color: '#64748b' }}>{inv.customerGstin || 'No GSTIN'}</Text>
                  </View>
                  <Text style={{ width: '14%', textAlign: 'right', color: isCancelled ? '#9f1239' : '#0f172a' }}>
                    {formatShortCurrency(inv.taxableAmount)}
                  </Text>
                  <Text style={{ width: '12%', textAlign: 'right', color: '#64748b' }}>
                    {formatShortCurrency(inv.totalTax)}
                  </Text>
                  <Text style={{ width: '14%', textAlign: 'right', fontWeight: 'bold', color: isCancelled ? '#b91c1c' : '#0f172a' }}>
                    {formatShortCurrency(inv.totalAmount)}
                  </Text>
                  <View style={{ width: '10%', alignItems: 'center' }}>
                    {isCancelled ? (
                      <Text style={{ fontSize: 5.5, color: '#e11d48', fontWeight: 'bold', backgroundColor: '#ffe4e6', paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 }}>
                        VOID
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 5.5, color: '#15803d', fontWeight: 'bold', backgroundColor: '#dcfce7', paddingHorizontal: 3, paddingVertical: 1, borderRadius: 2 }}>
                        {inv.status.toUpperCase()}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Grand Register Reconciliation Box */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Invoice Status &amp; Realization Audit</Text>
          <View style={styles.scorecardGrid}>
            <View style={styles.scorecardTile}>
              <Text style={styles.scorecardLabel}>Active Invoices</Text>
              <Text style={styles.scorecardValue}>
                {(salesRegister || []).filter(s => s.status !== 'cancelled').length}
              </Text>
              <Text style={styles.scorecardSubtext}>Vouchers in books</Text>
            </View>
            <View style={styles.scorecardTile}>
              <Text style={styles.scorecardLabel}>Cancelled / Void</Text>
              <Text style={[styles.scorecardValue, { color: '#b91c1c' }]}>
                {(salesRegister || []).filter(s => s.status === 'cancelled').length}
              </Text>
              <Text style={styles.scorecardSubtext}>Audited &amp; reversed</Text>
            </View>
            <View style={styles.scorecardTile}>
              <Text style={styles.scorecardLabel}>Collection Ratio</Text>
              <Text style={[styles.scorecardValue, { color: '#15803d' }]}>
                {totalSales > 0 ? `${((paymentData.totalCollected / totalSales) * 100).toFixed(1)}%` : '100%'}
              </Text>
              <Text style={styles.scorecardSubtext}>Realized cash receipts</Text>
            </View>
          </View>
        </View>

        {/* Grand Totals */}
        <View style={styles.table}>
          <View style={styles.tableTotalsRow}>
            <Text style={{ width: '50%', fontWeight: 'bold', color: '#0f172a' }}>TOTAL ACTIVE SALES REGISTER</Text>
            <Text style={{ width: '14%', textAlign: 'right', fontWeight: 'bold' }}>
              {formatShortCurrency(taxData.taxableAmount)}
            </Text>
            <Text style={{ width: '12%', textAlign: 'right', fontWeight: 'bold' }}>
              {formatShortCurrency(taxData.totalTax)}
            </Text>
            <Text style={{ width: '14%', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
              {formatShortCurrency(totalSales)}
            </Text>
            <Text style={{ width: '10%' }} />
          </View>
        </View>

        <RunningFooter pageNum={7} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 8: GST STATUTORY TAX AUDIT & SETTLEMENT SPREAD            */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="GST Tax Audit" section="Section 5: GST Audit" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Section 5: GST Statutory Tax Audit &amp; Settlement Matrix</Text>
          <Text style={styles.sectionSubtitle}>
            Breakdown of taxable turnover across statutory GST slab rates (0-28%), central/state split, and realized payment channels.
          </Text>
        </View>

        {/* GST Slab Schedule Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '18%' }]}>GST Slab Rate</Text>
            <Text style={[styles.tableHeaderCol, { width: '22%', textAlign: 'right' }]}>Taxable Base (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '15%', textAlign: 'right' }]}>CGST (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '15%', textAlign: 'right' }]}>SGST (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '15%', textAlign: 'right' }]}>IGST (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '15%', textAlign: 'right' }]}>Total GST (₹)</Text>
          </View>

          {(taxData.taxByRate || []).map((t, idx) => {
            const isInterState = (taxData.igst > 0 && taxData.cgst === 0);
            const cgstAmt = isInterState ? 0 : t.tax / 2;
            const sgstAmt = isInterState ? 0 : t.tax / 2;
            const igstAmt = isInterState ? t.tax : 0;
            return (
              <View key={t.rate} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={{ width: '18%', fontWeight: 'bold' }}>GST @ {t.rate}</Text>
                <Text style={{ width: '22%', textAlign: 'right' }}>{formatPDFCurrency(t.taxable)}</Text>
                <Text style={{ width: '15%', textAlign: 'right' }}>{formatPDFCurrency(cgstAmt)}</Text>
                <Text style={{ width: '15%', textAlign: 'right' }}>{formatPDFCurrency(sgstAmt)}</Text>
                <Text style={{ width: '15%', textAlign: 'right' }}>{formatPDFCurrency(igstAmt)}</Text>
                <Text style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(t.tax)}</Text>
              </View>
            );
          })}

          <View style={styles.tableTotalsRow}>
            <Text style={{ width: '18%', fontWeight: 'bold' }}>STATUTORY TOTAL</Text>
            <Text style={{ width: '22%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(taxData.taxableAmount)}</Text>
            <Text style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(taxData.cgst)}</Text>
            <Text style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(taxData.sgst)}</Text>
            <Text style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(taxData.igst)}</Text>
            <Text style={{ width: '15%', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{formatPDFCurrency(taxData.totalTax)}</Text>
          </View>
        </View>

        {/* Payment Channel Spread */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Realized Settlement Payment Channels</Text>
          <Text style={styles.sectionSubtitle}>Audit of settlement methods utilized for clearing invoices during {periodLabel}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '35%' }]}>Settlement Channel</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%', textAlign: 'center' }]}>Transaction Count</Text>
            <Text style={[styles.tableHeaderCol, { width: '25%', textAlign: 'right' }]}>Settled Amount (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%', textAlign: 'right' }]}>Share %</Text>
          </View>

          {(paymentData.items || []).map((p, idx) => (
            <View key={p.mode} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={{ width: '35%', fontWeight: 'bold' }}>{p.mode}</Text>
              <Text style={{ width: '20%', textAlign: 'center' }}>{p.count} txns</Text>
              <Text style={{ width: '25%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(p.amount)}</Text>
              <Text style={{ width: '20%', textAlign: 'right' }}>{p.percentage.toFixed(1)}%</Text>
            </View>
          ))}

          <View style={styles.tableTotalsRow}>
            <Text style={{ width: '35%', fontWeight: 'bold' }}>TOTAL SETTLED</Text>
            <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold' }}>{orderCount} txns</Text>
            <Text style={{ width: '25%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(paymentData.totalCollected)}</Text>
            <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>100.0%</Text>
          </View>
        </View>

        <RunningFooter pageNum={8} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 9: OPERATING EXPENSE SCHEDULE BY COST CENTER              */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Expense Schedule" section="Section 6: Expenses" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Section 6: Operating Expense Schedule by Cost Center</Text>
          <Text style={styles.sectionSubtitle}>
            Classification of all fixed administrative overheads and variable operating expenditures incurred in {periodLabel}.
          </Text>
        </View>

        {/* Expenses Schedule Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '32%' }]}>Cost Center / Expenditure Category</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%' }]}>Classification</Text>
            <Text style={[styles.tableHeaderCol, { width: '24%', textAlign: 'right' }]}>Incurred Amount (INR)</Text>
            <Text style={[styles.tableHeaderCol, { width: '12%', textAlign: 'right' }]}>Share OpEx %</Text>
            <Text style={[styles.tableHeaderCol, { width: '12%', textAlign: 'right' }]}>Share Rev %</Text>
          </View>

          {[
            ...Object.entries(currentMetrics?.fixedBreakdown || {}).map(([c, a]) => ({ category: c, amount: a, type: 'Fixed Overhead' })),
            ...Object.entries(currentMetrics?.variableBreakdown || {}).map(([c, a]) => ({ category: c, amount: a, type: 'Variable Operating' })),
          ].map((exp, idx) => {
            const opexShare = totalExpenses > 0 ? (exp.amount / totalExpenses) * 100 : 0;
            const revShare = safeSales > 0 ? (exp.amount / safeSales) * 100 : 0;
            return (
              <View key={exp.category} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={{ width: '32%', fontWeight: 'bold' }}>{exp.category}</Text>
                <Text style={{ width: '20%', color: '#64748b' }}>{exp.type}</Text>
                <Text style={{ width: '24%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(exp.amount)}</Text>
                <Text style={{ width: '12%', textAlign: 'right' }}>{opexShare.toFixed(1)}%</Text>
                <Text style={{ width: '12%', textAlign: 'right', color: '#475569' }}>{revShare.toFixed(1)}%</Text>
              </View>
            );
          })}

          <View style={styles.tableTotalsRow}>
            <Text style={{ width: '52%', fontWeight: 'bold', color: '#0f172a' }}>TOTAL OPERATING OVERHEADS</Text>
            <Text style={{ width: '24%', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
              {formatPDFCurrency(totalExpenses)}
            </Text>
            <Text style={{ width: '12%', textAlign: 'right', fontWeight: 'bold' }}>100.0%</Text>
            <Text style={{ width: '12%', textAlign: 'right', fontWeight: 'bold' }}>
              {safeSales > 0 ? `${((totalExpenses / safeSales) * 100).toFixed(1)}%` : '0.0%'}
            </Text>
          </View>
        </View>

        {/* Expense Drivers Summary Box */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Auditor Cost Structure Evaluation</Text>
          <Text style={{ fontSize: 7, color: '#334155', lineHeight: 1.4 }}>
            Fixed operating overheads account for {formatPDFCurrency(fixedCosts)} ({totalExpenses > 0 ? ((fixedCosts / totalExpenses) * 100).toFixed(1) : 0}% of operating expenditures), representing baseline administrative commitments required to maintain commercial operations. Variable operating expenditures total {formatPDFCurrency(variableCosts)} ({totalExpenses > 0 ? ((variableCosts / totalExpenses) * 100).toFixed(1) : 0}% of OpEx), which scale dynamically with transaction volume. Cost optimization recommendations focus on keeping overheads under 15% of top-line revenue.
          </Text>
        </View>

        <RunningFooter pageNum={9} totalPages={TOTAL_PAGES} />
      </Page>

      {/* ============================================================== */}
      {/* PAGE 10: RECEIVABLES AGING & STATUTORY ATTESTATION             */}
      {/* ============================================================== */}
      <Page size="A4" style={styles.page}>
        <RunningHeader title="Audit Certification" section="Section 7: Attestation" period={periodLabel} company={company} />

        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Section 7: Audit Certification, Receivables Aging &amp; Attestation</Text>
          <Text style={styles.sectionSubtitle}>
            Receivables aging schedule, bad-debt risk assessment, and formal statutory attestation endorsements.
          </Text>
        </View>

        {/* Receivables Aging Matrix */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, { width: '30%' }]}>Aging Time Bracket</Text>
            <Text style={[styles.tableHeaderCol, { width: '20%', textAlign: 'center' }]}>Debtors Count</Text>
            <Text style={[styles.tableHeaderCol, { width: '25%', textAlign: 'right' }]}>Outstanding Amount (₹)</Text>
            <Text style={[styles.tableHeaderCol, { width: '25%', textAlign: 'left', paddingLeft: 8 }]}>Credit Risk Category</Text>
          </View>

          {(agingData.buckets || []).map((b, idx) => (
            <View key={b.label} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={{ width: '30%', fontWeight: 'bold' }}>{b.label}</Text>
              <Text style={{ width: '20%', textAlign: 'center' }}>{b.count} parties</Text>
              <Text style={{ width: '25%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(b.amount)}</Text>
              <Text style={{ width: '25%', textAlign: 'left', paddingLeft: 8, color: idx >= 2 ? '#b91c1c' : '#15803d', fontWeight: 'bold' }}>
                {idx === 0 ? 'Current (Low Risk)' : (idx === 1 ? 'Standard Operating' : (idx === 2 ? 'Watchlist (Delayed)' : 'Critical Overdue'))}
              </Text>
            </View>
          ))}

          <View style={styles.tableTotalsRow}>
            <Text style={{ width: '30%', fontWeight: 'bold' }}>TOTAL OUTSTANDING DEBTORS</Text>
            <Text style={{ width: '20%', textAlign: 'center', fontWeight: 'bold' }}>
              {(agingData.buckets || []).reduce((acc, b) => acc + b.count, 0)} parties
            </Text>
            <Text style={{ width: '25%', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
              {formatPDFCurrency(agingData.totalOverdue)}
            </Text>
            <Text style={{ width: '25%', paddingLeft: 8, fontSize: 6.5, color: '#64748b' }}>
              Pending Invoices
            </Text>
          </View>
        </View>

        {/* Formal Statutory Audit Declaration */}
        <View style={[styles.narrativeCard, { marginTop: 6 }]}>
          <Text style={[styles.narrativeText, { fontWeight: 'bold', color: '#0f172a', marginBottom: 2 }]}>
            STATUTORY AUDITOR &amp; MANAGEMENT ATTESTATION CERTIFICATE:
          </Text>
          <Text style={styles.narrativeText}>
            We have conducted an independent audit review of the books of accounts, customer sales invoices, credit ledgers, and operating expenditure records of {company} (GSTIN: {gstin}) for the period {periodLabel}. In our opinion and to the best of our information, the financial schedules, GST liability reconciliations, and unit economics calculations set forth in Sections 1 through 7 of this report present a true, correct, and fair representation of the entity&apos;s financial position under prevailing accounting standards.
          </Text>
        </View>

        {/* Tri-Partite Signature Blocks */}
        <View style={styles.signoffRow}>
          {/* Signoff 1: Accounts */}
          <View style={styles.signoffBox}>
            <Text style={styles.signoffTitle}>Prepared By</Text>
            <View style={styles.signoffLine}>
              <Text style={styles.signoffName}>Head of Accounts &amp; Billing</Text>
              <Text style={styles.signoffRole}>InvoicePro Billing System Lead</Text>
            </View>
          </View>

          {/* Signoff 2: Auditor */}
          <View style={styles.signoffBox}>
            <Text style={styles.signoffTitle}>Reviewed &amp; Verified By</Text>
            <View style={styles.signoffLine}>
              <Text style={styles.signoffName}>Independent Internal Auditor</Text>
              <Text style={styles.signoffRole}>Statutory &amp; Tax Compliance</Text>
            </View>
          </View>

          {/* Signoff 3: Management */}
          <View style={styles.signoffBox}>
            <Text style={styles.signoffTitle}>Authorized Signatory</Text>
            <View style={styles.signoffLine}>
              <Text style={styles.signoffName}>For {company}</Text>
              <Text style={styles.signoffRole}>Director / Partner / Proprietor</Text>
            </View>
          </View>
        </View>

        <RunningFooter pageNum={10} totalPages={TOTAL_PAGES} />
      </Page>
    </Document>
  );
}
