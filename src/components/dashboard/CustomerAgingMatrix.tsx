'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Users, Clock, AlertCircle, ArrowUpRight, X, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
}

export interface OverdueCustomer {
  id: number;
  name: string;
  phone?: string;
  balanceDue: number;
  oldestInvoiceDays: number;
  invoiceCount: number;
}

export interface CustomerAgingData {
  buckets: AgingBucket[];
  totalOverdue: number;
  overdueCustomers: OverdueCustomer[];
}

interface CustomerAgingMatrixProps {
  data: CustomerAgingData;
  onRemove?: () => void;
}

export function CustomerAgingMatrix({ data, onRemove }: CustomerAgingMatrixProps) {
  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Clock className="h-4.5 w-4.5 text-rose-500" />
              Receivables Aging Matrix
            </CardTitle>
            <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">
              Credit Risk
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground/80">
            Customer outstanding balances grouped by payment due duration
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs font-bold text-primary gap-1">
            <Link href="/customers">
              Customers <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
              title="Remove widget from dashboard"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Aging Buckets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {data.buckets.map((b) => (
            <div key={b.label} className="p-2.5 rounded-xl border border-border/40 bg-muted/15 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{b.label}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                  {b.count} bills
                </span>
              </div>
              <p className="text-sm font-extrabold text-foreground mt-1.5 font-mono">{formatCurrency(b.amount)}</p>
              <div className="h-1 w-full rounded-full mt-2" style={{ backgroundColor: b.color }} />
            </div>
          ))}
        </div>

        {/* Top Pending Debtors List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>High Priority Receivables</span>
            <span>Total Overdue: <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(data.totalOverdue)}</strong></span>
          </div>

          {data.overdueCustomers.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-1 text-emerald-500 opacity-60" />
              All customer invoices are cleared on time!
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.overdueCustomers.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/30 hover:border-border/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.oldestInvoiceDays > 0 ? `${c.oldestInvoiceDays} days pending` : 'Due today'} · {c.invoiceCount} invoices
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(c.balanceDue)}</p>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-[10px] text-primary hover:underline flex items-center gap-0.5 justify-end mt-0.5">
                        <PhoneCall className="h-2.5 w-2.5" /> Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
