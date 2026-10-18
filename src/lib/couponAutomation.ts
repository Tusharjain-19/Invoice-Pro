import { Coupon } from '@/types';
import { formatDate } from './utils';
import * as XLSX from 'xlsx';

export interface CouponValidationResult {
  isValid: boolean;
  discountAmount: number;
  reason?: string;
}

/**
 * Validate whether a coupon can be applied to an order total.
 */
export function validateCoupon(
  coupon: Coupon | undefined | null,
  cartSubtotal: number
): CouponValidationResult {
  if (!coupon) {
    return { isValid: false, discountAmount: 0, reason: 'Coupon not found.' };
  }

  if (!coupon.isActive) {
    return { isValid: false, discountAmount: 0, reason: `Coupon "${coupon.code}" is currently disabled.` };
  }

  const now = Date.now();
  if (coupon.expiryDate && coupon.expiryDate < now) {
    return {
      isValid: false,
      discountAmount: 0,
      reason: `Coupon "${coupon.code}" expired on ${formatDate(coupon.expiryDate)}.`,
    };
  }

  if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) {
    return {
      isValid: false,
      discountAmount: 0,
      reason: `Coupon "${coupon.code}" has reached its maximum redemption limit (${coupon.timesUsed}/${coupon.usageLimit}).`,
    };
  }

  if (coupon.minOrderValue && cartSubtotal < coupon.minOrderValue) {
    return {
      isValid: false,
      discountAmount: 0,
      reason: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString('en-IN')} required. Cart value is ₹${cartSubtotal.toLocaleString('en-IN')}.`,
    };
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (cartSubtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  // Cap at cart subtotal
  discountAmount = Math.min(discountAmount, cartSubtotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    isValid: true,
    discountAmount,
  };
}

export interface CouponWhatsAppTemplate {
  id: string;
  name: string;
  description: string;
  generateText: (params: {
    coupon: Coupon;
    storeName: string;
    customerName?: string;
    customNote?: string;
  }) => string;
}

export const COUPON_TEMPLATES: CouponWhatsAppTemplate[] = [
  {
    id: 'special_offer',
    name: '🎁 Special Customer Voucher',
    description: 'General promotional discount voucher for customers',
    generateText: ({ coupon, storeName, customerName, customNote }) => {
      const greeting = customerName ? `Hello *${customerName}*! 👋` : `Hello Valued Customer! 👋`;
      const discountText =
        coupon.discountType === 'percentage'
          ? `*${coupon.discountValue}% OFF*`
          : `*FLAT ₹${coupon.discountValue.toLocaleString('en-IN')} OFF*`;
      const maxDiscountInfo =
        coupon.discountType === 'percentage' && coupon.maxDiscount
          ? ` (Up to ₹${coupon.maxDiscount.toLocaleString('en-IN')})`
          : '';

      return (
`${greeting}

🎉 We have an exclusive discount voucher waiting just for you from *${storeName || 'InvoicePro'}*!

━━━━━━━━━━━━━━━━━━━━
🏷️ *VOUCHER CODE:* *${coupon.code}*
💰 *BENEFIT:* ${discountText}${maxDiscountInfo}
🛒 *Min Order Value:* ₹${coupon.minOrderValue.toLocaleString('en-IN')}
⏳ *Valid Till:* ${formatDate(coupon.expiryDate)}
${coupon.description ? `📝 *Offer:* ${coupon.description}\n` : ''}━━━━━━━━━━━━━━━━━━━━

${customNote ? `💬 Note: ${customNote}\n\n` : ''}✨ *How to Redeem:*
Show this coupon code at our billing counter or share it during checkout to claim your savings instantly!

Thank you for being our valued customer! 🙏`
      ).trim();
    },
  },
  {
    id: 'festive_offer',
    name: '🪔 Festive & Season Celebration',
    description: 'Festive season discount voucher for celebrations and holidays',
    generateText: ({ coupon, storeName, customerName, customNote }) => {
      const greeting = customerName ? `Dear *${customerName}*,` : `Dear Valued Customer,`;
      const discountText =
        coupon.discountType === 'percentage'
          ? `*${coupon.discountValue}% DISCOUNT*`
          : `*SAVINGS OF ₹${coupon.discountValue.toLocaleString('en-IN')}*`;

      return (
`${greeting}

✨ Celebrate this joyous festive season with special savings from *${storeName || 'InvoicePro'}*! 🪔🎊

🎁 Here is your exclusive Festive Gift Coupon:
━━━━━━━━━━━━━━━━━━━━
🎟️ *USE CODE:* *${coupon.code}*
💰 *OFFER:* ${discountText}
📦 *Min Spend:* ₹${coupon.minOrderValue.toLocaleString('en-IN')}
🗓️ *Offer Valid Until:* ${formatDate(coupon.expiryDate)}
━━━━━━━━━━━━━━━━━━━━

${customNote ? `📌 Note: ${customNote}\n\n` : ''}🛍️ Visit our store or get in touch with us to shop and redeem your discount today!

Wishing you and your family abundant happiness and prosperity! 🌟`
      ).trim();
    },
  },
  {
    id: 'vip_loyalty',
    name: '👑 VIP Loyalty Privileges',
    description: 'High-value customer loyalty privilege reward voucher',
    generateText: ({ coupon, storeName, customerName, customNote }) => {
      const greeting = customerName ? `Dear VIP Patron *${customerName}*,` : `Dear VIP Patron,`;
      const discountText =
        coupon.discountType === 'percentage'
          ? `*${coupon.discountValue}% Privileged Savings*`
          : `*Flat ₹${coupon.discountValue.toLocaleString('en-IN')} Loyalty Voucher*`;

      return (
`${greeting} 👑

As one of our most valued patrons at *${storeName || 'InvoicePro'}*, we are delighted to present you with an exclusive VIP Loyalty Reward!

━━━━━━━━━━━━━━━━━━━━
💎 *VIP PROMO CODE:* *${coupon.code}*
⚡ *PRIVILEGE:* ${discountText}
🏷️ *Eligibility:* Orders above ₹${coupon.minOrderValue.toLocaleString('en-IN')}
⏰ *Expiry Date:* ${formatDate(coupon.expiryDate)}
━━━━━━━━━━━━━━━━━━━━

${customNote ? `💼 ${customNote}\n\n` : ''}Please quote code *${coupon.code}* when generating your next invoice to avail this privileged benefit.

We deeply appreciate your continued trust in us! 🤝`
      ).trim();
    },
  },
  {
    id: 'flash_sale',
    name: '⚡ Limited Time Flash Sale',
    description: 'Urgency-driven flash sale promotion with quick expiry countdown',
    generateText: ({ coupon, storeName, customerName, customNote }) => {
      const greeting = customerName ? `Hey *${customerName}*! 🔥` : `Flash Sale Alert! 🔥`;
      const discountText =
        coupon.discountType === 'percentage'
          ? `*${coupon.discountValue}% OFF*`
          : `*FLAT ₹${coupon.discountValue.toLocaleString('en-IN')} DISCOUNT*`;

      return (
`${greeting}

⚡ *LIMITED TIME FLASH DEAL* from *${storeName || 'InvoicePro'}*!

Use your secret promo code before it expires:
👉 *CODE:* *${coupon.code}*
💸 *DISCOUNT:* ${discountText}
🛒 *On orders above:* ₹${coupon.minOrderValue.toLocaleString('en-IN')}
⏳ *EXPIRES ON:* ${formatDate(coupon.expiryDate)}!

${customNote ? `📢 ${customNote}\n\n` : ''}Hurry! Redemptions are limited and this offer will not last long. Contact us now to reserve your savings! 🚀`
      ).trim();
    },
  },
  {
    id: 'welcome_deal',
    name: '🌟 Welcome First-Time Offer',
    description: 'Warm welcome voucher for new customers or first-time shoppers',
    generateText: ({ coupon, storeName, customerName, customNote }) => {
      const greeting = customerName ? `Welcome to our family, *${customerName}*! 🌟` : `Welcome to *${storeName || 'InvoicePro'}*! 🌟`;
      const discountText =
        coupon.discountType === 'percentage'
          ? `*${coupon.discountValue}% Welcome Discount*`
          : `*₹${coupon.discountValue.toLocaleString('en-IN')} Welcome Gift*`;

      return (
`${greeting}

Thank you for choosing us! To make your shopping experience extra special, here is a special welcome coupon:

━━━━━━━━━━━━━━━━━━━━
🏷️ *CODE:* *${coupon.code}*
🎁 *REWARD:* ${discountText}
🛍️ *Min Order:* ₹${coupon.minOrderValue.toLocaleString('en-IN')}
📅 *Valid Through:* ${formatDate(coupon.expiryDate)}
━━━━━━━━━━━━━━━━━━━━

${customNote ? `ℹ️ ${customNote}\n\n` : ''}Present code *${coupon.code}* on your next purchase to enjoy this discount. We look forward to serving you! ✨`
      ).trim();
    },
  },
];

/**
 * Format a WhatsApp message for a coupon with options.
 */
export function formatCouponWhatsAppMessage(options: {
  coupon: Coupon;
  storeName?: string;
  customerName?: string;
  customNote?: string;
  templateId?: string;
}): string {
  const { coupon, storeName = 'InvoicePro', customerName, customNote, templateId = 'special_offer' } = options;
  const template = COUPON_TEMPLATES.find(t => t.id === templateId) || COUPON_TEMPLATES[0];
  return template.generateText({ coupon, storeName, customerName, customNote });
}

/**
 * Clean phone number and generate a WhatsApp web / app redirect link.
 */
export function getWhatsAppShareUrl(phoneNumber: string | undefined | null, message: string): string {
  const encodedText = encodeURIComponent(message);
  
  if (!phoneNumber || !phoneNumber.trim()) {
    // Universal share link
    return `https://wa.me/?text=${encodedText}`;
  }

  // Strip all non-digit characters
  let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

  // If 10-digit Indian number without country code, prepend 91
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  } else if (cleanNumber.length === 12 && cleanNumber.startsWith('0')) {
    // 0 followed by 11 digits or 091...
    cleanNumber = cleanNumber.replace(/^0+/, '');
  }

  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

