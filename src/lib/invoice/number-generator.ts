import { db } from '@/db';
import type { InvoiceType } from '@/types';
import { INVOICE_PREFIXES } from '@/types';

/**
 * Generate the next invoice number for a given type.
 * Format: PREFIX-XXXX (e.g., INV-0001, QUO-0001)
 */
export async function generateInvoiceNumber(
  invoiceType: InvoiceType,
  customPrefix?: string
): Promise<string> {
  const prefix = customPrefix || INVOICE_PREFIXES[invoiceType];

  // Find the last invoice of this type
  const lastInvoice = await db.invoices
    .where('invoiceType')
    .equals(invoiceType)
    .reverse()
    .sortBy('createdAt')
    .then(invoices => invoices[0]);

  let nextNumber = 1;

  if (lastInvoice) {
    // Extract number from the last invoice number
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Pad the number with leading zeros to ensure it is at least 7 digits long
  const formattedNumber = String(nextNumber).padStart(7, '0');

  return `${prefix}-${formattedNumber}`;
}

/**
 * Check if an invoice number already exists.
 */
export async function isInvoiceNumberUnique(invoiceNumber: string): Promise<boolean> {
  const existing = await db.invoices
    .where('invoiceNumber')
    .equals(invoiceNumber)
    .first();
  return !existing;
}
