import type { Invoice, Product, Customer } from '@/types';

// ==========================================
// 1. PAYMENT MODES & COLLECTIONS TYPES & HELPER
// ==========================================

export interface PaymentModeSummary {
  mode: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface PaymentAnalytics {
  items: PaymentModeSummary[];
  totalCollected: number;
  totalPending: number;
  totalTurnover: number;
  collectionRatePct: number;
}

export const PAYMENT_MODE_COLORS: Record<string, string> = {
  Cash: '#10b981', // Emerald green
  UPI: '#6366f1', // Indigo / Purple
  Card: '#06b6d4', // Cyan
  'Bank Transfer': '#3b82f6', // Blue
  Cheque: '#f59e0b', // Amber
  EMI: '#8b5cf6', // Violet
  Credit: '#ef4444', // Red
  Other: '#94a3b8', // Slate
};

export function calculatePaymentModesAnalytics(invoices: Invoice[]): PaymentAnalytics {
  const modeMap = new Map<string, { amount: number; count: number }>();
  let totalCollected = 0;
  let totalPending = 0;

  // Initialize canonical modes
  const canonicalModes = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'EMI', 'Credit', 'Cheque'];
  canonicalModes.forEach((m) => {
    modeMap.set(m, { amount: 0, count: 0 });
  });

  invoices.forEach((inv) => {
    const paid = Number(inv.paidAmount ?? (inv.status === 'paid' ? inv.totalAmount : 0)) || 0;
    const due = Number(inv.balanceDue ?? 0) || 0;

    totalCollected += paid;
    totalPending += due;

    // Check if invoice has split payments recorded
    if (inv.isSplitPayment && inv.paymentSplits && typeof inv.paymentSplits === 'object') {
      let hasPositiveSplit = false;
      Object.entries(inv.paymentSplits).forEach(([splitMode, splitVal]) => {
        const val = Number(splitVal) || 0;
        if (val > 0) {
          hasPositiveSplit = true;
          const current = modeMap.get(splitMode) || { amount: 0, count: 0 };
          current.amount += val;
          current.count += 1;
          modeMap.set(splitMode, current);
        }
      });
      if (!hasPositiveSplit && paid > 0) {
        const current = modeMap.get('Cash') || { amount: 0, count: 0 };
        current.amount += paid;
        current.count += 1;
        modeMap.set('Cash', current);
      }
    } else {
      // Single payment mode
      let mode = inv.paymentMode?.trim() || 'Cash';
      if (mode.toLowerCase() === 'split payment') {
        mode = 'Cash';
      }
      const current = modeMap.get(mode) || { amount: 0, count: 0 };
      current.amount += paid;
      current.count += 1;
      modeMap.set(mode, current);
    }
  });

  const totalTurnover = totalCollected + totalPending;

  // Include active items and standard channels
  const items: PaymentModeSummary[] = Array.from(modeMap.entries())
    .map(([mode, data]) => ({
      mode,
      amount: data.amount,
      count: data.count,
      percentage: totalCollected > 0 ? (data.amount / totalCollected) * 100 : 0,
      color: PAYMENT_MODE_COLORS[mode] || '#94a3b8',
    }))
    .filter((item) => item.amount > 0 || ['Cash', 'UPI', 'Card', 'Bank Transfer', 'EMI'].includes(item.mode))
    .sort((a, b) => b.amount - a.amount);

  const collectionRatePct = totalTurnover > 0 ? (totalCollected / totalTurnover) * 100 : 100;

  return {
    items,
    totalCollected,
    totalPending,
    totalTurnover,
    collectionRatePct,
  };
}

// ==========================================
// 2. PEAK SALES TIME & DAY-OF-WEEK ANALYTICS
// ==========================================

export interface HourlySalesPoint {
  hour: number;
  label: string;
  orderCount: number;
  revenue: number;
  isPeak: boolean;
}

export interface DayOfWeekSalesPoint {
  dayIndex: number;
  dayName: string;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
  isBestDay: boolean;
}

export interface SalesTimingAnalytics {
  hourlyDistribution: HourlySalesPoint[];
  peakHour: HourlySalesPoint | null;
  dayOfWeekDistribution: DayOfWeekSalesPoint[];
  bestDay: DayOfWeekSalesPoint | null;
  weekendSalesShare: number; // percentage of revenue generated on Sat & Sun
}

