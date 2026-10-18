'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Invoice, Loan, Customer } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Send,
  Copy,
  Check,
  QrCode,
  AlertTriangle,
  Clock,
  Sparkles,
  Phone,
  IndianRupee,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

export type ReminderType = 'polite' | 'due_soon' | 'overdue' | 'emi_due';

interface WhatsAppDueReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  loan?: Loan | null;
  customer?: Customer | null;
  defaultType?: ReminderType;
}

export function WhatsAppDueReminderModal({
  open,
  onOpenChange,
  invoice,
  loan,
  customer,
  defaultType = 'polite',
}: WhatsAppDueReminderModalProps) {
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  const [reminderType, setReminderType] = useState<ReminderType>(defaultType);
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Initialize phone and amount when target changes
  useEffect(() => {
    if (invoice) {
      setTargetPhone(invoice.customerPhone || '');
      setCustomAmount(invoice.balanceDue || invoice.totalAmount);
      if (invoice.dueDate && invoice.dueDate < Date.now() && invoice.balanceDue > 0) {
        setReminderType('overdue');
      } else {
        setReminderType('polite');
      }
    } else if (loan) {
      setCustomAmount(loan.monthlyEMI || loan.remainingAmount);
      setReminderType('emi_due');
      // Look up customer phone if not on loan
      if (loan.customerId) {
        db.customers.get(loan.customerId).then(c => {
          if (c?.phone) setTargetPhone(c.phone);
        });
      }
    } else if (customer) {
      setTargetPhone(customer.phone || '');
    }
  }, [invoice, loan, customer, open]);

  // UPI deep link
  const upiId = settings?.upiId || '';
  const companyName = settings?.companyName || 'Our Store';
  const companyPhone = settings?.companyPhone || '';

  const upiPaymentLink = useMemo(() => {
    if (!upiId || customAmount <= 0) return '';
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(companyName)}&am=${customAmount}&cu=INR`;
  }, [upiId, companyName, customAmount]);

  // Generated WhatsApp message text
  const messageText = useMemo(() => {
    const custName = invoice?.customerName || loan?.customerName || customer?.name || 'Customer';
    const amountStr = formatCurrency(customAmount);

    let content = '';

    if (reminderType === 'polite') {
      content = `Namaste ${custName} ji,\n\nGreetings from *${companyName}*! 🙏\n\nThis is a friendly update regarding your Invoice *#${invoice?.invoiceNumber || ''}* dated ${invoice ? formatDate(invoice.date) : ''}.\n\n` +
        `• Total Bill Amount: ${invoice ? formatCurrency(invoice.totalAmount) : ''}\n` +
        `• Pending Balance: *${amountStr}*\n` +
        (invoice?.dueDate ? `• Due Date: ${formatDate(invoice.dueDate)}\n\n` : '\n') +
        `You can easily settle this payment via UPI using the link below:\n👉 ${upiPaymentLink || 'UPI ID: ' + upiId}\n\n` +
        `Thank you for your business! Feel free to reach out if you have any questions.\n\nBest regards,\n*${companyName}*\n${companyPhone ? '📞 ' + companyPhone : ''}`;
    } else if (reminderType === 'due_soon') {
      content = `Dear ${custName},\n\nHope you are doing well!\n\nThis is a gentle reminder that your payment of *${amountStr}* for Invoice *#${invoice?.invoiceNumber || ''}* is due on *${invoice?.dueDate ? formatDate(invoice.dueDate) : 'soon'}*.\n\n` +
        `Kindly settle the due amount to avoid any late payment charges.\n\n` +
        `📲 *Pay via UPI*: ${upiPaymentLink || 'UPI ID: ' + upiId}\n\n` +
        `Thank you,\n*${companyName}*\n${companyPhone ? '📞 ' + companyPhone : ''}`;
    } else if (reminderType === 'overdue') {
      content = `⚠️ *URGENT PAYMENT REMINDER*\n\nDear ${custName},\n\nYour payment for Invoice *#${invoice?.invoiceNumber || ''}* is currently *OVERDUE*.\n\n` +
        `• Overdue Amount: *${amountStr}*\n` +
        (invoice?.dueDate ? `• Was Due On: ${formatDate(invoice.dueDate)}\n\n` : '\n') +
        `Please clear this outstanding balance immediately to avoid interest / credit hold.\n\n` +
        `📲 *Instant UPI Payment*: ${upiPaymentLink || 'UPI ID: ' + upiId}\n\n` +
        `If you have already made this payment, please reply with the screenshot.\n\nRegards,\n*${companyName}*\n${companyPhone ? '📞 ' + companyPhone : ''}`;
    } else if (reminderType === 'emi_due') {
      content = `Namaste ${custName} ji,\n\nThis is a reminder regarding your EMI installment for Loan Account *#${loan?.loanNumber || ''}*.\n\n` +
        `• Monthly EMI Due: *${amountStr}*\n` +
        (loan?.nextDueDate ? `• Due Date: *${formatDate(loan.nextDueDate)}*\n` : '') +
        `• Remaining Principal: ${loan ? formatCurrency(loan.remainingAmount) : ''}\n\n` +
        `Please pay your installment on or before the due date to maintain a good credit record.\n\n` +
        `📲 *Pay via UPI*: ${upiPaymentLink || 'UPI ID: ' + upiId}\n\n` +
        `Thank you,\n*${companyName}*\n${companyPhone ? '📞 ' + companyPhone : ''}`;
    }

    return content;
  }, [reminderType, invoice, loan, customer, customAmount, companyName, companyPhone, upiPaymentLink, upiId]);

  // Handle WhatsApp launch
  const handleSendWhatsApp = () => {
    const rawDigits = targetPhone.replace(/\D/g, '');
    if (!rawDigits) {
      toast.error('Please enter a valid customer phone number');
      return;
    }
    const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
    toast.success('WhatsApp opened with payment reminder!');
    onOpenChange(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">WhatsApp Payment Reminder</DialogTitle>
              <DialogDescription className="text-xs">
                Send a personalized due reminder with instant UPI pay links directly to customer WhatsApp
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Target Customer Info Header */}
          <div className="p-3 rounded-xl bg-muted/40 border grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Customer</span>
              <span className="font-bold text-foreground text-sm">
                {invoice?.customerName || loan?.customerName || customer?.name || 'Customer'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                {loan ? 'EMI Due Amount' : 'Balance Due'}
              </span>
              <span className="font-black text-sm font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(customAmount)}
              </span>
            </div>
          </div>

          {/* Customer Phone Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Customer WhatsApp Phone Number *</span>
              <span className="text-[10px] text-muted-foreground font-normal">Auto-formatted with +91</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
              <Input
                value={targetPhone}
                onChange={e => setTargetPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="pl-9 h-9 font-mono text-xs font-bold"
              />
            </div>
          </div>

          {/* Reminder Tone / Template Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Select Reminder Template</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReminderType('polite')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                  reminderType === 'polite'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Polite Friendly</span>
                </div>
                <p className="text-[10px] font-normal opacity-80 mt-0.5">Gentle status update</p>
              </button>

              <button
                type="button"
                onClick={() => setReminderType('due_soon')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                  reminderType === 'due_soon'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                    : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Due Date Approaching</span>
                </div>
                <p className="text-[10px] font-normal opacity-80 mt-0.5">Upcoming payment nudge</p>
              </button>

              <button
                type="button"
                onClick={() => setReminderType('overdue')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                  reminderType === 'overdue'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold'
                    : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Urgent Overdue</span>
                </div>
                <p className="text-[10px] font-normal opacity-80 mt-0.5">Immediate action notice</p>
              </button>

              <button
                type="button"
                onClick={() => setReminderType('emi_due')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all ${
                  reminderType === 'emi_due'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" />
                  <span>EMI Installment</span>
                </div>
                <p className="text-[10px] font-normal opacity-80 mt-0.5">Loan installment due alert</p>
              </button>
            </div>
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Message Preview</Label>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                Includes Instant UPI Link
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground max-h-52 overflow-y-auto">
              {messageText}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCopy} className="w-full sm:w-auto gap-1.5 text-xs font-bold">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Message'}</span>
          </Button>

          <Button
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Open WhatsApp & Send</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
