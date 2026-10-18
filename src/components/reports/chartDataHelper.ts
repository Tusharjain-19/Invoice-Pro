import type { Invoice, Expense, Product } from '@/types';
import type {
  ReportsChartsData,
  TimelinePoint,
  ExpenseCategorySlice,
  PaymentModeSlice,
  TaxSlice,
  TaxRateSlabItem,
  TopProductBarItem,
  PeriodComparisonBarItem,
  InvoiceStatusSlice,
} from './types';
import type { ReportPeriodType } from '@/app/reports/page';

const EXPENSE_PALETTE: Record<string, string> = {
  rent: '#6366f1',
  salary: '#3b82f6',
  electricity: '#f59e0b',
  internet: '#06b6d4',
  fuel: '#ec4899',
  telephone: '#14b8a6',
  'office supplies': '#8b5cf6',
  maintenance: '#10b981',
  insurance: '#f97316',
  miscellaneous: '#64748b',
};

const DYNAMIC_PALETTE = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
  '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316', '#64748b',
  '#84cc16', '#a855f7', '#0ea5e9', '#e11d48', '#d97706',
];

const PAYMENT_PALETTE: Record<string, string> = {
  Cash: '#10b981',
  UPI: '#6366f1',
  'Bank Transfer': '#3b82f6',
  Cheque: '#f59e0b',
  Credit: '#ef4444',
  Card: '#8b5cf6',
  EMI: '#06b6d4',
};

const STATUS_PALETTE: Record<string, string> = {
  paid: '#10b981',
  partial: '#3b82f6',
  sent: '#f59e0b',
  overdue: '#ef4444',
  draft: '#94a3b8',
  cancelled: '#64748b',
};

