'use client';

import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Customer, Invoice, Loan } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  FileText,
  Printer,
  Send,
  MessageCircle,
  Download,
  IndianRupee,
  Calendar,
  Sparkles,
  Phone,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerKhataLedgerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function CustomerKhataLedgerModal({
  open,
  onOpenChange,
  customer,
}: CustomerKhataLedgerModalProps) {
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const allInvoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const allLoans = useLiveQuery(() => db.loans.toArray()) || [];

  // Filter transactions for this customer
  const transactions = useMemo(() => {
    if (!customer) return [];

    const custInvoices = allInvoices.filter(
      inv => (inv.customerId && inv.customerId === customer.id) ||
        (inv.customerPhone && customer.phone && inv.customerPhone.trim() === customer.phone.trim()) ||
        (inv.customerName && inv.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim())
    );

    const custLoans = allLoans.filter(
      l => l.customerId === customer.id || l.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim()
    );

    const list: Array<{
      id: string;
      date: number;
      refNumber: string;
      type: 'Invoice' | 'Payment' | 'Loan / EMI';
      debit: number;
      credit: number;
      balance: number;
      notes: string;
    }> = [];

    // Add Invoices
    custInvoices.forEach(inv => {
      list.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        refNumber: inv.invoiceNumber,
        type: 'Invoice',
        debit: inv.totalAmount,
        credit: inv.paidAmount,
        balance: inv.balanceDue,
        notes: inv.status.toUpperCase(),
      });
    });

    // Add Loans
    custLoans.forEach(loan => {
      list.push({
        id: `loan-${loan.id}`,
        date: loan.startDate,
        refNumber: loan.loanNumber,
        type: 'Loan / EMI',
        debit: loan.loanAmount,
        credit: loan.paidAmount,
        balance: loan.remainingAmount,
        notes: `${loan.loanType.toUpperCase()} (${loan.status})`,
      });
    });

    return list.sort((a, b) => b.date - a.date);
  }, [customer, allInvoices, allLoans]);

  // Totals
  const totals = useMemo(() => {
    const totalBilled = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalPaid = transactions.reduce((sum, t) => sum + t.credit, 0);
    const netBalance = transactions.reduce((sum, t) => sum + t.balance, 0);
    return { totalBilled, totalPaid, netBalance };
  }, [transactions]);

  if (!customer) return null;

  // WhatsApp Khata statement
  const handleSendWhatsAppStatement = () => {
    if (!customer.phone) {
      toast.error('Customer has no phone number recorded');
      return;
    }
    const cleanDigits = customer.phone.replace(/\D/g, '');
    const targetPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

    const upiId = settings?.upiId || '';
    const upiLink = upiId && totals.netBalance > 0
      ? `\n📲 *Pay Pending Dues via UPI*:\nupi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(settings?.companyName || 'Store')}&am=${totals.netBalance}&cu=INR\n`
      : '';

    const text = `Namaste *${customer.name}* ji,\n\nGreetings from *${settings?.companyName || 'Our Store'}*! 🙏\n\nHere is your official *Account Statement & Khata Summary*:\n\n` +
      `• Total Billed Purchases: *${formatCurrency(totals.totalBilled)}*\n` +
      `• Total Payments Received: *${formatCurrency(totals.totalPaid)}*\n` +
      `• Outstanding Balance Due: *${formatCurrency(totals.netBalance)}*\n` +
      `• Loyalty Points Earned: *${customer.loyaltyPoints || 0} pts*\n` +
      (totals.netBalance > 0 ? `\n⚠️ Kindly settle the balance due of *${formatCurrency(totals.netBalance)}*.${upiLink}\n` : '\n✓ Your account is fully settled. Thank you!\n\n') +
      `Best regards,\n*${settings?.companyName || 'Our Store'}*\n${settings?.companyPhone ? '📞 ' + settings.companyPhone : ''}`;

    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    toast.success('Opened WhatsApp statement');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Customer Khata Statement &amp; Ledger</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Complete purchase history, receipts, running balance, and loyalty rewards
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendWhatsAppStatement}
                className="h-8 text-xs font-bold text-emerald-600 border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/20 gap-1.5"
              >
                <MessageCircle className="h-4 w-4" /> Share Statement on WhatsApp
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print Ledger
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Customer Header Snapshot */}
        <div className="p-4 rounded-xl bg-card border grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs my-2">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Customer Name</span>
            <span className="font-extrabold text-sm text-foreground">{customer.name}</span>
            {customer.phone && <p className="text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{customer.phone}</p>}
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Total Billed</span>
            <span className="font-extrabold text-base font-mono text-foreground block mt-0.5">
              {formatCurrency(totals.totalBilled)}
            </span>
            <span className="text-[10px] text-muted-foreground">{transactions.length} transactions</span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Total Paid</span>
            <span className="font-extrabold text-base font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {formatCurrency(totals.totalPaid)}
            </span>
            <span className="text-[10px] text-muted-foreground">Settled collections</span>
          </div>

          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-bold tracking-wider block">Balance Due</span>
            <span className="font-black text-lg font-mono text-rose-600 dark:text-rose-400 block">
              {formatCurrency(totals.netBalance)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 font-bold">
              <Sparkles className="h-3 w-3" />
              <span>{customer.loyaltyPoints || 0} Loyalty Pts</span>
            </div>
          </div>
        </div>

        {/* Chronological Statement Table */}
        <div className="border rounded-xl overflow-hidden bg-card text-xs">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-muted border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3 text-right">Debit (Billed)</th>
                  <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground font-sans text-xs">
                      No invoices or loans recorded yet for this customer.
                    </td>
                  </tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-foreground">{t.type}</td>
                      <td className="py-2 px-3 font-bold text-primary">{t.refNumber}</td>
                      <td className="py-2 px-3 text-right text-foreground">{formatCurrency(t.debit)}</td>
                      <td className="py-2 px-3 text-right text-emerald-600 font-bold">{formatCurrency(t.credit)}</td>
                      <td className={`py-2 px-3 text-right font-black ${t.balance > 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                        {formatCurrency(t.balance)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant="outline" className="text-[9px] font-sans px-1.5 py-0 uppercase">
                          {t.notes}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