/**
 * Generate random coupon code with prefix
 */
export function generateRandomCouponCode(prefix = 'PROMO'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix.toUpperCase()}${randomPart}`;
}

/**
 * Bulk Broadcast recipient interface
 */
export interface BroadcastRecipient {
  id: string;
  name: string;
  phone: string;
  displayPhone: string;
  isValidPhone: boolean;
  source: 'customer' | 'excel' | 'manual';
  status: 'pending' | 'sent' | 'skipped';
  sentAt?: number;
  city?: string;
  notes?: string;
}

/**
 * Sanitize and validate phone numbers for WhatsApp API
 */
export function sanitizePhoneNumber(phone: string | number | undefined | null): {
  cleanNumber: string;
  isValid: boolean;
  displayFormatted: string;
} {
  if (phone === undefined || phone === null || phone === '') {
    return { cleanNumber: '', isValid: false, displayFormatted: 'No Phone' };
  }

  let cleanStr = String(phone).trim().replace(/[^0-9]/g, '');

  // Handle leading zeros (e.g. 09876543210 -> 9876543210 or 0091...)
  if (cleanStr.length === 11 && cleanStr.startsWith('0')) {
    cleanStr = cleanStr.slice(1);
  } else if (cleanStr.startsWith('00')) {
    cleanStr = cleanStr.replace(/^0+/, '');
  }

  // If standard 10-digit Indian mobile number, add 91 prefix
  if (cleanStr.length === 10) {
    cleanStr = `91${cleanStr}`;
  }

  const isValid = cleanStr.length >= 10 && cleanStr.length <= 15;
  const displayFormatted =
    cleanStr.length === 12 && cleanStr.startsWith('91')
      ? `+91 ${cleanStr.slice(2, 7)} ${cleanStr.slice(7)}`
      : `+${cleanStr}`;

  return { cleanNumber: cleanStr, isValid, displayFormatted };
}

/**
 * Parse recipients from Excel or CSV sheet rows
 */
export function parseRecipientsFromExcelData(rows: Record<string, unknown>[]): {
  recipients: BroadcastRecipient[];
  invalidCount: number;
} {
  const findField = (row: Record<string, unknown>, patterns: string[], defaultValue = ''): string => {
    const keys = Object.keys(row);
    for (const pattern of patterns) {
      const matchedKey = keys.find(
        (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pattern.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (matchedKey !== undefined && row[matchedKey] !== null && row[matchedKey] !== '') {
        return String(row[matchedKey]).trim();
      }
    }
    return defaultValue;
  };

  const recipients: BroadcastRecipient[] = [];
  let invalidCount = 0;

  rows.forEach((row, idx) => {
    const rawName = findField(
      row,
      ['name', 'customername', 'customer', 'client', 'recipient', 'contactname', 'person', 'lead'],
      `Customer ${idx + 1}`
    );
    const rawPhone = findField(
      row,
      ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'whatsapp', 'contactnumber', 'number', 'tel', 'cell'],
      ''
    );
    const rawCity = findField(row, ['city', 'location', 'town', 'state', 'address'], '');
    const rawNotes = findField(row, ['notes', 'remarks', 'comment', 'customnote'], '');

    if (!rawPhone && !rawName) return; // Skip completely blank lines

    const { cleanNumber, isValid, displayFormatted } = sanitizePhoneNumber(rawPhone);
    if (!isValid) invalidCount++;

    recipients.push({
      id: `excel-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      name: rawName,
      phone: cleanNumber,
      displayPhone: isValid ? displayFormatted : (rawPhone || 'Invalid Phone'),
      isValidPhone: isValid,
      source: 'excel',
      status: 'pending',
      city: rawCity || undefined,
      notes: rawNotes || undefined,
    });
  });

  return { recipients, invalidCount };
}

