'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Send, MessageSquare, AlertTriangle, ArrowUpRight, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice } from '@/types';

interface PendingPaymentsCardProps {
  invoices: Invoice[];
}

export function PendingPaymentsCard({ invoices }: PendingPaymentsCardProps) {
  const pendingInvoices = invoices.filter(inv => inv.balanceDue > 0);

  const getDaysOverdue = (dueDate: number | null) => {
    if (!dueDate) return 0;
    const diffTime = Date.now() - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getWhatsAppLink = (invoice: Invoice) => {
    const text = `Dear ${invoice.customerName || 'Customer'}, this is a friendly reminder that payment of ${formatCurrency(invoice.balanceDue)} for Invoice ${invoice.invoiceNumber} was due on ${invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}. Please settle the dues at your earliest convenience. Thank you!`;
    const cleanPhone = invoice.customerPhone ? invoice.customerPhone.replace(/[^0-9]/g, '') : '';
    // Format for Indian numbers if they don't have country code
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Pending Payments</CardTitle>
            <p className="text-[11px] text-muted-foreground/80 font-medium">Pending balances & payment collection</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-xs hover:bg-muted/50 rounded-lg animate-in" asChild>
          <Link href="/invoices" className="gap-1 font-bold text-primary">
            All Invoices <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="pt-4 px-4 pb-4 space-y-3 max-h-75 overflow-y-auto">
        {pendingInvoices.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-55" />
            <p className="text-xs font-semibold">No pending collections</p>
          </div>
        ) : (
          pendingInvoices.map((inv) => {
            const daysOverdue = getDaysOverdue(inv.dueDate);
            const isOverdue = daysOverdue > 0;

            return (
              <div key={inv.id} className="p-3.5 rounded-xl bg-muted/10 border border-border/30 hover:border-border transition-all flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold text-foreground truncate">{inv.customerName || 'Walk-in Customer'}</p>
                    <span className="text-[10px] text-muted-foreground/80 font-semibold">{inv.invoiceNumber}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground">{formatCurrency(inv.balanceDue, 0)}</span>
                    {isOverdue && (
                      <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[9px] font-bold rounded px-1.5 py-0.2">
                        {daysOverdue} days overdue
                      </Badge>
                    )}
                  </div>
                  {inv.dueDate && (
                    <span className="text-[9px] text-muted-foreground/80 font-medium block mt-1">
                      Due Date: {formatDate(inv.dueDate)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {inv.customerPhone && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8.5 w-8.5 rounded-xl border-border/50 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20"
                      asChild
                    >
                      <a href={getWhatsAppLink(inv)} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="h-4.5 w-4.5" />
                      </a>
                    </Button>
                  )}
                  <Link 
                    href={`/invoices/${inv.id}`}
                    className="h-8.5 px-3 rounded-xl text-xs font-bold gap-1 border border-border/50 hover:bg-muted inline-flex items-center justify-center transition-colors shadow-xs"
                  >
                    <Send className="h-3 w-3" />
                    Details
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
