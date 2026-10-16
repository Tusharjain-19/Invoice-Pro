'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowUpRight, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice } from '@/types';

interface RecentInvoicesCardProps {
  invoices: Invoice[];
}

export function RecentInvoicesCard({ invoices }: RecentInvoicesCardProps) {
  const getStatusBadge = (status?: unknown) => {
    const s = typeof status === 'string' ? status.toLowerCase() : '';
    switch (s) {
      case 'paid':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-lg px-2 py-0.5">
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-lg px-2 py-0.5">
            Partial
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-bold rounded-lg px-2 py-0.5">
            Overdue
          </Badge>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider text-rose-500 bg-rose-50 border border-rose-200 uppercase">
            Cancelled
          </span>
        );
      default:
        return (
          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-lg px-2 py-0.5 capitalize">
            {typeof status === 'string' && status ? status : 'Pending'}
          </Badge>
        );
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Recent Invoices</CardTitle>
            <p className="text-[11px] text-muted-foreground/80 font-medium">Quick access to latest transactions</p>
          </div>
        </div>
        <Link 
          href="/invoices" 
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:bg-muted/50 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          View All <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      
      <CardContent className="p-0">
        {!invoices || invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold">No invoices generated yet</p>
            <Link 
              href="/invoices/create"
              className="mt-3 inline-flex items-center justify-center rounded-xl text-xs font-bold border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3.5 transition-colors shadow-xs"
            >
              Create Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider bg-muted/10">
                  <th className="py-3 px-5">Invoice No</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Amount</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv?.id ?? inv?.invoiceNumber} className="hover:bg-muted/20 transition-colors group">
                    <td className="py-3 px-5 font-bold text-foreground">{inv?.invoiceNumber || '-'}</td>
                    <td className="py-3 px-5 text-muted-foreground font-medium truncate max-w-37.5">
                      {inv?.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-5 font-bold text-foreground">{formatCurrency(inv?.totalAmount || 0, 0)}</td>
                    <td className="py-3 px-5">{getStatusBadge(inv?.status)}</td>
                    <td className="py-3 px-5 text-muted-foreground/80 font-medium">{formatDate(inv?.date || 0)}</td>
                    <td className="py-3 px-5 text-right">
                      <Button variant="ghost" size="icon" className="h-8.5 w-8.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                        <Link href={`/invoices/${inv?.id}`}>
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
