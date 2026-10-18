export interface TimelinePoint {
  label: string;
  fullDate: string;
  timestamp: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  netMargin: number;
  cumulativeRevenue: number;
  cumulativeExpenses: number;
  cumulativeNetProfit: number;
  invoiceCount: number;
  expenseCount: number;
}

export interface ExpenseCategorySlice {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface PaymentModeSlice {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface TaxSlice {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface TaxRateSlabItem {
  rate: string;
  taxable: number;
  tax: number;
  percentage: number;
  color: string;
}

export interface TopProductBarItem {
  id: string | number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  revenue: number;
  percentage: number;
  color: string;
}

export interface PeriodComparisonBarItem {
  metric: string;
  current: number;
  previous: number;
  yoy: number;
  isCost?: boolean;
}

export interface InvoiceStatusSlice {
  name: string;
  status: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface ReportsChartsData {
  timeline: TimelinePoint[];
  expenseCategories: ExpenseCategorySlice[];
  paymentModes: PaymentModeSlice[];
  taxDistribution: TaxSlice[];
  taxRateSlabs: TaxRateSlabItem[];
  topProducts: TopProductBarItem[];
  periodComparisons: PeriodComparisonBarItem[];
  invoiceStatuses: InvoiceStatusSlice[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalCogs: number;
    grossProfit: number;
    grossMargin: number;
    netProfit: number;
    netMargin: number;
    totalTax: number;
    totalOrders: number;
    totalExpenseEntries: number;
    averageOrderValue: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
    peakRevenueDay?: { label: string; amount: number };
    peakExpenseDay?: { label: string; amount: number };
  };
}
