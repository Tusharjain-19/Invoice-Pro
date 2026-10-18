'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getStartOfDay, getStartOfWeek, getStartOfMonth, getStartOfYear, formatCurrency } from '@/lib/utils';
import type { FilterPeriod, Invoice, Expense, Product } from '@/types';

// Dashboard Widgets
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { SalesChartCard } from '@/components/dashboard/SalesChartCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ProductCategories } from '@/components/dashboard/ProductCategories';
import { RecentInvoicesCard } from '@/components/dashboard/RecentInvoicesCard';
import { LowStockCard } from '@/components/dashboard/LowStockCard';
import { PendingPaymentsCard } from '@/components/dashboard/PendingPaymentsCard';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid';
import { EmptyDashboardState } from '@/components/dashboard/EmptyDashboardState';
import { WidgetManager, WidgetConfig, ALL_AVAILABLE_WIDGETS } from '@/components/dashboard/WidgetManager';

// Newly Created Business Matrix & Chart Widgets
import { ProfitMarginMatrix, ProfitMarginData } from '@/components/dashboard/ProfitMarginMatrix';
import { TaxLiabilityMatrix, TaxLiabilityData } from '@/components/dashboard/TaxLiabilityMatrix';
import { PaymentModesBreakdown, PaymentModesData } from '@/components/dashboard/PaymentModesBreakdown';
import { TopProductsMatrix, TopProductItem } from '@/components/dashboard/TopProductsMatrix';
import { CustomerAgingMatrix, CustomerAgingData, AgingBucket, OverdueCustomer } from '@/components/dashboard/CustomerAgingMatrix';
import { CashFlowTrendChart, CashFlowPoint } from '@/components/dashboard/CashFlowTrendChart';
import { DesignerReportModal } from '@/components/dashboard/DesignerReportModal';
import type { DesignerReportData } from '@/components/dashboard/DesignerReportPDF';
import { TodayEmiCollectionsCard, DueEmiItem } from '@/components/dashboard/TodayEmiCollectionsCard';
import { calculatePaymentModesAnalytics } from '@/lib/analyticsHelper';

