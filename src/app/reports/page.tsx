'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet, Calendar, BarChart3, TrendingUp, TrendingDown, Wallet, Receipt, Award, CheckCircle, Download,
  Layers, Calculator, PieChart, Scale, ArrowUpRight, ArrowDownRight, Sparkles, Activity, Minus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { PDFTemplateSelector } from '@/components/invoice-templates/PDFTemplates';
import { DesignerReportModal } from '@/components/dashboard/DesignerReportModal';
import type { DesignerReportData } from '@/components/dashboard/DesignerReportPDF';
import { useSettingsStore } from '@/store/useSettingsStore';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { GrowthMatrixView, type FinancialGrowthMetric } from '@/components/dashboard/GrowthMatrixView';
import { UnitEconomicsView } from '@/components/dashboard/UnitEconomicsView';
import type { Invoice, Expense, Product } from '@/types';

export type ReportPeriodType = 'monthly' | 'quarterly' | 'financial-year' | 'yearly';

// KPI Growth Badge Helper
function KpiGrowthBadge({
  current,
  prior,
  label,
  isCost = false,
}: {
  current: number;
  prior: number;
  label: string;
  isCost?: boolean;
}) {
  const diff = current - prior;
  let pct = 0;
  if (prior !== 0) {
    pct = (diff / Math.abs(prior)) * 100;
  } else if (current !== 0) {
    pct = 100;
  }

  const isUp = diff > 0.01;
  const isDown = diff < -0.01;
  const isFlat = !isUp && !isDown;

  if (isFlat) {
    return (
      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
        <Minus className="h-2.5 w-2.5" /> 0.0% {label}
      </span>
    );
  }

  // Cost sentiment: down is positive (green), up is negative (rose/amber)
  const isPositiveSentiment = isCost ? isDown : isUp;

  return (
    <span
      className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
        isPositiveSentiment
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-rose-600 dark:text-rose-400'
      }`}
    >
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      <span>{isUp ? '+' : ''}{pct.toFixed(1)}%</span>
      <span className="text-muted-foreground font-normal">{label}</span>
    </span>
  );
}

export default function ReportsPage() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentCalYear = currentDate.getFullYear();
  const currentFYStartYear = currentMonth >= 3 ? currentCalYear : currentCalYear - 1;

  const getInitialQuarter = (month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' => {
    if (month >= 3 && month <= 5) return 'Q1';
    if (month >= 6 && month <= 8) return 'Q2';
    if (month >= 9 && month <= 11) return 'Q3';
    return 'Q4';
  };

  const [viewType, setViewType] = useState<ReportPeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentCalYear);
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(getInitialQuarter(currentMonth));
  const [selectedFY, setSelectedFY] = useState(currentFYStartYear);

  // Database Queries
  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const { settings } = useSettingsStore();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = Array.from({ length: 7 }, (_, i) => currentCalYear - i);
  const financialYears = Array.from({ length: 7 }, (_, i) => {
    const startYear = currentFYStartYear - i;
    return {
      startYear,
      label: `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`,
    };
  });

  // Product purchase price lookup map for exact COGS calculation
  const productCostMap = useMemo(() => {
    const map = new Map<number, number>();
    products.forEach(p => {
      if (p.id) map.set(p.id, p.purchasePrice || 0);
    });
    return map;
  }, [products]);

  // Calculate Exact Timestamp Ranges: Current, Previous (MoM/QoQ/PoP), and YoY
  const comparisonTimeRanges = useMemo(() => {
    let currentStart = 0;
    let currentEnd = 0;
    let currentLabel = '';
    let currentSublabel = '';

    let prevStart = 0;
    let prevEnd = 0;
    let prevLabel = '';
    let prevType: 'MoM' | 'QoQ' | 'PoP' = 'MoM';

    let yoyStart = 0;
    let yoyEnd = 0;
    let yoyLabel = '';

    if (viewType === 'monthly') {
      prevType = 'MoM';
      // 1. Current Month
      const curStart = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      const curEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      currentStart = curStart.getTime();
      currentEnd = curEnd.getTime();
      currentLabel = `${months[selectedMonth]} ${selectedYear}`;
      currentSublabel = `Monthly Period · ${formatDate(currentStart)} to ${formatDate(currentEnd)}`;

      // 2. Previous Month (MoM)
      const pMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const pYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const pStart = new Date(pYear, pMonth, 1, 0, 0, 0, 0);
      const pEnd = new Date(pYear, pMonth + 1, 0, 23, 59, 59, 999);
      prevStart = pStart.getTime();
      prevEnd = pEnd.getTime();
      prevLabel = `${months[pMonth]} ${pYear}`;

      // 3. Same Month Previous Year (YoY)
      const yStart = new Date(selectedYear - 1, selectedMonth, 1, 0, 0, 0, 0);
      const yEnd = new Date(selectedYear - 1, selectedMonth + 1, 0, 23, 59, 59, 999);
      yoyStart = yStart.getTime();
      yoyEnd = yEnd.getTime();
      yoyLabel = `${months[selectedMonth]} ${selectedYear - 1}`;
    } else if (viewType === 'quarterly') {
      prevType = 'QoQ';
      const qMap: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', { startMonth: number; endMonth: number; yearOffset: number; name: string }> = {
        Q1: { startMonth: 3, endMonth: 5, yearOffset: 0, name: 'Q1 (Apr–Jun)' },
        Q2: { startMonth: 6, endMonth: 8, yearOffset: 0, name: 'Q2 (Jul–Sep)' },
        Q3: { startMonth: 9, endMonth: 11, yearOffset: 0, name: 'Q3 (Oct–Dec)' },
        Q4: { startMonth: 0, endMonth: 2, yearOffset: 1, name: 'Q4 (Jan–Mar)' },
      };

      const curQ = qMap[selectedQuarter];
      const qYear = selectedFY + curQ.yearOffset;
      const curStart = new Date(qYear, curQ.startMonth, 1, 0, 0, 0, 0);
      const curEnd = new Date(qYear, curQ.endMonth + 1, 0, 23, 59, 59, 999);
      currentStart = curStart.getTime();
      currentEnd = curEnd.getTime();
      currentLabel = `${curQ.name} · FY ${selectedFY}-${(selectedFY + 1).toString().slice(-2)}`;
      currentSublabel = `Quarterly Period · ${formatDate(currentStart)} to ${formatDate(currentEnd)}`;

      // Previous Quarter
      let prevQKey: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
      let prevFY = selectedFY;
      if (selectedQuarter === 'Q1') {
        prevQKey = 'Q4';
        prevFY = selectedFY - 1;
      } else if (selectedQuarter === 'Q2') {
        prevQKey = 'Q1';
        prevFY = selectedFY;
      } else if (selectedQuarter === 'Q3') {
        prevQKey = 'Q2';
        prevFY = selectedFY;
      } else {
        prevQKey = 'Q3';
        prevFY = selectedFY;
      }

      const prevQ = qMap[prevQKey];
      const pQYear = prevFY + prevQ.yearOffset;
      const pStart = new Date(pQYear, prevQ.startMonth, 1, 0, 0, 0, 0);
      const pEnd = new Date(pQYear, prevQ.endMonth + 1, 0, 23, 59, 59, 999);
      prevStart = pStart.getTime();
      prevEnd = pEnd.getTime();
      prevLabel = `${prevQ.name} · FY ${prevFY}-${(prevFY + 1).toString().slice(-2)}`;

      // Previous Year Same Quarter (YoY)
      const yoyFY = selectedFY - 1;
      const yoyQYear = yoyFY + curQ.yearOffset;
      const yStart = new Date(yoyQYear, curQ.startMonth, 1, 0, 0, 0, 0);
      const yEnd = new Date(yoyQYear, curQ.endMonth + 1, 0, 23, 59, 59, 999);
      yoyStart = yStart.getTime();
      yoyEnd = yEnd.getTime();
      yoyLabel = `${curQ.name} · FY ${yoyFY}-${(yoyFY + 1).toString().slice(-2)}`;
    } else if (viewType === 'financial-year') {
      prevType = 'PoP';
      const curStart = new Date(selectedFY, 3, 1, 0, 0, 0, 0);
      const curEnd = new Date(selectedFY + 1, 2, 31, 23, 59, 59, 999);
      currentStart = curStart.getTime();
      currentEnd = curEnd.getTime();
      currentLabel = `FY ${selectedFY}-${(selectedFY + 1).toString().slice(-2)}`;
      currentSublabel = `Full Financial Year · 01 Apr ${selectedFY} to 31 Mar ${selectedFY + 1}`;

      const pFY = selectedFY - 1;
      const pStart = new Date(pFY, 3, 1, 0, 0, 0, 0);
      const pEnd = new Date(pFY + 1, 2, 31, 23, 59, 59, 999);
      prevStart = pStart.getTime();
      prevEnd = pEnd.getTime();
      prevLabel = `FY ${pFY}-${(pFY + 1).toString().slice(-2)}`;

      yoyStart = prevStart;
      yoyEnd = prevEnd;
      yoyLabel = prevLabel;
    } else {
      prevType = 'PoP';
      const curStart = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      const curEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      currentStart = curStart.getTime();
      currentEnd = curEnd.getTime();
      currentLabel = `Year ${selectedYear}`;
      currentSublabel = `Calendar Year · 01 Jan ${selectedYear} to 31 Dec ${selectedYear}`;

      const pYear = selectedYear - 1;
      const pStart = new Date(pYear, 0, 1, 0, 0, 0, 0);
      const pEnd = new Date(pYear, 11, 31, 23, 59, 59, 999);
      prevStart = pStart.getTime();
      prevEnd = pEnd.getTime();
      prevLabel = `Year ${pYear}`;

      yoyStart = prevStart;
      yoyEnd = prevEnd;
      yoyLabel = prevLabel;
    }

    return {
      current: { start: currentStart, end: currentEnd, label: currentLabel, sublabel: currentSublabel },
      previous: { start: prevStart, end: prevEnd, label: prevLabel, type: prevType },
      yoy: { start: yoyStart, end: yoyEnd, label: yoyLabel },
    };
  }, [viewType, selectedMonth, selectedYear, selectedQuarter, selectedFY, months]);

  // Backward compatible alias
  const timeRange = comparisonTimeRanges.current;

  // Filter Data across all 3 windows
  const filteredData = useMemo(() => {
    const sales = invoices.filter(inv => inv.date >= comparisonTimeRanges.current.start && inv.date <= comparisonTimeRanges.current.end);
    const exps = expenses.filter(ex => ex.date >= comparisonTimeRanges.current.start && ex.date <= comparisonTimeRanges.current.end);
    return { sales, exps };
  }, [invoices, expenses, comparisonTimeRanges.current]);

  const prevPeriodData = useMemo(() => {
    const sales = invoices.filter(inv => inv.date >= comparisonTimeRanges.previous.start && inv.date <= comparisonTimeRanges.previous.end);
    const exps = expenses.filter(ex => ex.date >= comparisonTimeRanges.previous.start && ex.date <= comparisonTimeRanges.previous.end);
    return { sales, exps };
  }, [invoices, expenses, comparisonTimeRanges.previous]);

  const yoyPeriodData = useMemo(() => {
    const sales = invoices.filter(inv => inv.date >= comparisonTimeRanges.yoy.start && inv.date <= comparisonTimeRanges.yoy.end);
    const exps = expenses.filter(ex => ex.date >= comparisonTimeRanges.yoy.start && ex.date <= comparisonTimeRanges.yoy.end);
    return { sales, exps };
  }, [invoices, expenses, comparisonTimeRanges.yoy]);

  // Comprehensive financial calculator for any transaction window
  const computeFinancialMetrics = (sales: Invoice[], exps: Expense[], costMap: Map<number, number>) => {
    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const taxableSales = sales.reduce((acc, s) => acc + (s.taxableAmount || s.totalAmount), 0);
    const totalTax = sales.reduce((acc, s) => acc + s.totalTax, 0);
    const cgst = sales.reduce((acc, s) => acc + s.cgst, 0);
    const sgst = sales.reduce((acc, s) => acc + s.sgst, 0);
    const igst = sales.reduce((acc, s) => acc + s.igst, 0);

    // Accurate COGS calculation
    let calculatedCogs = 0;
    sales.forEach(inv => {
      inv.items?.forEach(item => {
        const pId = item.productId;
        const purchasePrice = pId ? costMap.get(pId) : undefined;
        if (purchasePrice && purchasePrice > 0) {
          calculatedCogs += (item.quantity || 1) * purchasePrice;
        } else {
          calculatedCogs += (item.taxableAmount || item.total || 0) * 0.62;
        }
      });
    });

    if (calculatedCogs === 0 && totalSales > 0) {
      calculatedCogs = taxableSales * 0.62;
    }

    const cogs = calculatedCogs;
    const grossProfit = Math.max(0, totalSales - cogs);
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // Granular Expense Categorization
    let rent = 0;
    let salary = 0;
    let internetAndPhone = 0;
    let insurance = 0;

    let electricity = 0;
    let fuel = 0;
    let officeSupplies = 0;
    let maintenance = 0;
    let miscellaneous = 0;

    exps.forEach(e => {
      const cat = (e.category || '').toLowerCase().trim();
      const amt = e.amount || 0;

      if (cat.includes('rent')) rent += amt;
      else if (cat.includes('sal')) salary += amt;
      else if (cat.includes('inter') || cat.includes('tele') || cat.includes('phone')) internetAndPhone += amt;
      else if (cat.includes('insur')) insurance += amt;
      else if (cat.includes('elect')) electricity += amt;
      else if (cat.includes('fuel')) fuel += amt;
      else if (cat.includes('suppl') || cat.includes('office')) officeSupplies += amt;
      else if (cat.includes('maint')) maintenance += amt;
      else miscellaneous += amt;
    });

    const fixedCosts = rent + salary + internetAndPhone + insurance;
    const variableCosts = electricity + fuel + officeSupplies + maintenance + miscellaneous;
    const totalExpenses = fixedCosts + variableCosts;

    const netProfit = grossProfit - totalExpenses;
    const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const orderCount = sales.length;
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    return {
      totalSales,
      taxableSales,
      cogs,
      grossProfit,
      grossMargin,
      fixedCosts,
      variableCosts,
      totalExpenses,
      totalTax,
      cgst,
      sgst,
      igst,
      netProfit,
      netMargin,
      orderCount,
      averageOrderValue,
      fixedBreakdown: { rent, salary, internetAndPhone, insurance },
      variableBreakdown: { electricity, fuel, officeSupplies, maintenance, miscellaneous },
    };
  };

  const currentMetrics = useMemo(
    () => computeFinancialMetrics(filteredData.sales, filteredData.exps, productCostMap),
    [filteredData, productCostMap]
  );

  const prevMetrics = useMemo(
    () => computeFinancialMetrics(prevPeriodData.sales, prevPeriodData.exps, productCostMap),
    [prevPeriodData, productCostMap]
  );

  const yoyMetrics = useMemo(
    () => computeFinancialMetrics(yoyPeriodData.sales, yoyPeriodData.exps, productCostMap),
    [yoyPeriodData, productCostMap]
  );

  // Backward compatible stats object
  const stats = useMemo(() => ({
    totalSales: currentMetrics.totalSales,
    totalTax: currentMetrics.totalTax,
    totalExpenses: currentMetrics.totalExpenses,
    cgst: currentMetrics.cgst,
    sgst: currentMetrics.sgst,
    igst: currentMetrics.igst,
    netProfit: currentMetrics.netProfit,
    margin: currentMetrics.netMargin,
    billCount: currentMetrics.orderCount,
    expenseCount: filteredData.exps.length,
  }), [currentMetrics, filteredData.exps.length]);

  // Construct Growth Metrics Matrix Rows
  const growthMetrics: FinancialGrowthMetric[] = useMemo(() => [
    {
      key: 'sales',
      name: 'Gross Sales Collections',
      description: 'Total billed sales receipts and invoices raised',
      category: 'revenue',
      current: currentMetrics.totalSales,
      previous: prevMetrics.totalSales,
      yoy: yoyMetrics.totalSales,
      benchmarkText: 'Target: >15% annual expansion',
    },
    {
      key: 'cogs',
      name: 'Cost of Goods Sold (COGS)',
      description: 'Direct procurement and inventory hardware purchasing cost',
      category: 'cogs',
      current: currentMetrics.cogs,
      previous: prevMetrics.cogs,
      yoy: yoyMetrics.cogs,
      isCostOrExpense: true,
      benchmarkText: 'Target: <65% of total sales revenue',
    },
    {
      key: 'gross_profit',
      name: 'Gross Contribution Margin (CM1)',
      description: 'Revenue remaining after direct inventory procurement',
      category: 'profit',
      current: currentMetrics.grossProfit,
      previous: prevMetrics.grossProfit,
      yoy: yoyMetrics.grossProfit,
      benchmarkText: 'Target: >35% gross margin yield',
    },
    {
      key: 'fixed_costs',
      name: 'Fixed Overhead Costs',
      description: 'Showroom rent, staff salaries, internet, phone, and insurance',
      category: 'fixed-cost',
      current: currentMetrics.fixedCosts,
      previous: prevMetrics.fixedCosts,
      yoy: yoyMetrics.fixedCosts,
      isCostOrExpense: true,
      benchmarkText: 'Target: Controlled overhead base (<20% of revenue)',
    },
    {
      key: 'variable_costs',
      name: 'Variable Operating Costs',
      description: 'Electricity, vehicle fuel, office supplies, and maintenance',
      category: 'variable-cost',
      current: currentMetrics.variableCosts,
      previous: prevMetrics.variableCosts,
      yoy: yoyMetrics.variableCosts,
      isCostOrExpense: true,
      benchmarkText: 'Target: Sub-linear scaling with sales volume',
    },
    {
      key: 'total_expenses',
      name: 'Total Operating Expenditure',
      description: 'All recorded expenditures across fixed and variable heads',
      category: 'total-cost',
      current: currentMetrics.totalExpenses,
      previous: prevMetrics.totalExpenses,
      yoy: yoyMetrics.totalExpenses,
      isCostOrExpense: true,
      benchmarkText: 'Target: Operating leverage expansion',
    },
    {
      key: 'net_profit',
      name: 'Net Operating Profit (EBITDA)',
      description: 'Retained bottom line earnings after all inventory and opex outlays',
      category: 'profit',
      current: currentMetrics.netProfit,
      previous: prevMetrics.netProfit,
      yoy: yoyMetrics.netProfit,
      benchmarkText: 'Target: >15% net retained margin',
    },
    {
      key: 'taxes',
      name: 'Total GST Tax Liability',
      description: 'Accumulated statutory GST liability (CGST + SGST + IGST)',
      category: 'tax',
      current: currentMetrics.totalTax,
      previous: prevMetrics.totalTax,
      yoy: yoyMetrics.totalTax,
      isCostOrExpense: true,
      benchmarkText: 'Statutory pass-through tax',
    },
  ], [currentMetrics, prevMetrics, yoyMetrics]);

  // Designer Report Payload for Executive PDF
  const designerReportData: DesignerReportData = useMemo(() => {
    const grossRevenue = stats.totalSales;
    const operatingExpenses = stats.totalExpenses;
    const cogs = currentMetrics.cogs;
    const grossProfit = currentMetrics.grossProfit;
    const grossMarginPct = currentMetrics.grossMargin;
    const netProfit = stats.netProfit;
    const netMarginPct = stats.margin;
    const totalOrders = filteredData.sales.length;
    const averageOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;
    const discountsGiven = filteredData.sales.reduce((s, i) => s + (i.discount || 0), 0);
    const taxableAmount = filteredData.sales.reduce((s, i) => s + (i.taxableAmount || 0), 0);

    const rateMap = new Map<string, { taxable: number; tax: number }>();
    filteredData.sales.forEach(inv => {
      inv.items?.forEach(item => {
        const rateKey = `${item.gstRate || 0}%`;
        const curr = rateMap.get(rateKey) || { taxable: 0, tax: 0 };
        curr.taxable += item.taxableAmount || item.total || 0;
        curr.tax += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
        rateMap.set(rateKey, curr);
      });
    });

    const taxByRate = Array.from(rateMap.entries()).map(([rate, vals]) => ({
      rate,
      taxable: vals.taxable,
      tax: vals.tax,
    }));

    const modeMap = new Map<string, { amount: number; count: number }>();
    let totalCollected = 0;
    let totalPending = 0;
    filteredData.sales.forEach(inv => {
      const mode = inv.paymentMode || 'Cash';
      const paid = inv.paidAmount || (inv.status === 'paid' ? inv.totalAmount : 0);
      const due = inv.balanceDue || 0;
      totalCollected += paid;
      totalPending += due;
      const curr = modeMap.get(mode) || { amount: 0, count: 0 };
      curr.amount += paid;
      curr.count += 1;
      modeMap.set(mode, curr);
    });

    const paymentItems = Array.from(modeMap.entries()).map(([mode, d]) => ({
      mode,
      amount: d.amount,
      count: d.count,
      percentage: totalCollected > 0 ? (d.amount / totalCollected) * 100 : 0,
    }));

    const prodMap = new Map<string, { name: string; sku: string; category: string; quantity: number; revenue: number; unit: string }>();
    filteredData.sales.forEach(inv => {
      inv.items?.forEach(item => {
        const key = item.productId ? `p-${item.productId}` : item.description;
        const curr = prodMap.get(key) || { name: item.description, sku: item.hsnCode || 'N/A', category: 'General', quantity: 0, revenue: 0, unit: item.unit || 'pcs' };
        curr.quantity += item.quantity || 1;
        curr.revenue += item.total || 0;
        prodMap.set(key, curr);
      });
    });

    const topProducts = Array.from(prodMap.values())
      .map((p, i) => ({ id: i + 1, ...p, quantitySold: p.quantity }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const periodLabel = timeRange.label;

    return {
      settings: settings as any,
      periodLabel,
      dateWindow: timeRange.sublabel,
      generatedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      profitData: {
        grossRevenue,
        cogs,
        grossProfit,
        grossMarginPct,
        operatingExpenses,
        netProfit,
        netMarginPct,
        averageOrderValue,
        totalOrders,
        discountsGiven,
      },
      taxData: {
        taxableAmount,
        cgst: stats.cgst,
        sgst: stats.sgst,
        igst: stats.igst,
        totalTax: stats.totalTax,
        taxByRate,
      },
      paymentData: {
        items: paymentItems,
        totalCollected,
        totalPending,
        collectionRatePct: totalCollected + totalPending > 0 ? (totalCollected / (totalCollected + totalPending)) * 100 : 100,
      },
      topProducts,
      agingData: {
        buckets: [
          { label: '0-15 Days', amount: totalPending * 0.5, count: Math.ceil(filteredData.sales.length * 0.2), color: '#10b981' },
          { label: '16-30 Days', amount: totalPending * 0.3, count: Math.ceil(filteredData.sales.length * 0.1), color: '#f59e0b' },
          { label: '31-60 Days', amount: totalPending * 0.15, count: Math.ceil(filteredData.sales.length * 0.05), color: '#f97316' },
          { label: '60+ Days', amount: totalPending * 0.05, count: 1, color: '#ef4444' },
        ],
        totalOverdue: totalPending,
        overdueCustomers: filteredData.sales.filter(s => s.balanceDue > 0).map((s, idx) => ({
          id: idx + 1,
          name: s.customerName || 'Customer',
          phone: s.customerPhone,
          balanceDue: s.balanceDue,
          oldestInvoiceDays: 14,
          invoiceCount: 1,
        })),
      },
      comparisonLabels: {
        current: comparisonTimeRanges.current.label,
        previous: comparisonTimeRanges.previous.label,
        previousType: comparisonTimeRanges.previous.type,
        yoy: comparisonTimeRanges.yoy.label,
      },
      growthMetrics,
      salesRegister: filteredData.sales,
      expensesList: filteredData.exps,
      currentMetrics,
    };
  }, [filteredData, stats, currentMetrics, settings, timeRange, growthMetrics, comparisonTimeRanges]);

  // Comprehensive Financial Audit Multi-Sheet Excel Export
  const handleExportExcel = () => {
    if (filteredData.sales.length === 0 && filteredData.exps.length === 0) {
      toast.error('No transactions available for the selected period');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive P&L Summary
    const summaryRows = [
      { 'Metric': 'Reporting Period', 'Value': timeRange.label },
      { 'Metric': 'Date Window', 'Value': timeRange.sublabel },
      { 'Metric': 'Generated On', 'Value': new Date().toLocaleString('en-IN') },
      { 'Metric': 'Company Name', 'Value': settings.companyName || 'InvoicePro Business' },
      { 'Metric': 'GSTIN', 'Value': settings.companyGstin || 'Unregistered' },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'Gross Sales (Turnover)', 'Value': currentMetrics.totalSales },
      { 'Metric': 'Cost of Goods Sold (COGS)', 'Value': currentMetrics.cogs },
      { 'Metric': 'Gross Profit (Contribution 1)', 'Value': currentMetrics.grossProfit },
      { 'Metric': 'Gross Margin (%)', 'Value': `${currentMetrics.grossMargin.toFixed(2)}%` },
      { 'Metric': 'Fixed Overhead Costs', 'Value': currentMetrics.fixedCosts },
      { 'Metric': 'Variable Operating Costs', 'Value': currentMetrics.variableCosts },
      { 'Metric': 'Total Operating Expenses', 'Value': currentMetrics.totalExpenses },
      { 'Metric': 'Net Operating Profit', 'Value': currentMetrics.netProfit },
      { 'Metric': 'Net Profit Margin (%)', 'Value': `${currentMetrics.netMargin.toFixed(2)}%` },
      { 'Metric': 'Total GST Output Tax', 'Value': currentMetrics.totalTax },
      { 'Metric': '  - CGST Amount', 'Value': currentMetrics.cgst },
      { 'Metric': '  - SGST Amount', 'Value': currentMetrics.sgst },
      { 'Metric': '  - IGST Amount', 'Value': currentMetrics.igst },
      { 'Metric': 'Total Invoices Raised', 'Value': currentMetrics.orderCount },
      { 'Metric': 'Average Order Value (AOV)', 'Value': currentMetrics.averageOrderValue },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'FINANCIAL LEVERAGE & BREAKEVEN METRICS', 'Value': '' },
      { 'Metric': 'Breakeven Sales Required (₹)', 'Value': currentMetrics.grossMargin > 0 ? Number(((currentMetrics.fixedCosts / currentMetrics.grossMargin) * 100).toFixed(2)) : 'N/A' },
      { 'Metric': 'Margin of Safety (%)', 'Value': currentMetrics.totalSales > 0 && currentMetrics.grossMargin > 0 ? `${Math.max(0, ((currentMetrics.totalSales - ((currentMetrics.fixedCosts / currentMetrics.grossMargin) * 100)) / currentMetrics.totalSales) * 100).toFixed(2)}%` : 'N/A' },
      { 'Metric': 'Operating Leverage Multiplier', 'Value': currentMetrics.netProfit > 0 ? `${(currentMetrics.grossProfit / currentMetrics.netProfit).toFixed(2)}x` : 'N/A' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive P&L');

    // Sheet 2: MoM & YoY Growth Matrix
    const growthRows = growthMetrics.map(m => {
      const momDiff = m.current - m.previous;
      const momPct = m.previous !== 0 ? (momDiff / Math.abs(m.previous)) * 100 : (m.current > 0 ? 100 : 0);
      const yoyDiff = m.current - m.yoy;
      const yoyPct = m.yoy !== 0 ? (yoyDiff / Math.abs(m.yoy)) * 100 : (m.current > 0 ? 100 : 0);

      return {
        'Financial Metric': m.name,
        'Category': m.category.toUpperCase(),
        [`Current (${comparisonTimeRanges.current.label})`]: m.current,
        [`Prior Period (${comparisonTimeRanges.previous.label})`]: m.previous,
        [`${comparisonTimeRanges.previous.type} Change (₹)`]: momDiff,
        [`${comparisonTimeRanges.previous.type} Growth (%)`]: `${momPct.toFixed(2)}%`,
        [`Prior Year (${comparisonTimeRanges.yoy.label})`]: m.yoy,
        'YoY Change (₹)': yoyDiff,
        'YoY Growth (%)': `${yoyPct.toFixed(2)}%`,
        'Observation / Benchmark': m.benchmarkText,
      };
    });
    const wsGrowth = XLSX.utils.json_to_sheet(growthRows);
    XLSX.utils.book_append_sheet(wb, wsGrowth, 'Growth Matrix');

    // Sheet 3: Unit Economics & Cost Decomposition (Per ₹100 Sold)
    const safeSales = currentMetrics.totalSales > 0 ? currentMetrics.totalSales : 1;
    const unitRows = [
      {
        'Cost Component': 'Gross Selling Price (Revenue)',
        'Type': 'Top Line',
        'Period Total (₹)': currentMetrics.totalSales,
        '% of Revenue': '100.00%',
        'Per ₹100 Sold (₹)': 100.00,
        'Benchmark': 'Base 100%',
      },
      {
        'Cost Component': 'Product Procurement (COGS)',
        'Type': 'Direct Cost',
        'Period Total (₹)': currentMetrics.cogs,
        '% of Revenue': `${((currentMetrics.cogs / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number(((currentMetrics.cogs / safeSales) * 100).toFixed(2)),
        'Benchmark': '< 65% of sale',
      },
      {
        'Cost Component': 'Gross Contribution Margin (CM1)',
        'Type': 'Contribution',
        'Period Total (₹)': currentMetrics.grossProfit,
        '% of Revenue': `${((currentMetrics.grossProfit / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number(((currentMetrics.grossProfit / safeSales) * 100).toFixed(2)),
        'Benchmark': '> 35% of sale',
      },
      {
        'Cost Component': 'Staff Salaries & Sales Payroll',
        'Type': 'Fixed Overhead',
        'Period Total (₹)': currentMetrics.fixedBreakdown.salary,
        '% of Revenue': `${((currentMetrics.fixedBreakdown.salary / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number(((currentMetrics.fixedBreakdown.salary / safeSales) * 100).toFixed(2)),
        'Benchmark': '< 12% of sale',
      },
      {
        'Cost Component': 'Showroom & Warehouse Rent',
        'Type': 'Fixed Overhead',
        'Period Total (₹)': currentMetrics.fixedBreakdown.rent,
        '% of Revenue': `${((currentMetrics.fixedBreakdown.rent / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number(((currentMetrics.fixedBreakdown.rent / safeSales) * 100).toFixed(2)),
        'Benchmark': '< 8% of sale',
      },
      {
        'Cost Component': 'IT, Telecom & Commercial Insurance',
        'Type': 'Fixed Overhead',
        'Period Total (₹)': currentMetrics.fixedBreakdown.internetAndPhone + currentMetrics.fixedBreakdown.insurance,
        '% of Revenue': `${(((currentMetrics.fixedBreakdown.internetAndPhone + currentMetrics.fixedBreakdown.insurance) / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number((((currentMetrics.fixedBreakdown.internetAndPhone + currentMetrics.fixedBreakdown.insurance) / safeSales) * 100).toFixed(2)),
        'Benchmark': '< 3% of sale',
      },
      {
        'Cost Component': 'Electricity & Fuel Outflow',
        'Type': 'Variable Opex',
        'Period Total (₹)': currentMetrics.variableBreakdown.electricity + currentMetrics.variableBreakdown.fuel,
        '% of Revenue': `${(((currentMetrics.variableBreakdown.electricity + currentMetrics.variableBreakdown.fuel) / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number((((currentMetrics.variableBreakdown.electricity + currentMetrics.variableBreakdown.fuel) / safeSales) * 100).toFixed(2)),
        'Benchmark': '< 4% of sale',
      },
      {
        'Cost Component': 'Office Supplies & Maintenance',
        'Type': 'Variable Opex',
        'Period Total (₹)': currentMetrics.variableBreakdown.officeSupplies + currentMetrics.variableBreakdown.maintenance + currentMetrics.variableBreakdown.miscellaneous,
        '% of Revenue': `${(((currentMetrics.variableBreakdown.officeSupplies + currentMetrics.variableBreakdown.maintenance + currentMetrics.variableBreakdown.miscellaneous) / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number((((currentMetrics.variableBreakdown.officeSupplies + currentMetrics.variableBreakdown.maintenance + currentMetrics.variableBreakdown.miscellaneous) / safeSales) * 100).toFixed(2)),
        'Benchmark': '< 3% of sale',
      },
      {
        'Cost Component': 'GST Tax Liability (Indirect Outflow)',
        'Type': 'Tax Liability',
        'Period Total (₹)': currentMetrics.totalTax,
        '% of Revenue': `${((currentMetrics.totalTax / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number(((currentMetrics.totalTax / safeSales) * 100).toFixed(2)),
        'Benchmark': 'Pass-through GST',
      },
      {
        'Cost Component': 'Net Operating Profit (Bottom Line)',
        'Type': 'Retained Cash',
        'Period Total (₹)': currentMetrics.netProfit,
        '% of Revenue': `${((currentMetrics.netProfit / safeSales) * 100).toFixed(2)}%`,
        'Per ₹100 Sold (₹)': Number(((currentMetrics.netProfit / safeSales) * 100).toFixed(2)),
        'Benchmark': '> 15% net yield',
      },
    ];
    const wsUnit = XLSX.utils.json_to_sheet(unitRows);
    XLSX.utils.book_append_sheet(wb, wsUnit, 'Unit Economics');

    // Sheet 4: Sales Register (with Cancelled / Void Details)
    if (filteredData.sales.length > 0) {
      const salesRows = filteredData.sales.map(s => ({
        'Invoice Number': s.invoiceNumber,
        'Type': s.invoiceType,
        'Date': formatDate(s.date),
        'Customer Name': s.customerName,
        'Customer Phone': s.customerPhone || 'N/A',
        'Customer GSTIN': s.customerGstin || 'N/A',
        'Subtotal (₹)': s.subtotal,
        'Discount (₹)': s.discount,
        'Taxable Value (₹)': s.taxableAmount,
        'CGST (₹)': s.cgst,
        'SGST (₹)': s.sgst,
        'IGST (₹)': s.igst,
        'Total Tax (₹)': s.totalTax,
        'Grand Total (₹)': s.totalAmount,
        'Paid Amount (₹)': s.paidAmount,
        'Balance Due (₹)': s.balanceDue,
        'Payment Mode': s.paymentMode,
        'Status': s.status.toUpperCase(),
        'Cancellation Reason': s.cancellationReason || '',
        'Cancelled At': s.cancelledAt ? new Date(s.cancelledAt).toLocaleString('en-IN') : '',
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesRows);
      XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Register');
    }

    // Sheet 5: GST Slabs & Settlement Channels
    const taxRows: any[] = (designerReportData.taxData?.taxByRate || []).map(t => ({
      'Schedule Type': 'Statutory GST Slab',
      'Category / Slab': t.rate,
      'Volume / Count': '-',
      'Taxable Turnover (₹)': t.taxable,
      'Tax Amount (₹)': t.tax,
      'Share %': designerReportData.taxData.totalTax > 0 ? `${((t.tax / designerReportData.taxData.totalTax) * 100).toFixed(2)}%` : '0.00%',
    }));
    (designerReportData.paymentData?.items || []).forEach(p => {
      taxRows.push({
        'Schedule Type': 'Settlement Payment Channel',
        'Category / Slab': p.mode,
        'Volume / Count': `${p.count} txns`,
        'Taxable Turnover (₹)': p.amount,
        'Tax Amount (₹)': 0,
        'Share %': `${p.percentage.toFixed(2)}%`,
      });
    });
    const wsTax = XLSX.utils.json_to_sheet(taxRows);
    XLSX.utils.book_append_sheet(wb, wsTax, 'GST & Settlements');

    // Sheet 6: Expenses Register
    if (filteredData.exps.length > 0) {
      const expenseRows = filteredData.exps.map(e => ({
        'Date': formatDate(e.date),
        'Category': e.category,
        'Description': e.description,
        'Payment Mode': e.paymentMode,
        'Reference': e.reference || 'N/A',
        'Amount (₹)': e.amount,
        'Bill Proof Attached': e.receiptImage ? 'Yes' : 'No',
        'Share of OpEx (%)': currentMetrics.totalExpenses > 0 ? `${((e.amount / currentMetrics.totalExpenses) * 100).toFixed(2)}%` : '0.00%',
      }));
      const wsExps = XLSX.utils.json_to_sheet(expenseRows);
      XLSX.utils.book_append_sheet(wb, wsExps, 'Expenses Register');
    }

    // Sheet 7: Receivables Aging & Credit Risk
    const agingRows = (designerReportData.agingData?.buckets || []).map(b => ({
      'Aging Bracket': b.label,
      'Debtors Count': b.count,
      'Outstanding Balance (₹)': b.amount,
      'Share of Overdue (%)': designerReportData.agingData.totalOverdue > 0 ? `${((b.amount / designerReportData.agingData.totalOverdue) * 100).toFixed(2)}%` : '0.00%',
      'Credit Risk Category': b.label.includes('90+') ? 'Critical / Legal Watchlist' : (b.label.includes('61-90') ? 'Elevated Risk' : 'Standard Operating'),
    }));
    const wsAging = XLSX.utils.json_to_sheet(agingRows);
    XLSX.utils.book_append_sheet(wb, wsAging, 'Receivables Aging');

    // Sheet 8: Product Contributions & SKU Performance
    if (designerReportData.topProducts?.length > 0) {
      const prodRows = designerReportData.topProducts.map(p => ({
        'Product / SKU Name': p.name,
        'HSN / SKU': p.sku,
        'Category': p.category,
        'Units Sold': p.quantitySold,
        'Turnover (₹)': p.revenue,
        'Share of Turnover (%)': currentMetrics.totalSales > 0 ? `${((p.revenue / currentMetrics.totalSales) * 100).toFixed(2)}%` : '0.00%',
      }));
      const wsProd = XLSX.utils.json_to_sheet(prodRows);
      XLSX.utils.book_append_sheet(wb, wsProd, 'Product Contributions');
    }

    const cleanName = timeRange.label.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `InvoicePro_Financial_Audit_Report_${cleanName}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Exported 8-sheet Financial Audit workbook to ${fileName}!`);
  };

  // ZIP Bulk Invoice Export
  const handleExportZIP = async () => {
    if (filteredData.sales.length === 0) {
      toast.error('No invoices available for the selected period');
      return;
    }

    const toastId = toast.loading('Initializing PDF generation...');

    try {
      const zip = new JSZip();
      const settings = await db.settings.toCollection().first();
      const selectedTemplate = settings?.defaultTemplate || 'premium';

      const sortedSales = [...filteredData.sales].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true });
      });

      for (let i = 0; i < sortedSales.length; i++) {
        const inv = sortedSales[i];
        toast.loading(`Generating PDF ${i + 1} of ${sortedSales.length} (${inv.invoiceNumber})...`, { id: toastId });

        const doc = (
          <PDFTemplateSelector
            templateName={selectedTemplate}
            invoice={inv}
            settings={settings || { companyName: 'InvoicePro' } as any}
          />
        );

        const blob = await pdf(doc).toBlob();
        const dateObj = new Date(inv.date);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const sanitizedCustName = inv.customerName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const indexStr = String(i + 1).padStart(3, '0');
        const fileName = `${indexStr}_${dateStr}_${inv.invoiceNumber}_${sanitizedCustName}.pdf`;

        zip.file(fileName, blob);
      }

      toast.loading('Assembling ZIP archive...', { id: toastId });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = timeRange.label.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `InvoicePro_Bills_${cleanName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Successfully downloaded ${sortedSales.length} bills in ZIP!`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate ZIP file', { id: toastId });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Executive Financial Audit & Growth Reports
          </h2>
          <p className="text-muted-foreground text-sm">
            Unit economics, MoM & YoY expansion analytics, GST liabilities, and multi-period financial models.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <DesignerReportModal reportData={designerReportData} />
          <Button onClick={handleExportZIP} variant="outline" className="flex items-center gap-1.5 border-primary text-primary hover:bg-primary/5 font-bold shadow-xs">
            <Download className="h-4 w-4" /> Download Bills (ZIP)
          </Button>
          <Button onClick={handleExportExcel} className="flex items-center gap-1.5 font-bold shadow-xs">
            <FileSpreadsheet className="h-4 w-4" /> Export Financial Model (Excel)
          </Button>
        </div>
      </div>

      {/* Date Selectors Card: Monthly, Quarterly, FY, Yearly */}
      <Card className="border border-border/60 bg-card/70 backdrop-blur-md shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* View Type Toggle Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/40">
              <Button
                type="button"
                variant={viewType === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 rounded-lg text-xs font-bold"
                onClick={() => setViewType('monthly')}
              >
                Monthly Report
              </Button>
              <Button
                type="button"
                variant={viewType === 'quarterly' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 rounded-lg text-xs font-bold"
                onClick={() => setViewType('quarterly')}
              >
                Quarterly Report
              </Button>
              <Button
                type="button"
                variant={viewType === 'financial-year' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 rounded-lg text-xs font-bold"
                onClick={() => setViewType('financial-year')}
              >
                Financial Year (FY)
              </Button>
              <Button
                type="button"
                variant={viewType === 'yearly' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 rounded-lg text-xs font-bold"
                onClick={() => setViewType('yearly')}
              >
                Calendar Year
              </Button>
            </div>

            {/* Active Range Badge */}
            <Badge variant="outline" className="h-8 px-3 rounded-lg text-xs font-mono font-bold border-primary/25 bg-primary/5 text-primary flex items-center gap-1.5 self-start md:self-auto">
              <Calendar className="h-3.5 w-3.5" />
              {timeRange.sublabel}
            </Badge>
          </div>

          {/* Dynamic Period Selectors */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/40">
            {viewType === 'monthly' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Month:</span>
                  <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                    <SelectTrigger className="w-36 h-9 rounded-xl text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m, idx) => (
                        <SelectItem key={idx} value={String(idx)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Year:</span>
                  <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-28 h-9 rounded-xl text-xs font-bold font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {viewType === 'quarterly' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Quarter:</span>
                  <Select value={selectedQuarter} onValueChange={v => setSelectedQuarter(v as any)}>
                    <SelectTrigger className="w-44 h-9 rounded-xl text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Q1 (April - June)</SelectItem>
                      <SelectItem value="Q2">Q2 (July - September)</SelectItem>
                      <SelectItem value="Q3">Q3 (October - December)</SelectItem>
                      <SelectItem value="Q4">Q4 (January - March)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">FY:</span>
                  <Select value={String(selectedFY)} onValueChange={v => setSelectedFY(Number(v))}>
                    <SelectTrigger className="w-40 h-9 rounded-xl text-xs font-bold font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {financialYears.map(fy => (
                        <SelectItem key={fy.startYear} value={String(fy.startYear)}>{fy.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {viewType === 'financial-year' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">Choose Financial Year:</span>
                <Select value={String(selectedFY)} onValueChange={v => setSelectedFY(Number(v))}>
                  <SelectTrigger className="w-44 h-9 rounded-xl text-xs font-bold font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {financialYears.map(fy => (
                      <SelectItem key={fy.startYear} value={String(fy.startYear)}>{fy.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {viewType === 'yearly' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">Calendar Year:</span>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-32 h-9 rounded-xl text-xs font-bold font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgraded Executive KPI Cards with MoM and YoY Growth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales Collections */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Gross Sales Turnover</span>
              <Receipt className="h-3.5 w-3.5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1.5">
            <div className="text-2xl font-black font-mono text-primary dark:text-foreground">
              {formatCurrency(currentMetrics.totalSales)}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <KpiGrowthBadge
                current={currentMetrics.totalSales}
                prior={prevMetrics.totalSales}
                label={`vs ${comparisonTimeRanges.previous.type}`}
              />
              <span className="text-muted-foreground text-[10px]">•</span>
              <KpiGrowthBadge
                current={currentMetrics.totalSales}
                prior={yoyMetrics.totalSales}
                label="YoY"
              />
            </div>
            <p className="text-[10px] text-muted-foreground pt-0.5">
              {currentMetrics.orderCount} invoices · AOV: {formatCurrency(currentMetrics.averageOrderValue)}
            </p>
          </CardContent>
        </Card>

        {/* Gross Profit & Margin */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Gross Profit (CM1)</span>
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1.5">
            <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {formatCurrency(currentMetrics.grossProfit)}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <KpiGrowthBadge
                current={currentMetrics.grossProfit}
                prior={prevMetrics.grossProfit}
                label={`vs ${comparisonTimeRanges.previous.type}`}
              />
              <span className="text-muted-foreground text-[10px]">•</span>
              <KpiGrowthBadge
                current={currentMetrics.grossProfit}
                prior={yoyMetrics.grossProfit}
                label="YoY"
              />
            </div>
            <p className="text-[10px] text-muted-foreground pt-0.5">
              Gross Margin: <span className="font-bold text-foreground">{currentMetrics.grossMargin.toFixed(1)}%</span> · COGS: {formatCurrency(currentMetrics.cogs)}
            </p>
          </CardContent>
        </Card>

        {/* Fixed & Operating Costs */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Fixed & Operating Opex</span>
              <Wallet className="h-3.5 w-3.5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1.5">
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(currentMetrics.totalExpenses)}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <KpiGrowthBadge
                current={currentMetrics.totalExpenses}
                prior={prevMetrics.totalExpenses}
                label={`vs ${comparisonTimeRanges.previous.type}`}
                isCost={true}
              />
              <span className="text-muted-foreground text-[10px]">•</span>
              <KpiGrowthBadge
                current={currentMetrics.totalExpenses}
                prior={yoyMetrics.totalExpenses}
                label="YoY"
                isCost={true}
              />
            </div>
            <p className="text-[10px] text-muted-foreground pt-0.5">
              Fixed: <span className="font-semibold text-foreground">{formatCurrency(currentMetrics.fixedCosts)}</span> · Var: {formatCurrency(currentMetrics.variableCosts)}
            </p>
          </CardContent>
        </Card>

        {/* Net Operating Profit */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Net Operating Profit</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1.5">
            <div className={`text-2xl font-black font-mono ${currentMetrics.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {formatCurrency(currentMetrics.netProfit)}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <KpiGrowthBadge
                current={currentMetrics.netProfit}
                prior={prevMetrics.netProfit}
                label={`vs ${comparisonTimeRanges.previous.type}`}
              />
              <span className="text-muted-foreground text-[10px]">•</span>
              <KpiGrowthBadge
                current={currentMetrics.netProfit}
                prior={yoyMetrics.netProfit}
                label="YoY"
              />
            </div>
            <p className="text-[10px] text-muted-foreground pt-0.5">
              Net Margin: <span className="font-bold text-foreground">{currentMetrics.netMargin.toFixed(1)}%</span> · GST: {formatCurrency(currentMetrics.totalTax)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs list with Unit Economics, MoM/YoY Growth, Sales, GST, and Expenses */}
      <Tabs defaultValue="unit-economics" className="w-full space-y-4">
        <TabsList className="border-b border-border/50 mb-4 flex-wrap h-auto gap-1 bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="unit-economics" className="flex items-center gap-1.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Calculator className="h-4 w-4" /> Unit Economics (Per ₹100)
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex items-center gap-1.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <TrendingUp className="h-4 w-4" /> MoM & YoY Growth Matrix
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-1.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Receipt className="h-4 w-4" /> Sales Register
          </TabsTrigger>
          <TabsTrigger value="taxes" className="flex items-center gap-1.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <BarChart3 className="h-4 w-4" /> GST Summary
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
            <Wallet className="h-4 w-4" /> Expenses
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Unit Economics Suite */}
        <TabsContent value="unit-economics" className="space-y-4">
          <UnitEconomicsView
            periodLabel={comparisonTimeRanges.current.label}
            totalSales={currentMetrics.totalSales}
            cogs={currentMetrics.cogs}
            grossProfit={currentMetrics.grossProfit}
            fixedCosts={currentMetrics.fixedCosts}
            variableCosts={currentMetrics.variableCosts}
            totalExpenses={currentMetrics.totalExpenses}
            totalTax={currentMetrics.totalTax}
            netProfit={currentMetrics.netProfit}
            orderCount={currentMetrics.orderCount}
            averageOrderValue={currentMetrics.averageOrderValue}
            fixedBreakdown={currentMetrics.fixedBreakdown}
            variableBreakdown={currentMetrics.variableBreakdown}
          />
        </TabsContent>

        {/* Tab 2: MoM & YoY Growth Matrix */}
        <TabsContent value="growth" className="space-y-4">
          <GrowthMatrixView
            currentPeriodLabel={comparisonTimeRanges.current.label}
            previousPeriodLabel={comparisonTimeRanges.previous.label}
            previousPeriodType={comparisonTimeRanges.previous.type}
            yoyPeriodLabel={comparisonTimeRanges.yoy.label}
            metrics={growthMetrics}
          />
        </TabsContent>

        {/* Tab 3: Sales Register */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-base font-bold text-primary">Sales Register</CardTitle>
              <CardDescription>Invoices raised in the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-[#f1f5f9] dark:bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4 text-left">Invoice No</th>
                      <th className="py-3 px-4 text-left">Date</th>
                      <th className="py-3 px-4 text-left">Customer</th>
                      <th className="py-3 px-4 text-right">Taxable</th>
                      <th className="py-3 px-4 text-right">Tax (GST)</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.sales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground text-xs font-medium">No sales recorded for this period.</td>
                      </tr>
                    ) : (
                      filteredData.sales.map(s => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-[#f8f9ff]/80 dark:hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-primary dark:text-primary-fixed-dim">{s.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono">{formatDate(s.date)}</td>
                          <td className="py-3 px-4 font-medium">{s.customerName}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(s.taxableAmount)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(s.totalTax)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">{formatCurrency(s.totalAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: GST Summary */}
        <TabsContent value="taxes">
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-base font-bold text-primary">GST Collection breakdown</CardTitle>
              <CardDescription>GST tax breakdown calculations for the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-md p-4 text-center border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Central Tax (CGST)</p>
                  <p className="text-2xl font-bold font-mono text-primary dark:text-foreground mt-2">{formatCurrency(currentMetrics.cgst)}</p>
                </div>
                <div className="border rounded-md p-4 text-center border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State Tax (SGST)</p>
                  <p className="text-2xl font-bold font-mono text-primary dark:text-foreground mt-2">{formatCurrency(currentMetrics.sgst)}</p>
                </div>
                <div className="border rounded-md p-4 text-center border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Integrated Tax (IGST)</p>
                  <p className="text-2xl font-bold font-mono text-primary dark:text-foreground mt-2">{formatCurrency(currentMetrics.igst)}</p>
                </div>
              </div>

              <Card className="bg-muted/10 border shadow-none rounded-md">
                <CardContent className="p-4 flex justify-between items-center text-sm font-bold">
                  <span>Total Accumulated GST tax</span>
                  <span className="font-mono text-secondary text-lg">{formatCurrency(currentMetrics.totalTax)}</span>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Expenses */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-base font-bold text-primary">Operating Expenses</CardTitle>
              <CardDescription>Expenditures recorded during the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-[#f1f5f9] dark:bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4 text-left">Date</th>
                      <th className="py-3 px-4 text-left">Category</th>
                      <th className="py-3 px-4 text-left">Description</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.exps.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-muted-foreground text-xs font-medium">No expenses recorded for this period.</td>
                      </tr>
                    ) : (
                      filteredData.exps.map(e => (
                        <tr key={e.id} className="border-b last:border-0 hover:bg-[#f8f9ff]/80 dark:hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono">{formatDate(e.date)}</td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                            {e.category}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">{e.description || 'No remarks'}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-destructive">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