/**
 * Parse recipients from pasted text (e.g. "Rahul, 9876543210" or "9876543210")
 */
export function parseRecipientsFromPastedText(text: string): BroadcastRecipient[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/[\r\n]+/);
  const recipients: BroadcastRecipient[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let name = `Recipient ${idx + 1}`;
    let phonePart = trimmed;

    // Detect delimiter like comma, tab, semicolon or dash
    if (trimmed.includes(',') || trimmed.includes('\t') || trimmed.includes(';') || trimmed.includes('-')) {
      const parts = trimmed.split(/[,;\t\-]+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // If first part has digits and second has letters, swap
        if (/[0-9]{7,}/.test(parts[0]) && !/[0-9]{7,}/.test(parts[1])) {
          phonePart = parts[0];
          name = parts[1];
        } else {
          name = parts[0];
          phonePart = parts[1];
        }
      }
    }

    const { cleanNumber, isValid, displayFormatted } = sanitizePhoneNumber(phonePart);

    recipients.push({
      id: `paste-${Date.now()}-${idx}`,
      name,
      phone: cleanNumber,
      displayPhone: isValid ? displayFormatted : (phonePart || 'Invalid Phone'),
      isValidPhone: isValid,
      source: 'excel',
      status: 'pending',
    });
  });

  return recipients;
}

