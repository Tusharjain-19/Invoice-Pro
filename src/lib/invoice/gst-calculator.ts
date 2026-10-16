import type { InvoiceItem, GSTBreakdown } from '@/types';

/**
 * Calculate GST for a single line item.
 * Supports both inclusive and exclusive tax calculation.
 * Determines CGST/SGST vs IGST based on state comparison.
 */
export function calculateItemGST(
  item: {
    quantity: number;
    rate: number;
    discount: number;
    discountType: 'percentage' | 'amount';
    gstRate: number;
  },
  isTaxInclusive: boolean,
  isInterState: boolean
): {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
} {
  const qty = parseFloat(item.quantity as any) || 0;
  const rate = parseFloat(item.rate as any) || 0;
  const disc = parseFloat(item.discount as any) || 0;

  // Calculate line total before tax
  const lineTotal = qty * rate;

  // Apply discount (clamped to prevent negative totals)
  let discountAmount: number;
  if (item.discountType === 'percentage') {
    const clampedPct = Math.min(100, Math.max(0, disc));
    discountAmount = (lineTotal * clampedPct) / 100;
  } else {
    discountAmount = Math.min(lineTotal, Math.max(0, disc));
  }

  const afterDiscount = Math.max(0, lineTotal - discountAmount);

  let taxableAmount: number;
  let gstAmount: number;

  if (isTaxInclusive) {
    // Price includes tax, extract base amount
    taxableAmount = afterDiscount / (1 + item.gstRate / 100);
    gstAmount = afterDiscount - taxableAmount;
  } else {
    // Price is exclusive of tax
    taxableAmount = afterDiscount;
    gstAmount = (taxableAmount * item.gstRate) / 100;
  }

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = gstAmount;
  } else {
    cgst = gstAmount / 2;
    sgst = gstAmount / 2;
  }

  const total = taxableAmount + gstAmount;

  return {
    taxableAmount: round2(taxableAmount),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    total: round2(total),
  };
}

/**
 * Calculate full invoice GST breakdown from all items.
 */
export function calculateInvoiceGST(
  items: InvoiceItem[],
  isTaxInclusive: boolean,
  isInterState: boolean,
  discount: number = 0,
  discountType: 'percentage' | 'amount' = 'amount'
): GSTBreakdown & { subtotal: number; discount: number; roundOff: number } {
  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const item of items) {
    const result = calculateItemGST(
      {
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        discountType: item.discountType,
        gstRate: item.gstRate,
      },
      isTaxInclusive,
      isInterState
    );

    const qty = parseFloat(item.quantity as any) || 0;
    const rate = parseFloat(item.rate as any) || 0;

    subtotal += qty * rate;
    totalCgst += result.cgst;
    totalSgst += result.sgst;
    totalIgst += result.igst;
  }

  const totalTax = totalCgst + totalSgst + totalIgst;
  const taxableAmount = items.reduce((acc, item) => {
    const result = calculateItemGST(
      {
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        discountType: item.discountType,
        gstRate: item.gstRate,
      },
      isTaxInclusive,
      isInterState
    );
    return acc + result.taxableAmount;
  }, 0);

  // Apply overall discount (clamped to prevent negative totals)
  let overallDiscount = 0;
  const maxDiscountable = taxableAmount + totalTax;
  if (discountType === 'percentage') {
    const clampedPct = Math.min(100, Math.max(0, discount));
    overallDiscount = (maxDiscountable * clampedPct) / 100;
  } else {
    overallDiscount = Math.min(maxDiscountable, Math.max(0, discount));
  }

  const beforeRoundOff = Math.max(0, maxDiscountable - overallDiscount);
  const roundOff = Math.round(beforeRoundOff) - beforeRoundOff;
  const totalAmount = Math.round(beforeRoundOff);

  return {
    subtotal: round2(subtotal),
    taxableAmount: round2(taxableAmount),
    cgst: round2(totalCgst),
    sgst: round2(totalSgst),
    igst: round2(totalIgst),
    totalTax: round2(totalTax),
    discount: round2(overallDiscount),
    roundOff: round2(roundOff),
    totalAmount,
  };
}

/**
 * Determine if transaction is inter-state (IGST) or intra-state (CGST+SGST).
 */
export function isInterStateTransaction(
  sellerState: string,
  buyerState: string
): boolean {
  if (!sellerState || !buyerState) return false;
  return sellerState.toLowerCase().trim() !== buyerState.toLowerCase().trim();
}

/**
 * Get GST rate-wise summary for reports.
 */
export function getGSTRateSummary(
  items: InvoiceItem[],
  isTaxInclusive: boolean,
  isInterState: boolean
): Array<{
  rate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}> {
  const rateMap = new Map<number, {
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  }>();

  for (const item of items) {
    const result = calculateItemGST(
      {
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        discountType: item.discountType,
        gstRate: item.gstRate,
      },
      isTaxInclusive,
      isInterState
    );

    const existing = rateMap.get(item.gstRate) || {
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
    };

    rateMap.set(item.gstRate, {
      taxableAmount: existing.taxableAmount + result.taxableAmount,
      cgst: existing.cgst + result.cgst,
      sgst: existing.sgst + result.sgst,
      igst: existing.igst + result.igst,
      total: existing.total + result.total,
    });
  }

  return Array.from(rateMap.entries())
    .map(([rate, data]) => ({ rate, ...data }))
    .sort((a, b) => a.rate - b.rate);
}

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}
