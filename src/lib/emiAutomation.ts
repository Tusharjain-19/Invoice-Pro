import { formatCurrency, formatDate } from './utils';
import type { AppSettings } from '@/types';

export interface EmiReminderParams {
  customerName: string;
  customerPhone?: string;
  loanNumber: string;
  installmentNo: number;
  totalInstallments?: number;
  amountDue: number;
  dueDate: number;
  isOverdue?: boolean;
  daysOverdue?: number;
  settings?: AppSettings | null;
}

/**
 * Format a professional, localized WhatsApp payment reminder message.
 */
export function generateWhatsAppEmiMessage(params: EmiReminderParams): string {
  const {
    customerName,
    loanNumber,
    installmentNo,
    totalInstallments,
    amountDue,
    dueDate,
    isOverdue,
    daysOverdue = 0,
    settings,
  } = params;

  const companyName = settings?.companyName || 'Our Store';
  const upiId = settings?.upiId;
  const bankName = settings?.bankName;
  const bankAccount = settings?.bankAccountNumber;
  const bankIfsc = settings?.bankIfsc;

  const statusLine = isOverdue
    ? `⚠️ *URGENT OVERDUE NOTICE* (Overdue by ${daysOverdue} days)`
    : `🗓️ *Payment Due Notice* (Due Date: ${formatDate(dueDate)})`;

  let message = `Hello *${customerName}*,\n\n`;
  message += `Greetings from *${companyName}*.\n\n`;
  message += `${statusLine}\n\n`;
  message += `This is a reminder regarding your EMI installment for Loan Account *${loanNumber}*.\n\n`;
  message += `📋 *Installment Details:*\n`;
  message += `• Installment: #${installmentNo}${totalInstallments ? ` of ${totalInstallments}` : ''}\n`;
  message += `• *Amount Due: ${formatCurrency(amountDue)}*\n`;
  message += `• Due Date: ${formatDate(dueDate)}\n\n`;

  // Payment Options
  message += `💳 *How to Pay:*\n`;
  if (upiId) {
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(companyName)}&am=${amountDue}&cu=INR`;
    message += `• *UPI ID:* ${upiId}\n`;
    message += `• *Instant UPI Pay Link:* ${upiLink}\n`;
  }
  if (bankName && bankAccount) {
    message += `• *Bank Transfer:* ${bankName}\n`;
    message += `  A/C: ${bankAccount} | IFSC: ${bankIfsc || 'N/A'}\n`;
  }
  message += `• Or visit our store counter directly.\n\n`;

  message += `_Kindly ignore this message if you have already completed the payment._\n\n`;
  message += `Thank you for your business!\n`;
  message += `*${companyName}*`;
  if (settings?.companyPhone) {
    message += ` | Helpline: ${settings.companyPhone}`;
  }

  return message;
}

/**
 * Open WhatsApp directly with the pre-filled payment message
 */
export function openWhatsAppEmiReminder(phone: string | undefined, message: string): boolean {
  if (!phone) {
    // If no phone, still open WhatsApp web so user can search contact
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    return true;
  }

  // Clean phone number (remove spaces, hyphens, plus)
  let cleanPhone = phone.replace(/[^0-9]/g, '');

  // If 10 digits (standard Indian number without country code), prepend 91
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
  return true;
}
