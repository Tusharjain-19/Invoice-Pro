'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Package, Wallet, Upload, Sparkles, IndianRupee, Calendar } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

interface WelcomeCardProps {
  companyName: string;
  financialYear: string;
  todaySales: number;
}

export function WelcomeCard({ companyName, financialYear, todaySales }: WelcomeCardProps) {
  const currentDate = formatDate(Date.now());

  return (
    <Card className="border-0 rounded-xl bg-primary text-white shadow-xl shadow-primary/10 overflow-hidden relative group">
      {/* Abstract circles design - pointer-events-none so they never block clicks */}
      <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-48 h-48 bg-white/5 rounded-full translate-y-10 blur-xl" />

      <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 text-white/95 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-md">
              Dashboard Active
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 text-white/95 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {financialYear}
            </span>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {companyName || 'My Business Sandbox'}
            </h2>
            <p className="text-xs text-white/70 font-semibold">{currentDate}</p>
          </div>

          {/* Quick Actions inside Card */}
          <div className="flex flex-wrap gap-2.5 pt-1.5 relative z-20">
            <Link
              href="/invoices/create"
              className="inline-flex items-center justify-center rounded-xl font-extrabold bg-white text-primary hover:bg-white/90 gap-2 shadow-md text-xs h-9 px-4 transition-colors cursor-pointer select-none"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>Create Invoice</span>
            </Link>
            <Link
              href="/products?action=add"
              className="inline-flex items-center justify-center rounded-xl font-bold border border-white/30 hover:bg-white/15 text-white gap-1.5 text-xs bg-white/10 h-9 px-3.5 transition-colors cursor-pointer select-none"
            >
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span>Add Product</span>
            </Link>
            <Link
              href="/expenses?action=add"
              className="inline-flex items-center justify-center rounded-xl font-bold border border-white/30 hover:bg-white/15 text-white gap-1.5 text-xs bg-white/10 h-9 px-3.5 transition-colors cursor-pointer select-none"
            >
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <span>Record Expense</span>
            </Link>
            <Link
              href="/settings?tab=backup"
              className="inline-flex items-center justify-center rounded-xl font-bold border border-white/30 hover:bg-white/15 text-white gap-1.5 text-xs bg-white/10 h-9 px-3.5 transition-colors cursor-pointer select-none"
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              <span>Import Excel</span>
            </Link>
          </div>
        </div>

        {/* Large stat panel */}
        <div className="bg-white/10 border border-white/15 p-5 rounded-lg backdrop-blur-md flex items-center gap-4.5 w-full md:w-auto shrink-0 md:min-w-55">
          <div className="p-3 bg-white/15 text-white rounded-md shadow-inner">
            <IndianRupee className="h-6.5 w-6.5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block">Today's Sales</span>
            <span className="text-2xl font-extrabold text-white block">{formatCurrency(todaySales, 0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