/**
 * Download sample Excel template for bulk WhatsApp broadcasting
 */
export function downloadBroadcastExcelTemplate(): void {
  const sampleData = [
    { Name: 'Rahul Sharma', Phone: '9876543210', City: 'Mumbai', Notes: 'Prefers festival offers' },
    { Name: 'Priya Patel', Phone: '9823456781', City: 'Ahmedabad', Notes: 'VIP Customer' },
    { Name: 'Amit Verma', Phone: '9711223344', City: 'Delhi', Notes: 'Electronics category buyer' },
    { Name: 'Sneha Rao', Phone: '9655443322', City: 'Bengaluru', Notes: 'New customer' },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // Auto-fit column widths
  ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 30 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Broadcast Contacts');
  XLSX.writeFile(wb, 'InvoicePro_WhatsApp_Broadcast_Template.xlsx');
}

/**
 * Export campaign audit log report to Excel
 */
export function exportBroadcastAuditReport(
  recipients: BroadcastRecipient[],
  couponCode: string,
  storeName = 'InvoicePro'
): void {
  const reportRows = recipients.map((r, idx) => ({
    '#': idx + 1,
    'Customer Name': r.name,
    'WhatsApp Number': r.displayPhone,
    'Coupon Code': couponCode,
    Status: r.status.toUpperCase(),
    Source: r.source === 'customer' ? 'Customer Directory' : 'Excel Import',
    City: r.city || 'N/A',
    'Dispatched Time': r.sentAt ? new Date(r.sentAt).toLocaleString('en-IN') : 'Not Sent',
  }));

  const ws = XLSX.utils.json_to_sheet(reportRows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Campaign Summary');

  const cleanCode = couponCode.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `WhatsApp_Broadcast_Report_${cleanCode}_${dateStr}.xlsx`);
}