export function buildReportsChartsData({
  viewType,
  selectedMonth,
  selectedYear,
  selectedQuarter,
  selectedFY,
  invoices,
  expenses,
  productCostMap,
  currentMetrics,
  prevMetrics,
  yoyMetrics,
  comparisonTimeRanges,
}: {
  viewType: ReportPeriodType;
  selectedMonth: number;
  selectedYear: number;
  selectedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  selectedFY: number;
  invoices: Invoice[];
  expenses: Expense[];
  productCostMap: Map<number, number>;
  currentMetrics: any;
  prevMetrics: any;
  yoyMetrics: any;
  comparisonTimeRanges: any;
}): ReportsChartsData {
  const currentSales = invoices.filter(
    (inv) => inv.date >= comparisonTimeRanges.current.start && inv.date <= comparisonTimeRanges.current.end
  );
  const currentExps = expenses.filter(
    (ex) => ex.date >= comparisonTimeRanges.current.start && ex.date <= comparisonTimeRanges.current.end
  );

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Helper to compute COGS for a set of invoices
  const calculateCogsForInvoices = (invList: Invoice[]) => {
    let calculated = 0;
    invList.forEach((inv) => {
      inv.items?.forEach((item) => {
        const pId = item.productId;
        const purchasePrice = pId ? productCostMap.get(pId) : undefined;
        if (purchasePrice && purchasePrice > 0) {
          calculated += (item.quantity || 1) * purchasePrice;
        } else {
          calculated += (item.taxableAmount || item.total || 0) * 0.62;
        }
      });
    });
    return calculated;
  };

  // 1. TIMELINE DATA POINTS
  const timeline: TimelinePoint[] = [];
  let cumulativeRevenue = 0;
  let cumulativeExpenses = 0;

  if (viewType === 'monthly') {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dStart = new Date(selectedYear, selectedMonth, day, 0, 0, 0, 0).getTime();
      const dEnd = new Date(selectedYear, selectedMonth, day, 23, 59, 59, 999).getTime();

      const dayInvoices = currentSales.filter((inv) => inv.date >= dStart && inv.date <= dEnd);
      const dayExpenses = currentExps.filter((ex) => ex.date >= dStart && ex.date <= dEnd);

      const dayRev = dayInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
      const dayCogs = calculateCogsForInvoices(dayInvoices);
      const dayGross = Math.max(0, dayRev - dayCogs);
      const dayExp = dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const dayNet = dayGross - dayExp;
      const dayMargin = dayRev > 0 ? (dayNet / dayRev) * 100 : 0;

      cumulativeRevenue += dayRev;
      cumulativeExpenses += dayExp;
      const cumulativeNetProfit = cumulativeRevenue - cumulativeExpenses;

      timeline.push({
        label: `${day.toString().padStart(2, '0')} ${months[selectedMonth]}`,
        fullDate: new Date(selectedYear, selectedMonth, day).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        timestamp: dStart,
        revenue: Math.round(dayRev),
        cogs: Math.round(dayCogs),
        grossProfit: Math.round(dayGross),
        expenses: Math.round(dayExp),
        netProfit: Math.round(dayNet),
        netMargin: parseFloat(dayMargin.toFixed(1)),
        cumulativeRevenue: Math.round(cumulativeRevenue),
        cumulativeExpenses: Math.round(cumulativeExpenses),
        cumulativeNetProfit: Math.round(cumulativeNetProfit),
        invoiceCount: dayInvoices.length,
        expenseCount: dayExpenses.length,
      });
    }
  } else if (viewType === 'quarterly') {
    const qMap: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', { startMonth: number; endMonth: number; yearOffset: number }> = {
      Q1: { startMonth: 3, endMonth: 5, yearOffset: 0 },
      Q2: { startMonth: 6, endMonth: 8, yearOffset: 0 },
      Q3: { startMonth: 9, endMonth: 11, yearOffset: 0 },
      Q4: { startMonth: 0, endMonth: 2, yearOffset: 1 },
    };
    const curQ = qMap[selectedQuarter];
    const qYear = selectedFY + curQ.yearOffset;

    for (let m = curQ.startMonth; m <= curQ.endMonth; m++) {
      const mStart = new Date(qYear, m, 1, 0, 0, 0, 0).getTime();
      const mEnd = new Date(qYear, m + 1, 0, 23, 59, 59, 999).getTime();

      const mInvoices = currentSales.filter((inv) => inv.date >= mStart && inv.date <= mEnd);
      const mExpenses = currentExps.filter((ex) => ex.date >= mStart && ex.date <= mEnd);

      const mRev = mInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
      const mCogs = calculateCogsForInvoices(mInvoices);
      const mGross = Math.max(0, mRev - mCogs);
      const mExp = mExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const mNet = mGross - mExp;
      const mMargin = mRev > 0 ? (mNet / mRev) * 100 : 0;

      cumulativeRevenue += mRev;
      cumulativeExpenses += mExp;
      const cumulativeNetProfit = cumulativeRevenue - cumulativeExpenses;

      timeline.push({
        label: `${months[m]} ${qYear}`,
        fullDate: `${months[m]} ${qYear}`,
        timestamp: mStart,
        revenue: Math.round(mRev),
        cogs: Math.round(mCogs),
        grossProfit: Math.round(mGross),
        expenses: Math.round(mExp),
        netProfit: Math.round(mNet),
        netMargin: parseFloat(mMargin.toFixed(1)),
        cumulativeRevenue: Math.round(cumulativeRevenue),
        cumulativeExpenses: Math.round(cumulativeExpenses),
        cumulativeNetProfit: Math.round(cumulativeNetProfit),
        invoiceCount: mInvoices.length,
        expenseCount: mExpenses.length,
      });
    }
  } else if (viewType === 'financial-year') {
    // 12 months: Apr to Mar
    const fyMonths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
    fyMonths.forEach((m) => {
      const y = m >= 3 ? selectedFY : selectedFY + 1;
      const mStart = new Date(y, m, 1, 0, 0, 0, 0).getTime();
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();

      const mInvoices = currentSales.filter((inv) => inv.date >= mStart && inv.date <= mEnd);
      const mExpenses = currentExps.filter((ex) => ex.date >= mStart && ex.date <= mEnd);

      const mRev = mInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
      const mCogs = calculateCogsForInvoices(mInvoices);
      const mGross = Math.max(0, mRev - mCogs);
      const mExp = mExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const mNet = mGross - mExp;
      const mMargin = mRev > 0 ? (mNet / mRev) * 100 : 0;

      cumulativeRevenue += mRev;
      cumulativeExpenses += mExp;
      const cumulativeNetProfit = cumulativeRevenue - cumulativeExpenses;

      timeline.push({
        label: `${months[m]} '${y.toString().slice(-2)}`,
        fullDate: `${months[m]} ${y}`,
        timestamp: mStart,
        revenue: Math.round(mRev),
        cogs: Math.round(mCogs),
        grossProfit: Math.round(mGross),
        expenses: Math.round(mExp),
        netProfit: Math.round(mNet),
        netMargin: parseFloat(mMargin.toFixed(1)),
        cumulativeRevenue: Math.round(cumulativeRevenue),
        cumulativeExpenses: Math.round(cumulativeExpenses),
        cumulativeNetProfit: Math.round(cumulativeNetProfit),
        invoiceCount: mInvoices.length,
        expenseCount: mExpenses.length,
      });
    });
  } else {
    // Calendar Year: Jan to Dec
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(selectedYear, m, 1, 0, 0, 0, 0).getTime();
      const mEnd = new Date(selectedYear, m + 1, 0, 23, 59, 59, 999).getTime();

      const mInvoices = currentSales.filter((inv) => inv.date >= mStart && inv.date <= mEnd);
      const mExpenses = currentExps.filter((ex) => ex.date >= mStart && ex.date <= mEnd);

      const mRev = mInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
      const mCogs = calculateCogsForInvoices(mInvoices);
      const mGross = Math.max(0, mRev - mCogs);
      const mExp = mExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const mNet = mGross - mExp;
      const mMargin = mRev > 0 ? (mNet / mRev) * 100 : 0;

      cumulativeRevenue += mRev;
      cumulativeExpenses += mExp;
      const cumulativeNetProfit = cumulativeRevenue - cumulativeExpenses;

      timeline.push({
        label: `${months[m]}`,
        fullDate: `${months[m]} ${selectedYear}`,
        timestamp: mStart,
        revenue: Math.round(mRev),
        cogs: Math.round(mCogs),
        grossProfit: Math.round(mGross),
        expenses: Math.round(mExp),
        netProfit: Math.round(mNet),
        netMargin: parseFloat(mMargin.toFixed(1)),
        cumulativeRevenue: Math.round(cumulativeRevenue),
        cumulativeExpenses: Math.round(cumulativeExpenses),
        cumulativeNetProfit: Math.round(cumulativeNetProfit),
        invoiceCount: mInvoices.length,
        expenseCount: mExpenses.length,
      });
    }
  }

  // Peak days identification
  let peakRevenueDay: { label: string; amount: number } | undefined;
  let peakExpenseDay: { label: string; amount: number } | undefined;

  timeline.forEach((pt) => {
    if (!peakRevenueDay || pt.revenue > peakRevenueDay.amount) {
      if (pt.revenue > 0) {
        peakRevenueDay = { label: pt.label, amount: pt.revenue };
      }
    }
    if (!peakExpenseDay || pt.expenses > peakExpenseDay.amount) {
      if (pt.expenses > 0) {
        peakExpenseDay = { label: pt.label, amount: pt.expenses };
      }
    }
  });

  // 2. EXPENSE CATEGORIES SLICES
  const expCatMap = new Map<string, { amount: number; count: number }>();
  currentExps.forEach((e) => {
    const rawCat = (e.category || 'Miscellaneous').trim();
    const formattedCat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
    const curr = expCatMap.get(formattedCat) || { amount: 0, count: 0 };
    curr.amount += e.amount || 0;
    curr.count += 1;
    expCatMap.set(formattedCat, curr);
  });

  const totalExp = currentMetrics.totalExpenses || currentExps.reduce((acc, e) => acc + (e.amount || 0), 0);
  const expenseCategories: ExpenseCategorySlice[] = Array.from(expCatMap.entries())
    .map(([cat, data], idx) => {
      const lower = cat.toLowerCase();
      let color = EXPENSE_PALETTE[lower] || DYNAMIC_PALETTE[idx % DYNAMIC_PALETTE.length];
      return {
        name: cat,
        amount: Math.round(data.amount),
        count: data.count,
        percentage: totalExp > 0 ? parseFloat(((data.amount / totalExp) * 100).toFixed(1)) : 0,
        color,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // 3. PAYMENT MODES SLICES
  const modeMap = new Map<string, { amount: number; count: number }>();
  let totalCollected = 0;
  let totalPending = 0;

  currentSales.forEach((inv) => {
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

  const paymentModes: PaymentModeSlice[] = Array.from(modeMap.entries())
    .map(([mode, data], idx) => ({
      name: mode,
      amount: Math.round(data.amount),
      count: data.count,
      percentage: totalCollected > 0 ? parseFloat(((data.amount / totalCollected) * 100).toFixed(1)) : 0,
      color: PAYMENT_PALETTE[mode] || DYNAMIC_PALETTE[idx % DYNAMIC_PALETTE.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  // 4. TAX BREAKDOWN (CGST, SGST, IGST)
  const totalTax = currentMetrics.totalTax || 0;
  const taxDistribution: TaxSlice[] = [
    {
      name: 'CGST (Central)',
      amount: Math.round(currentMetrics.cgst || 0),
      percentage: totalTax > 0 ? parseFloat((((currentMetrics.cgst || 0) / totalTax) * 100).toFixed(1)) : 0,
      color: '#3b82f6',
    },
    {
      name: 'SGST (State)',
      amount: Math.round(currentMetrics.sgst || 0),
      percentage: totalTax > 0 ? parseFloat((((currentMetrics.sgst || 0) / totalTax) * 100).toFixed(1)) : 0,
      color: '#10b981',
    },
    {
      name: 'IGST (Inter-state)',
      amount: Math.round(currentMetrics.igst || 0),
      percentage: totalTax > 0 ? parseFloat((((currentMetrics.igst || 0) / totalTax) * 100).toFixed(1)) : 0,
      color: '#f59e0b',
    },
  ].filter((t) => t.amount > 0 || totalTax === 0);

  // 5. TAX RATE SLABS (0%, 5%, 12%, 18%, 28%)
  const slabMap = new Map<string, { taxable: number; tax: number }>();
  currentSales.forEach((inv) => {
    inv.items?.forEach((item) => {
      const slabKey = `${item.gstRate || 0}%`;
      const curr = slabMap.get(slabKey) || { taxable: 0, tax: 0 };
      curr.taxable += item.taxableAmount || item.total || 0;
      curr.tax += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
      slabMap.set(slabKey, curr);
    });
  });

  const SLAB_COLORS: Record<string, string> = {
    '0%': '#94a3b8',
    '3%': '#06b6d4',
    '5%': '#10b981',
    '12%': '#3b82f6',
    '18%': '#6366f1',
    '28%': '#ec4899',
  };

  const taxRateSlabs: TaxRateSlabItem[] = Array.from(slabMap.entries())
    .map(([rate, vals]) => ({
      rate,
      taxable: Math.round(vals.taxable),
      tax: Math.round(vals.tax),
      percentage: totalTax > 0 ? parseFloat(((vals.tax / totalTax) * 100).toFixed(1)) : 0,
      color: SLAB_COLORS[rate] || '#8b5cf6',
    }))
    .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

  // 6. TOP PRODUCTS BY REVENUE
  const prodMap = new Map<string, { id: string | number; name: string; sku: string; category: string; quantity: number; revenue: number }>();
  currentSales.forEach((inv) => {
    inv.items?.forEach((item) => {
      const key = item.productId ? `p-${item.productId}` : item.description;
      const curr = prodMap.get(key) || {
        id: item.productId || key,
        name: item.description || 'Unknown Item',
        sku: item.hsnCode || 'N/A',
        category: 'General',
        quantity: 0,
        revenue: 0,
      };
      curr.quantity += item.quantity || 1;
      curr.revenue += item.total || 0;
      prodMap.set(key, curr);
    });
  });

  const totalSalesRev = currentMetrics.totalSales || 1;
  const topProducts: TopProductBarItem[] = Array.from(prodMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
    .map((p, idx) => ({
      ...p,
      revenue: Math.round(p.revenue),
      percentage: parseFloat(((p.revenue / totalSalesRev) * 100).toFixed(1)),
      color: DYNAMIC_PALETTE[idx % DYNAMIC_PALETTE.length],
    }));

  // 7. PERIOD COMPARISON BAR ITEMS
  const periodComparisons: PeriodComparisonBarItem[] = [
    {
      metric: 'Gross Turnover',
      current: currentMetrics.totalSales || 0,
      previous: prevMetrics.totalSales || 0,
      yoy: yoyMetrics.totalSales || 0,
      isCost: false,
    },
    {
      metric: 'COGS',
      current: currentMetrics.cogs || 0,
      previous: prevMetrics.cogs || 0,
      yoy: yoyMetrics.cogs || 0,
      isCost: true,
    },
    {
      metric: 'Gross Profit',
      current: currentMetrics.grossProfit || 0,
      previous: prevMetrics.grossProfit || 0,
      yoy: yoyMetrics.grossProfit || 0,
      isCost: false,
    },
    {
      metric: 'Operating Opex',
      current: currentMetrics.totalExpenses || 0,
      previous: prevMetrics.totalExpenses || 0,
      yoy: yoyMetrics.totalExpenses || 0,
      isCost: true,
    },
    {
      metric: 'Net Profit',
      current: currentMetrics.netProfit || 0,
      previous: prevMetrics.netProfit || 0,
      yoy: yoyMetrics.netProfit || 0,
      isCost: false,
    },
  ];

  // 8. INVOICE STATUS SLICES
  const statusMap = new Map<string, { amount: number; count: number }>();
  currentSales.forEach((inv) => {
    const st = inv.status || 'sent';
    const curr = statusMap.get(st) || { amount: 0, count: 0 };
    curr.amount += inv.totalAmount || 0;
    curr.count += 1;
    statusMap.set(st, curr);
  });

  const invoiceStatuses: InvoiceStatusSlice[] = Array.from(statusMap.entries()).map(([st, data]) => {
    const formatted = st.charAt(0).toUpperCase() + st.slice(1);
    return {
      name: formatted,
      status: st,
      amount: Math.round(data.amount),
      count: data.count,
      percentage: totalSalesRev > 0 ? parseFloat(((data.amount / totalSalesRev) * 100).toFixed(1)) : 0,
      color: STATUS_PALETTE[st] || '#94a3b8',
    };
  });

  const collectionRate = totalCollected + totalPending > 0
    ? (totalCollected / (totalCollected + totalPending)) * 100
    : 100;

  return {
    timeline,
    expenseCategories,
    paymentModes,
    taxDistribution,
    taxRateSlabs,
    topProducts,
    periodComparisons,
    invoiceStatuses,
    summary: {
      totalRevenue: currentMetrics.totalSales || 0,
      totalExpenses: currentMetrics.totalExpenses || 0,
      totalCogs: currentMetrics.cogs || 0,
      grossProfit: currentMetrics.grossProfit || 0,
      grossMargin: currentMetrics.grossMargin || 0,
      netProfit: currentMetrics.netProfit || 0,
      netMargin: currentMetrics.netMargin || 0,
      totalTax: currentMetrics.totalTax || 0,
      totalOrders: currentMetrics.orderCount || 0,
      totalExpenseEntries: currentExps.length,
      averageOrderValue: currentMetrics.averageOrderValue || 0,
      totalCollected: Math.round(totalCollected),
      totalPending: Math.round(totalPending),
      collectionRate: parseFloat(collectionRate.toFixed(1)),
      peakRevenueDay,
      peakExpenseDay,
    },
  };
}