export function calculateSalesTimingAnalytics(invoices: Invoice[]): SalesTimingAnalytics {
  // Initialize 24 hours (or focused retail 9 AM to 10 PM)
  const hourMap = new Map<number, { count: number; revenue: number }>();
  for (let h = 0; h < 24; h++) {
    hourMap.set(h, { count: 0, revenue: 0 });
  }

  // Days: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap = new Map<number, { count: number; revenue: number }>();
  for (let d = 0; d < 7; d++) {
    dayMap.set(d, { count: 0, revenue: 0 });
  }

  let totalPeriodRevenue = 0;
  let weekendRevenue = 0;

  invoices.forEach((inv) => {
    const dateObj = new Date(inv.date || inv.createdAt);
    const hour = dateObj.getHours();
    const day = dateObj.getDay();
    const rev = Number(inv.totalAmount) || 0;

    totalPeriodRevenue += rev;
    if (day === 0 || day === 6) {
      weekendRevenue += rev;
    }

    const hEntry = hourMap.get(hour) || { count: 0, revenue: 0 };
    hEntry.count += 1;
    hEntry.revenue += rev;
    hourMap.set(hour, hEntry);

    const dEntry = dayMap.get(day) || { count: 0, revenue: 0 };
    dEntry.count += 1;
    dEntry.revenue += rev;
    dayMap.set(day, dEntry);
  });

  // Find peak hour (focus on typical business hours 8 AM to 11 PM or all hours with activity)
  let maxHourRevenue = -1;
  let peakHourNum = 17; // default ~5 PM
  hourMap.forEach((entry, h) => {
    if (entry.revenue > maxHourRevenue && entry.count > 0) {
      maxHourRevenue = entry.revenue;
      peakHourNum = h;
    }
  });

  // Format 12-hour AM/PM label
  const formatHourLabel = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour} ${ampm}`;
  };

  // Restrict hourly display to 8 AM - 10 PM for clean UI readability, but include active earlier/later if exists
  const activeHours = Array.from(hourMap.entries())
    .filter(([h, entry]) => (h >= 8 && h <= 22) || entry.count > 0)
    .sort(([a], [b]) => a - b);

  const hourlyDistribution: HourlySalesPoint[] = activeHours.map(([h, entry]) => ({
    hour: h,
    label: formatHourLabel(h),
    orderCount: entry.count,
    revenue: entry.revenue,
    isPeak: h === peakHourNum && maxHourRevenue > 0,
  }));

  const peakHour = hourlyDistribution.find((h) => h.isPeak) || hourlyDistribution[0] || null;

  // Day of week analysis
  let maxDayRevenue = -1;
  let bestDayNum = 6; // Saturday default
  dayMap.forEach((entry, d) => {
    if (entry.revenue > maxDayRevenue) {
      maxDayRevenue = entry.revenue;
      bestDayNum = d;
    }
  });

  // Reorder days starting with Monday (1..6, 0)
  const orderedDayIndices = [1, 2, 3, 4, 5, 6, 0];
  const dayOfWeekDistribution: DayOfWeekSalesPoint[] = orderedDayIndices.map((d) => {
    const entry = dayMap.get(d) || { count: 0, revenue: 0 };
    return {
      dayIndex: d,
      dayName: dayNames[d],
      orderCount: entry.count,
      revenue: entry.revenue,
      avgOrderValue: entry.count > 0 ? entry.revenue / entry.count : 0,
      isBestDay: d === bestDayNum && maxDayRevenue > 0,
    };
  });

  const bestDay = dayOfWeekDistribution.find((d) => d.isBestDay) || dayOfWeekDistribution[0] || null;
  const weekendSalesShare = totalPeriodRevenue > 0 ? (weekendRevenue / totalPeriodRevenue) * 100 : 0;

  return {
    hourlyDistribution,
    peakHour,
    dayOfWeekDistribution,
    bestDay,
    weekendSalesShare,
  };
}

// ==========================================
// 3. FAST VS DEAD STOCK MATRIX & TRAPPED CAPITAL
// ==========================================

export interface StockVelocityItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  purchasePrice: number;
  sellingPrice: number;
  quantitySold: number;
  revenueSold: number;
  trappedCapital: number; // currentStock * purchasePrice
  velocity: 'fast' | 'moderate' | 'dead';
  statusLabel: string;
}

export interface InventoryVelocityAnalytics {
  fastCount: number;
  moderateCount: number;
  deadCount: number;
  totalCatalogCount: number;
  fastItems: StockVelocityItem[];
  moderateItems: StockVelocityItem[];
  deadItems: StockVelocityItem[];
  trappedCapitalTotal: number; // Working capital locked in zero-sales stock
  totalInventoryValuation: number; // Total stock value at purchase cost
  trappedCapitalPct: number;
}

export function calculateInventoryVelocityAnalytics(
  products: Product[],
  periodInvoices: Invoice[]
): InventoryVelocityAnalytics {
  // Aggregate units sold per productId during the period
  const salesMap = new Map<number, { unitsSold: number; revenue: number }>();

  periodInvoices.forEach((inv) => {
    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach((item) => {
        if (item.productId) {
          const cur = salesMap.get(item.productId) || { unitsSold: 0, revenue: 0 };
          cur.unitsSold += item.quantity || 1;
          cur.revenue += item.total || 0;
          salesMap.set(item.productId, cur);
        }
      });
    }
  });

  const classifiedItems: StockVelocityItem[] = products.map((p) => {
    const sales = salesMap.get(p.id || 0) || { unitsSold: 0, revenue: 0 };
    const stock = Math.max(0, p.currentStock || 0);
    const purchaseCost = p.purchasePrice || (p.sellingPrice ? p.sellingPrice * 0.75 : 0);
    const trapped = stock * purchaseCost;

    let velocity: 'fast' | 'moderate' | 'dead' = 'moderate';
    let statusLabel = 'Moderate Moving';

    if (sales.unitsSold >= 5) {
      velocity = 'fast';
      statusLabel = 'Fast Mover (High Velocity)';
    } else if (sales.unitsSold === 0 && stock > 0) {
      velocity = 'dead';
      statusLabel = 'Dead Stock (Trapped Capital)';
    } else if (sales.unitsSold > 0) {
      velocity = 'moderate';
      statusLabel = 'Moderate (Steady)';
    } else {
      // 0 sales and 0 stock
      velocity = 'moderate';
      statusLabel = 'Out of Stock / Inactive';
    }

    return {
      id: p.id || 0,
      name: p.name,
      sku: p.sku || 'N/A',
      category: p.category || 'General',
      currentStock: stock,
      purchasePrice: purchaseCost,
      sellingPrice: p.sellingPrice || 0,
      quantitySold: sales.unitsSold,
      revenueSold: sales.revenue,
      trappedCapital: trapped,
      velocity,
      statusLabel,
    };
  });

  const fastItems = classifiedItems
    .filter((i) => i.velocity === 'fast')
    .sort((a, b) => b.revenueSold - a.revenueSold);

  const moderateItems = classifiedItems
    .filter((i) => i.velocity === 'moderate')
    .sort((a, b) => b.quantitySold - a.quantitySold);

  const deadItems = classifiedItems
    .filter((i) => i.velocity === 'dead')
    .sort((a, b) => b.trappedCapital - a.trappedCapital);

  const trappedCapitalTotal = deadItems.reduce((acc, item) => acc + item.trappedCapital, 0);
  const totalInventoryValuation = classifiedItems.reduce(
    (acc, item) => acc + item.currentStock * item.purchasePrice,
    0
  );

  const trappedCapitalPct =
    totalInventoryValuation > 0 ? (trappedCapitalTotal / totalInventoryValuation) * 100 : 0;

  return {
    fastCount: fastItems.length,
    moderateCount: moderateItems.length,
    deadCount: deadItems.length,
    totalCatalogCount: products.length,
    fastItems,
    moderateItems,
    deadItems,
    trappedCapitalTotal,
    totalInventoryValuation,
    trappedCapitalPct,
  };
}

// ==========================================
// 4. CUSTOMER REPEAT VS NEW BUYER & LTV
// ==========================================

export interface LoyalCustomerSummary {
  customerId: number | string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpend: number;
  avgOrderValue: number;
  firstOrderDate: number;
  lastOrderDate: number;
  isRepeatBuyer: boolean;
}

export interface CustomerLtvAnalytics {
  totalUniqueBuyers: number;
  newBuyersCount: number;
  repeatBuyersCount: number;
  repeatRatePct: number;
  avgLtv: number; // Average Lifetime Value
  avgPurchaseFrequency: number; // Avg orders per customer
  newBuyerRevenue: number;
  repeatBuyerRevenue: number;
  topLoyalCustomers: LoyalCustomerSummary[];
}

export function calculateCustomerLtvAnalytics(
  allInvoices: Invoice[],
  periodStart: number,
  periodEnd: number
): CustomerLtvAnalytics {
  // Map customer identifier (phone or name or customerId) across all lifetime invoices
  const customerHistoryMap = new Map<
    string,
    {
      customerId: number | string;
      name: string;
      phone: string;
      invoices: Invoice[];
    }
  >();

  allInvoices.forEach((inv) => {
    // Unique identifier
    const key = inv.customerId
      ? `id-${inv.customerId}`
      : inv.customerPhone
      ? `phone-${inv.customerPhone.trim()}`
      : `name-${(inv.customerName || 'Anonymous').trim().toLowerCase()}`;

    const existing = customerHistoryMap.get(key) || {
      customerId: inv.customerId || 0,
      name: inv.customerName || 'Customer',
      phone: inv.customerPhone || '',
      invoices: [],
    };

    existing.invoices.push(inv);
    customerHistoryMap.set(key, existing);
  });

  // Filter buyers who transacted within the selected period
  const activeInPeriodKeys = new Set<string>();
  allInvoices.forEach((inv) => {
    if (inv.date >= periodStart && inv.date <= periodEnd) {
      const key = inv.customerId
        ? `id-${inv.customerId}`
        : inv.customerPhone
        ? `phone-${inv.customerPhone.trim()}`
        : `name-${(inv.customerName || 'Anonymous').trim().toLowerCase()}`;
      activeInPeriodKeys.add(key);
    }
  });

  let newBuyersCount = 0;
  let repeatBuyersCount = 0;
  let newBuyerRevenue = 0;
  let repeatBuyerRevenue = 0;

  const loyalCustomersList: LoyalCustomerSummary[] = [];

  customerHistoryMap.forEach((entry) => {
    // Sort invoices by date
    const sortedInvs = [...entry.invoices].sort((a, b) => a.date - b.date);
    const firstInvoiceDate = sortedInvs.length > 0 ? sortedInvs[0].date : 0;
    const lastInvoiceDate = sortedInvs.length > 0 ? sortedInvs[sortedInvs.length - 1].date : 0;
    const totalOrders = sortedInvs.length;
    const totalSpend = sortedInvs.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;
    const isRepeatBuyer = totalOrders > 1;

    loyalCustomersList.push({
      customerId: entry.customerId,
      name: entry.name,
      phone: entry.phone,
      totalOrders,
      totalSpend,
      avgOrderValue,
      firstOrderDate: firstInvoiceDate,
      lastOrderDate: lastInvoiceDate,
      isRepeatBuyer,
    });

    // Check period classification
    if (activeInPeriodKeys.has(entry.name) || activeInPeriodKeys.has(`phone-${entry.phone}`) || activeInPeriodKeys.has(`id-${entry.customerId}`)) {
      const periodSpend = sortedInvs
        .filter((inv) => inv.date >= periodStart && inv.date <= periodEnd)
        .reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

      // If the customer's very first invoice falls inside this period, they are a "New Buyer"
      if (firstInvoiceDate >= periodStart && firstInvoiceDate <= periodEnd) {
        newBuyersCount += 1;
        newBuyerRevenue += periodSpend;
      } else {
        repeatBuyersCount += 1;
        repeatBuyerRevenue += periodSpend;
      }
    }
  });

  const totalUniqueBuyers = newBuyersCount + repeatBuyersCount;
  const repeatRatePct = totalUniqueBuyers > 0 ? (repeatBuyersCount / totalUniqueBuyers) * 100 : 0;

  // LTV across active customers
  const totalSpendAll = loyalCustomersList.reduce((acc, c) => acc + c.totalSpend, 0);
  const avgLtv = loyalCustomersList.length > 0 ? totalSpendAll / loyalCustomersList.length : 0;
  const totalOrdersAll = loyalCustomersList.reduce((acc, c) => acc + c.totalOrders, 0);
  const avgPurchaseFrequency =
    loyalCustomersList.length > 0 ? totalOrdersAll / loyalCustomersList.length : 1;

  // Top 8 loyal customers by spend
  const topLoyalCustomers = loyalCustomersList
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 8);

  return {
    totalUniqueBuyers,
    newBuyersCount,
    repeatBuyersCount,
    repeatRatePct,
    avgLtv,
    avgPurchaseFrequency,
    newBuyerRevenue,
    repeatBuyerRevenue,
    topLoyalCustomers,
  };
}