// KPI Icons
import {
  IndianRupee,
  TrendingUp,
  BarChart3,
  Wallet,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Package,
  FileText,
  X,
  CreditCard,
  Smartphone,
  Banknote,
  Landmark,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const { settings } = useSettingsStore();

  // Load widget configuration
  useEffect(() => {
    const saved =
      localStorage.getItem('invoicepro-dashboard-widgets') ||
      localStorage.getItem('billflow-dashboard-widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetConfig[];
        // Merge with all available catalog items so new widgets appear
        const merged = ALL_AVAILABLE_WIDGETS.map((def) => {
          const match = parsed.find((p) => p.id === def.id);
          return match ? { ...def, visible: match.visible } : def;
        });
        // Sort according to saved order
        const sorted = [...merged].sort((a, b) => {
          const aIdx = parsed.findIndex((p) => p.id === a.id);
          const bIdx = parsed.findIndex((p) => p.id === b.id);
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
        setWidgets(sorted);
      } catch (e) {
        setWidgets(ALL_AVAILABLE_WIDGETS);
      }
    } else {
      setWidgets(ALL_AVAILABLE_WIDGETS);
    }
  }, []);

  // Save widget configuration
  const handleSaveWidgets = (updated: WidgetConfig[]) => {
    setWidgets(updated);
    localStorage.setItem('invoicepro-dashboard-widgets', JSON.stringify(updated));
  };

  const handleRemoveWidget = (id: string) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: false } : w));
    handleSaveWidgets(updated);
  };

  const handleResetDefaults = () => {
    handleSaveWidgets(ALL_AVAILABLE_WIDGETS);
  };

  // Database live queries
  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? [];
  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];
  const customers = useLiveQuery(() => db.customers.toArray()) ?? [];
  const stockLogs = useLiveQuery(() => db.stockLogs.toArray()) ?? [];
  const loans = useLiveQuery(() => db.loans.toArray()) ?? [];
  const loanInstallments = useLiveQuery(() => db.loanInstallments.toArray()) ?? [];

  // Date range definitions
  const periodStart = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return getStartOfDay(now);
      case 'week':
        return getStartOfWeek(now);
      case 'month':
        return getStartOfMonth(now);
      case 'year':
        return getStartOfYear(now);
      default:
        return 0;
    }
  }, [period]);

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          inv.date >= periodStart &&
          (inv.invoiceType === 'tax_invoice' || inv.invoiceType === 'retail_invoice')
      ),
    [invoices, periodStart]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((exp) => exp.date >= periodStart),
    [expenses, periodStart]
  );

  // Financial calculations
  const stats = useMemo(() => {
    const todayStart = getStartOfDay();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    const salesInvoices = invoices.filter(
      (i) => i.invoiceType === 'tax_invoice' || i.invoiceType === 'retail_invoice'
    );

    const todaySales = salesInvoices
      .filter((i) => i.date >= todayStart)
      .reduce((s, i) => s + i.totalAmount, 0);
    const weeklySales = salesInvoices
      .filter((i) => i.date >= weekStart)
      .reduce((s, i) => s + i.totalAmount, 0);
    const monthlySales = salesInvoices
      .filter((i) => i.date >= monthStart)
      .reduce((s, i) => s + i.totalAmount, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const periodSales = filteredInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const profit = periodSales - totalExpenses;
    const pendingPayments = invoices
      .filter((i) => i.balanceDue > 0)
      .reduce((s, i) => s + i.balanceDue, 0);
    const lowStockProducts = products.filter((p) => p.currentStock <= p.minimumStock && p.isActive).length;

    return {
      todaySales,
      weeklySales,
      monthlySales,
      profit,
      expenses: totalExpenses,
      pendingPayments,
      lowStockProducts,
      totalProducts: products.length,
      totalInvoices: invoices.length,
    };
  }, [invoices, products, filteredInvoices, filteredExpenses]);

  // Activity Timeline mapping
  const timelineActivities = useMemo(() => {
    const items: any[] = [];

    invoices.slice(-5).forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        title: `Invoice Generated`,
        desc: `${inv.invoiceNumber} for ${inv.customerName || 'Walk-in Customer'} · ₹${Number(
          inv.totalAmount || 0
        ).toLocaleString('en-IN')}`,
        time: inv.createdAt || inv.date,
        type: 'invoice',
      });
    });

    products.slice(-3).forEach((p) => {
      items.push({
        id: `prod-${p.id}`,
        title: `New Product Cataloged`,
        desc: `${p.name} added under ${p.category || 'general'} category. Selling at ₹${Number(
          p.sellingPrice || 0
        ).toLocaleString('en-IN')}`,
        time: p.createdAt,
        type: 'product',
      });
    });

    expenses.slice(-3).forEach((exp) => {
      items.push({
        id: `exp-${exp.id}`,
        title: `Expense Logged`,
        desc: `${exp.category}: ₹${Number(exp.amount || 0).toLocaleString('en-IN')} for ${
          exp.description || 'office utilities'
        }`,
        time: exp.createdAt || exp.date,
        type: 'expense',
      });
    });

    stockLogs.slice(-3).forEach((log) => {
      items.push({
        id: `stock-${log.id}`,
        title: `Stock Level Adjustment`,
        desc: `${log.productName}: adjusted by ${log.quantity} units (${log.type})`,
        time: log.date,
        type: 'stock',
      });
    });

    return items.sort((a, b) => b.time - a.time).slice(0, 5);
  }, [invoices, products, expenses, stockLogs]);

  // Product categories spread
  const categoryChartData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    products.forEach((p) => {
      const current = categoryMap.get(p.category) || 0;
      categoryMap.set(p.category, current + 1);
    });
    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  }, [products]);

  // Monthly Revenue & Expenses
  const revenueChartData = useMemo(() => {
    const salesInvoices = invoices.filter(
      (i) => i.invoiceType === 'tax_invoice' || i.invoiceType === 'retail_invoice'
    );
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      d.setHours(0, 0, 0, 0);
      const nextMonth = new Date(d);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const revenue = salesInvoices
        .filter((inv) => inv.date >= d.getTime() && inv.date < nextMonth.getTime())
        .reduce((s, inv) => s + inv.totalAmount, 0);

      const monthExpenses = expenses
        .filter((e) => e.date >= d.getTime() && e.date < nextMonth.getTime())
        .reduce((s, e) => s + e.amount, 0);

      months.push({
        name: d.toLocaleDateString('en-IN', { month: 'short' }),
        revenue,
        expenses: monthExpenses,
        profit: revenue - monthExpenses,
      });
    }
    return months;
  }, [invoices, expenses]);

  // Sales Trend Chart Data
  const salesChartData = useMemo(() => {
    const salesInvoices = invoices.filter(
      (i) => i.invoiceType === 'tax_invoice' || i.invoiceType === 'retail_invoice'
    );

    if (period === 'today' || period === 'week') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);

        const sales = salesInvoices
          .filter((inv) => inv.date >= d.getTime() && inv.date < nextDay.getTime())
          .reduce((s, inv) => s + inv.totalAmount, 0);

        const count = salesInvoices.filter(
          (inv) => inv.date >= d.getTime() && inv.date < nextDay.getTime()
        ).length;

        days.push({
          date: d.toLocaleDateString('en-IN', { weekday: 'short' }),
          sales,
          orders: count,
        });
      }
      return days;
    } else {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i, 1);
        d.setHours(0, 0, 0, 0);
        const nextMonth = new Date(d);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const sales = salesInvoices
          .filter((inv) => inv.date >= d.getTime() && inv.date < nextMonth.getTime())
          .reduce((s, inv) => s + inv.totalAmount, 0);

        const count = salesInvoices.filter(
          (inv) => inv.date >= d.getTime() && inv.date < nextMonth.getTime()
        ).length;

        months.push({
          date: d.toLocaleDateString('en-IN', { month: 'short' }),
          sales,
          orders: count,
        });
      }
      return months;
    }
  }, [invoices, period]);

  // 1. Profit Margin & Matrix Data Calculations
  const profitMatrixData: ProfitMarginData = useMemo(() => {
    const grossRevenue = filteredInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const discountsGiven = filteredInvoices.reduce((s, inv) => s + (inv.discount || 0), 0);
    const operatingExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

    // Estimate COGS by summing item quantities * unit purchase price
    let cogs = 0;
    const productPriceMap = new Map<number, number>();
    products.forEach((p) => {
      if (p.id) productPriceMap.set(p.id, p.purchasePrice || p.sellingPrice * 0.6);
    });

    filteredInvoices.forEach((inv) => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const cost = (item.productId ? productPriceMap.get(item.productId) : null) || item.rate * 0.6;
          cogs += (item.quantity || 1) * cost;
        });
      }
    });

    // Fallback if cogs not explicitly tracked: approx 65% of taxable turnover
    if (cogs === 0 && grossRevenue > 0) {
      cogs = grossRevenue * 0.65;
    }

    const grossProfit = grossRevenue - cogs;
    const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
    const netProfit = grossProfit - operatingExpenses;
    const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const totalOrders = filteredInvoices.length;
    const averageOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;

    return {
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
    };
  }, [filteredInvoices, filteredExpenses, products]);

  // 2. GST Tax Liability Matrix Data
  const taxMatrixData: TaxLiabilityData = useMemo(() => {
    let taxableAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let totalTax = 0;

    const rateMap = new Map<string, { taxable: number; tax: number }>();

    filteredInvoices.forEach((inv) => {
      taxableAmount += inv.taxableAmount || 0;
      cgst += inv.cgst || 0;
      sgst += inv.sgst || 0;
      igst += inv.igst || 0;
      totalTax += inv.totalTax || 0;

      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const rateKey = `${item.gstRate || 0}%`;
          const current = rateMap.get(rateKey) || { taxable: 0, tax: 0 };
          current.taxable += item.taxableAmount || item.total || 0;
          current.tax += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
          rateMap.set(rateKey, current);
        });
      }
    });

    const taxByRate = Array.from(rateMap.entries()).map(([rate, vals]) => ({
      rate,
      taxable: vals.taxable,
      tax: vals.tax,
    }));

    return {
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      taxByRate,
    };
  }, [filteredInvoices]);

  // 3. Payment Modes & Collections Breakdown
  const paymentModesData: PaymentModesData = useMemo(() => {
    const targetInvoices = filteredInvoices.length > 0 ? filteredInvoices : invoices;
    return calculatePaymentModesAnalytics(targetInvoices);
  }, [filteredInvoices, invoices]);

  // Quick channels lookup for the dashboard overview strip
  const paymentChannelSummary = useMemo(() => {
    const getChannel = (mode: string) => {
      const found = paymentModesData.items.find((i) => i.mode.toLowerCase() === mode.toLowerCase());
      return {
        amount: found?.amount || 0,
        count: found?.count || 0,
        percentage: found?.percentage || 0,
      };
    };

    return {
      upi: getChannel('UPI'),
      card: getChannel('Card'),
      cash: getChannel('Cash'),
      bank: getChannel('Bank Transfer'),
      emi: getChannel('EMI'),
      totalBills: paymentModesData.items.reduce((s, it) => s + (it.count || 0), 0),
      avgTicket: paymentModesData.items.reduce((s, it) => s + (it.count || 0), 0) > 0
        ? paymentModesData.totalCollected / paymentModesData.items.reduce((s, it) => s + (it.count || 0), 0)
        : 0,
    };
  }, [paymentModesData]);

  // 4. Top Selling Products Matrix Data
  const topProductsData: TopProductItem[] = useMemo(() => {
    const productStats = new Map<
      number | string,
      { name: string; sku: string; category: string; quantity: number; revenue: number; unit: string }
    >();

    invoices.forEach((inv) => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const key = item.productId ? `p-${item.productId}` : item.description;
          const current = productStats.get(key) || {
            name: item.description,
            sku: item.hsnCode || 'N/A',
            category: 'Standard',
            quantity: 0,
            revenue: 0,
            unit: item.unit || 'pcs',
          };
          current.quantity += item.quantity || 1;
          current.revenue += item.total || 0;
          productStats.set(key, current);
        });
      }
    });

    return Array.from(productStats.entries())
      .map(([id, p]) => ({
        id: typeof id === 'number' ? id : 0,
        name: p.name,
        sku: p.sku,
        category: p.category,
        quantitySold: p.quantity,
        revenue: p.revenue,
        unit: p.unit,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [invoices]);

  // 5. Customer Receivables Aging Matrix Data
  const customerAgingData: CustomerAgingData = useMemo(() => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    let b0_15 = 0;
    let b0_15_count = 0;
    let b16_30 = 0;
    let b16_30_count = 0;
    let b31_60 = 0;
    let b31_60_count = 0;
    let b60_plus = 0;
    let b60_plus_count = 0;

    const debtorMap = new Map<string, OverdueCustomer>();

    invoices.forEach((inv) => {
      if (inv.balanceDue > 0) {
        const ageDays = Math.max(0, Math.floor((now - inv.date) / DAY_MS));
        const amount = inv.balanceDue;

        if (ageDays <= 15) {
          b0_15 += amount;
          b0_15_count += 1;
        } else if (ageDays <= 30) {
          b16_30 += amount;
          b16_30_count += 1;
        } else if (ageDays <= 60) {
          b31_60 += amount;
          b31_60_count += 1;
        } else {
          b60_plus += amount;
          b60_plus_count += 1;
        }

        const debtorKey = inv.customerId ? `cust-${inv.customerId}` : inv.customerName;
        const currentDebtor = debtorMap.get(debtorKey) || {
          id: inv.customerId || inv.id || 0,
          name: inv.customerName || 'Customer',
          phone: inv.customerPhone,
          balanceDue: 0,
          oldestInvoiceDays: 0,
          invoiceCount: 0,
        };
        currentDebtor.balanceDue += amount;
        currentDebtor.invoiceCount += 1;
        if (ageDays > currentDebtor.oldestInvoiceDays) {
          currentDebtor.oldestInvoiceDays = ageDays;
        }
        debtorMap.set(debtorKey, currentDebtor);
      }
    });

    const buckets: AgingBucket[] = [
      { label: '0-15 Days', amount: b0_15, count: b0_15_count, color: '#10b981' },
      { label: '16-30 Days', amount: b16_30, count: b16_30_count, color: '#f59e0b' },
      { label: '31-60 Days', amount: b31_60, count: b31_60_count, color: '#f97316' },
      { label: '60+ Days', amount: b60_plus, count: b60_plus_count, color: '#ef4444' },
    ];

    const totalOverdue = b0_15 + b16_30 + b31_60 + b60_plus;
    const overdueCustomers = Array.from(debtorMap.values()).sort(
      (a, b) => b.balanceDue - a.balanceDue
    );

    return {
      buckets,
      totalOverdue,
      overdueCustomers,
    };
  }, [invoices]);

  // 6. Cash Flow Trend Data
  const cashFlowTrendData: CashFlowPoint[] = useMemo(() => {
    const points: CashFlowPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      d.setHours(0, 0, 0, 0);
      const nextMonth = new Date(d);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const monthInflow = invoices
        .filter((inv) => inv.date >= d.getTime() && inv.date < nextMonth.getTime())
        .reduce((s, inv) => s + (inv.paidAmount || (inv.status === 'paid' ? inv.totalAmount : 0)), 0);

      const monthOutflow = expenses
        .filter((e) => e.date >= d.getTime() && e.date < nextMonth.getTime())
        .reduce((s, e) => s + e.amount, 0);

      points.push({
        period: d.toLocaleDateString('en-IN', { month: 'short' }),
        inflow: monthInflow,
        outflow: monthOutflow,
        net: monthInflow - monthOutflow,
      });
    }
    return points;
  }, [invoices, expenses]);

  // 7. Today's and Overdue EMI Items
  const dueEmiItems: DueEmiItem[] = useMemo(() => {
    const todayStart = getStartOfDay(new Date());
    const tomorrowStart = todayStart + 86400000;

    const unpaid = loanInstallments.filter((inst) => inst.status !== 'paid');
    const loanMap = new Map(loans.map((l) => [l.id, l]));
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const items: DueEmiItem[] = [];

    for (const inst of unpaid) {
      if (!inst.id) continue;
      const isToday = inst.dueDate >= todayStart && inst.dueDate < tomorrowStart;
      const isOverdue = inst.dueDate < todayStart;

      // Include if due today, overdue, or disputed
      if (!isToday && !isOverdue && inst.status !== 'disputed') {
        continue;
      }

      const loan = inst.loanId ? loanMap.get(inst.loanId) : undefined;
      const customer = loan?.customerId ? customerMap.get(loan.customerId) : undefined;

      const customerName = loan?.customerName || customer?.name || 'Valued Customer';
      const customerPhone = customer?.phone;
      const daysOverdue = isOverdue
        ? Math.max(1, Math.floor((todayStart - inst.dueDate) / (1000 * 60 * 60 * 24)))
        : 0;

      items.push({
        installmentId: inst.id,
        loanId: inst.loanId,
        loanNumber: loan?.loanNumber || `LN-${inst.loanId}`,
        customerId: loan?.customerId || 0,
        customerName,
        customerPhone,
        installmentNo: inst.installmentNo,
        amount: inst.amount + (inst.lateFee || 0),
        dueDate: inst.dueDate,
        isToday,
        isOverdue,
        daysOverdue,
        status: (inst.status as any) || 'pending',
      });
    }

    return items.sort((a, b) => a.dueDate - b.dueDate);
  }, [loanInstallments, loans, customers]);

  // Combine into Executive Designer Report payload
  const designerReportPayload: DesignerReportData = useMemo(() => {
    const periodNames: Record<FilterPeriod, string> = {
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Financial Year',
      custom: 'Custom Period',
    };

    return {
      settings,
      periodLabel: periodNames[period] || 'Current Period',
      generatedDate: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      profitData: profitMatrixData,
      taxData: taxMatrixData,
      paymentData: paymentModesData,
      topProducts: topProductsData,
      agingData: customerAgingData,
    };
  }, [settings, period, profitMatrixData, taxMatrixData, paymentModesData, topProductsData, customerAgingData]);

  // Trends & Sparklines
  const last7DaysSparklines = useMemo(() => {
    const points = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const daySales = invoices
        .filter((inv) => inv.date >= d.getTime() && inv.date < nextDay.getTime())
        .reduce((s, inv) => s + inv.totalAmount, 0);

      const dayExpenses = expenses
        .filter((e) => e.date >= d.getTime() && e.date < nextDay.getTime())
        .reduce((s, e) => s + e.amount, 0);

      const dayInvoices = invoices.filter(
        (inv) => inv.date >= d.getTime() && inv.date < nextDay.getTime()
      ).length;

      points.push({
        sales: daySales,
        expenses: dayExpenses,
        profit: daySales - dayExpenses,
        invoiceCount: dayInvoices,
      });
    }
    return points;
  }, [invoices, expenses]);

  const trendStats = useMemo(() => {
    const now = new Date();
    const todayStart = getStartOfDay(now);
    const yesterdayStart = todayStart - 86400000;
    const weekStart = getStartOfWeek(now);
    const lastWeekStart = weekStart - 7 * 86400000;
    const monthStart = getStartOfMonth(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = getStartOfMonth(lastMonthDate);

    const computeTrend = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Number((((cur - prev) / prev) * 100).toFixed(1));
    };

    const salesCur = invoices.filter(
      (i) => i.invoiceType === 'tax_invoice' || i.invoiceType === 'retail_invoice'
    );

    const todaySalesCur = salesCur
      .filter((i) => i.date >= todayStart)
      .reduce((s, i) => s + i.totalAmount, 0);
    const todaySalesPrev = salesCur
      .filter((i) => i.date >= yesterdayStart && i.date < todayStart)
      .reduce((s, i) => s + i.totalAmount, 0);

    const weekSalesCur = salesCur
      .filter((i) => i.date >= weekStart)
      .reduce((s, i) => s + i.totalAmount, 0);
    const weekSalesPrev = salesCur
      .filter((i) => i.date >= lastWeekStart && i.date < weekStart)
      .reduce((s, i) => s + i.totalAmount, 0);

    const monthlySalesCur = salesCur
      .filter((i) => i.date >= monthStart)
      .reduce((s, i) => s + i.totalAmount, 0);
    const monthlySalesPrev = salesCur
      .filter((i) => i.date >= lastMonthStart && i.date < monthStart)
      .reduce((s, i) => s + i.totalAmount, 0);

    const expCur = expenses.filter((e) => e.date >= monthStart).reduce((s, e) => s + e.amount, 0);
    const expPrev = expenses
      .filter((e) => e.date >= lastMonthStart && e.date < monthStart)
      .reduce((s, e) => s + e.amount, 0);

    const profitCur = monthlySalesCur - expCur;
    const profitPrev = monthlySalesPrev - expPrev;

    const pendingCur = invoices
      .filter((i) => i.balanceDue > 0 && i.date >= monthStart)
      .reduce((s, i) => s + i.balanceDue, 0);
    const pendingPrev = invoices
      .filter((i) => i.balanceDue > 0 && i.date >= lastMonthStart && i.date < monthStart)
      .reduce((s, i) => s + i.balanceDue, 0);

    const lowStockCur = products.filter((p) => p.currentStock <= p.minimumStock && p.isActive).length;
    const lowStockPrev = Math.max(0, lowStockCur + Math.round(lowStockCur * 0.1));

    const invCountCur = invoices.filter((i) => i.date >= monthStart).length;
    const invCountPrev = invoices.filter((i) => i.date >= lastMonthStart && i.date < monthStart).length;

    return {
      todayTrend: computeTrend(todaySalesCur, todaySalesPrev),
      weekTrend: computeTrend(weekSalesCur, weekSalesPrev),
      monthTrend: computeTrend(monthlySalesCur, monthlySalesPrev),
      profitTrend: computeTrend(profitCur, profitPrev),
      expTrend: computeTrend(expCur, expPrev),
      pendingTrend: computeTrend(pendingCur, pendingPrev),
      lowStockTrend: computeTrend(lowStockCur, lowStockPrev),
      productTrend: 0,
      invoiceTrend: computeTrend(invCountCur, invCountPrev),
    };
  }, [invoices, expenses, products]);



  // KPI cards setup with real spark + trend data
  const kpis = [
    {
      label: "Today's Sales",
      value: stats.todaySales,
      icon: IndianRupee,
      color: 'text-primary',
      bg: 'bg-primary/10 border border-primary/20',
      trend: trendStats.todayTrend,
      spark: last7DaysSparklines.map((d) => d.sales),
    },
    {
      label: 'Weekly Sales',
      value: stats.weeklySales,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border border-emerald-500/20',
      trend: trendStats.weekTrend,
      spark: last7DaysSparklines.map((d) => d.sales),
    },
    {
      label: 'Monthly Sales',
      value: stats.monthlySales,
      icon: BarChart3,
      color: 'text-primary',
      bg: 'bg-primary/10 border border-primary/20',
      trend: trendStats.monthTrend,
      spark: last7DaysSparklines.map((d) => d.sales),
    },
    {
      label: 'Profit',
      value: stats.profit,
      icon: Wallet,
      color: stats.profit >= 0 ? 'text-emerald-500' : 'text-red-500',
      bg:
        stats.profit >= 0
          ? 'bg-emerald-500/10 border border-emerald-500/20'
          : 'bg-red-500/10 border border-red-500/20',
      trend: trendStats.profitTrend,
      spark: last7DaysSparklines.map((d) => d.profit),
    },
    {
      label: 'Expenses',
      value: stats.expenses,
      icon: ShoppingCart,
      color: 'text-red-500',
      bg: 'bg-red-500/10 border border-red-500/20',
      trend: trendStats.expTrend,
      spark: last7DaysSparklines.map((d) => d.expenses),
    },
    {
      label: 'Pending Payments',
      value: stats.pendingPayments,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border border-amber-500/20',
      trend: trendStats.pendingTrend,
      spark: last7DaysSparklines.map((d) => d.sales),
    },
    {
      label: 'Low Stock Items',
      value: stats.lowStockProducts,
      isCount: true,
      icon: AlertTriangle,
      color: stats.lowStockProducts > 0 ? 'text-rose-500' : 'text-emerald-500',
      bg:
        stats.lowStockProducts > 0
          ? 'bg-rose-500/10 border border-rose-500/20'
          : 'bg-emerald-500/10 border border-emerald-500/20',
      trend: trendStats.lowStockTrend,
      spark: [
        stats.lowStockProducts,
        stats.lowStockProducts,
        stats.lowStockProducts,
        stats.lowStockProducts,
        stats.lowStockProducts,
        stats.lowStockProducts,
        stats.lowStockProducts,
      ],
    },
    {
      label: 'Total Products',
      value: stats.totalProducts,
      isCount: true,
      icon: Package,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10 border border-cyan-500/20',
      trend: trendStats.productTrend,
      spark: [
        stats.totalProducts,
        stats.totalProducts,
        stats.totalProducts,
        stats.totalProducts,
        stats.totalProducts,
        stats.totalProducts,
        stats.totalProducts,
      ],
    },
    {
      label: 'Total Invoices',
      value: stats.totalInvoices,
      isCount: true,
      icon: FileText,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10 border border-purple-500/20',
      trend: trendStats.invoiceTrend,
      spark: last7DaysSparklines.map((d) => d.invoiceCount),
    },
  ];

  const getFinancialYearString = () => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    return curMonth >= 4
      ? `FY ${curYear}-${(curYear + 1).toString().slice(-2)}`
      : `FY ${curYear - 1}-${curYear.toString().slice(-2)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header Bar with Actions & Period Filter */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card/60 p-4 rounded-2xl border border-border/40 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">Business Dashboard</h2>
          <p className="text-xs text-muted-foreground/80 font-medium">
            Real-time financial matrices, GST tax compliance, and operations ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/40">
            {(['today', 'week', 'month', 'year'] as FilterPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize transition-all ${
                  period === p
                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Export Designer PDF Button */}
          <DesignerReportModal reportData={designerReportPayload} />

          {/* Widget Customization Trigger */}
          <WidgetManager
            widgets={widgets}
            setWidgets={handleSaveWidgets}
            onResetDefaults={handleResetDefaults}
          />
        </div>
      </div>

      {/* Real-time Collections by Payment Mode Strip (Symmetrical 4+4 2-Liner) */}
      {(() => {
        const getDynamicAmountClass = (val: number | string) => {
          const str = typeof val === 'number' ? formatCurrency(val) : String(val);
          if (str.length > 14) return 'text-xs sm:text-sm';
          if (str.length > 10) return 'text-sm sm:text-base';
          return 'text-base sm:text-lg';
        };

        return (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Row 1, Card 1: ALL MODES TOTAL (HERO CARD) */}
            <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-3 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-primary text-[11px] font-bold">
                <span className="flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5" /> All Modes Total</span>
                <span className="text-[10px] font-mono bg-primary/20 px-1.5 py-0.2 rounded font-black">{paymentModesData.collectionRatePct.toFixed(0)}%</span>
              </div>
              <div className="mt-1.5">
                <div className={`font-black font-mono text-primary dark:text-foreground tracking-tight truncate ${getDynamicAmountClass(paymentModesData.totalCollected)}`} title={formatCurrency(paymentModesData.totalCollected)}>
                  {formatCurrency(paymentModesData.totalCollected)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Total collections received</div>
              </div>
            </div>

            {/* Row 1, Card 2: UPI */}
            <div className="bg-card/70 border border-indigo-500/20 rounded-xl p-3 shadow-xs hover:border-indigo-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-indigo-500" /> UPI</span>
                <span className="text-[10px] font-mono text-indigo-500 font-bold">{paymentChannelSummary.upi.count} bills</span>
              </div>
              <div className="mt-1.5">
                <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(paymentChannelSummary.upi.amount)}`} title={formatCurrency(paymentChannelSummary.upi.amount)}>
                  {formatCurrency(paymentChannelSummary.upi.amount)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{paymentChannelSummary.upi.percentage.toFixed(0)}% of collections</div>
              </div>
            </div>

            {/* Row 1, Card 3: Card */}
            <div className="bg-card/70 border border-cyan-500/20 rounded-xl p-3 shadow-xs hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-cyan-500" /> Card / POS</span>
                <span className="text-[10px] font-mono text-cyan-500 font-bold">{paymentChannelSummary.card.count} bills</span>
              </div>
              <div className="mt-1.5">
                <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(paymentChannelSummary.card.amount)}`} title={formatCurrency(paymentChannelSummary.card.amount)}>
                  {formatCurrency(paymentChannelSummary.card.amount)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{paymentChannelSummary.card.percentage.toFixed(0)}% of collections</div>
              </div>
            </div>

            {/* Row 1, Card 4: Cash */}
            <div className="bg-card/70 border border-emerald-500/20 rounded-xl p-3 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-500" /> Cash</span>
                <span className="text-[10px] font-mono text-emerald-500 font-bold">{paymentChannelSummary.cash.count} bills</span>
              </div>
              <div className="mt-1.5">
                <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(paymentChannelSummary.cash.amount)}`} title={formatCurrency(paymentChannelSummary.cash.amount)}>
                  {formatCurrency(paymentChannelSummary.cash.amount)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{paymentChannelSummary.cash.percentage.toFixed(0)}% of collections</div>
              </div>
            </div>

            {/* Row 2, Card 5: Bank Transfer */}
            <div className="bg-card/70 border border-blue-500/20 rounded-xl p-3 shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                <span className="flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5 text-blue-500" /> Net Banking</span>
                <span className="text-[10px] font-mono text-blue-500 font-bold">{paymentChannelSummary.bank.count} bills</span>
              </div>
              <div className="mt-1.5">
                <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(paymentChannelSummary.bank.amount)}`} title={formatCurrency(paymentChannelSummary.bank.amount)}>
                  {formatCurrency(paymentChannelSummary.bank.amount)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{paymentChannelSummary.bank.percentage.toFixed(0)}% of collections</div>
              </div>
            </div>

            {/* Row 2, Card 6: EMI */}
            <div className="bg-card/70 border border-purple-500/20 rounded-xl p-3 shadow-xs hover:border-purple-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-purple-500" /> EMI Loans</span>
                <span className="text-[10px] font-mono text-purple-500 font-bold">{paymentChannelSummary.emi.count} bills</span>
              </div>
              <div className="mt-1.5">
                <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(paymentChannelSummary.emi.amount)}`} title={formatCurrency(paymentChannelSummary.emi.amount)}>
                  {formatCurrency(paymentChannelSummary.emi.amount)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{paymentChannelSummary.emi.percentage.toFixed(0)}% of collections</div>
              </div>
            </div>

            {/* Row 2, Card 7: Credit / Pending Due */}
            <div className="bg-card/70 border border-rose-500/20 rounded-xl p-3 shadow-xs hover:border-rose-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                <span className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> Credit Dues</span>
                <span className={`text-[10px] font-mono font-bold ${paymentModesData.totalPending > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {paymentModesData.totalPending > 0 ? 'Pending' : 'Settled'}
                </span>
              </div>
              <div className="mt-1.5">
                <div className={`font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight truncate ${getDynamicAmountClass(paymentModesData.totalPending)}`} title={formatCurrency(paymentModesData.totalPending)}>
                  {formatCurrency(paymentModesData.totalPending)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Outstanding unpaid balance</div>
              </div>
            </div>

            {/* Row 2, Card 8: Average Bill Ticket Size */}
            <div className="bg-card/70 border border-amber-500/20 rounded-xl p-3 shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
                <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-amber-500" /> Avg Ticket Size</span>
                <span className="text-[10px] font-mono text-amber-500 font-bold">{paymentChannelSummary.totalBills} paid</span>
              </div>
              <div className="mt-1.5">
                <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(paymentChannelSummary.avgTicket)}`} title={formatCurrency(paymentChannelSummary.avgTicket)}>
                  {formatCurrency(paymentChannelSummary.avgTicket)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Realized average per bill</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Render Widgets dynamically based on sorted/visibility config */}
      {widgets.map((widget) => {
        if (!widget.visible) return null;

        switch (widget.id) {
          case 'welcome':
            return (
              <WelcomeCard
                key={widget.id}
                companyName={settings.companyName}
                financialYear={getFinancialYearString()}
                todaySales={stats.todaySales}
              />
            );

          case 'kpis':
            return (
              <div key={widget.id} className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Key Performance Indicators
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveWidget('kpis')}
                    className="h-6 w-6 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                    title="Remove KPI grid"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {kpis.map((kpi) => (
                    <KpiCard
                      key={kpi.label}
                      label={kpi.label}
                      value={kpi.value}
                      isCount={kpi.isCount}
                      icon={kpi.icon}
                      color={kpi.color}
                      bg={kpi.bg}
                      trend={kpi.trend}
                      sparklineData={kpi.spark}
                    />
                  ))}
                </div>
              </div>
            );

          case 'profitMatrix':
            return (
              <ProfitMarginMatrix
                key={widget.id}
                data={profitMatrixData}
                onRemove={() => handleRemoveWidget('profitMatrix')}
              />
            );

          case 'taxMatrix':
            return (
              <TaxLiabilityMatrix
                key={widget.id}
                data={taxMatrixData}
                onRemove={() => handleRemoveWidget('taxMatrix')}
              />
            );

          case 'paymentModes':
            return (
              <PaymentModesBreakdown
                key={widget.id}
                data={paymentModesData}
                onRemove={() => handleRemoveWidget('paymentModes')}
              />
            );

          case 'todayEmi':
            return (
              <TodayEmiCollectionsCard
                key={widget.id}
                items={dueEmiItems}
                settings={settings}
                onRemove={() => handleRemoveWidget('todayEmi')}
              />
            );

          case 'topProducts':
            return (
              <TopProductsMatrix
                key={widget.id}
                products={topProductsData}
                onRemove={() => handleRemoveWidget('topProducts')}
              />
            );

          case 'customerAging':
            return (
              <CustomerAgingMatrix
                key={widget.id}
                data={customerAgingData}
                onRemove={() => handleRemoveWidget('customerAging')}
              />
            );

          case 'cashFlowTrend':
            return (
              <CashFlowTrendChart
                key={widget.id}
                data={cashFlowTrendData}
                onRemove={() => handleRemoveWidget('cashFlowTrend')}
              />
            );

          case 'salesTrend':
            return (
              <div key={widget.id} className="relative">
                <SalesChartCard
                  data={salesChartData}
                  period={period}
                  onPeriodChange={setPeriod}
                />
              </div>
            );

          case 'revenueVsExpenses':
            return (
              <div key={widget.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 min-w-0">
                  <RevenueChart data={revenueChartData} />
                </div>
                <div className="min-w-0">
                  <ProductCategories data={categoryChartData} />
                </div>
              </div>
            );

          case 'categories':
            // If revenue widget is visible, categories is already rendered beside it
            const isRevenueVisible = widgets.find((w) => w.id === 'revenueVsExpenses')?.visible;
            if (isRevenueVisible) return null;
            return (
              <div key={widget.id}>
                <ProductCategories data={categoryChartData} />
              </div>
            );

          case 'recentInvoices':
            return (
              <div key={widget.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RecentInvoicesCard invoices={invoices.slice(-5)} />
                </div>
                <div>
                  <PendingPaymentsCard invoices={invoices} />
                </div>
              </div>
            );

          case 'pendingPayments':
            // If recentInvoices is visible, pending payments is placed in its companion slot
            const isRecentInvoicesVisible = widgets.find((w) => w.id === 'recentInvoices')?.visible;
            if (isRecentInvoicesVisible) return null;
            return <PendingPaymentsCard key={widget.id} invoices={invoices} />;

          case 'lowStock':
            return (
              <div key={widget.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <LowStockCard products={products} />
                </div>
                <div>
                  <ActivityTimeline activities={timelineActivities} />
                </div>
              </div>
            );

          case 'timeline':
            const isLowStockVisible = widgets.find((w) => w.id === 'lowStock')?.visible;
            if (isLowStockVisible) return null;
            return <ActivityTimeline key={widget.id} activities={timelineActivities} />;

          case 'quickActions':
            return <QuickActionsGrid key={widget.id} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
