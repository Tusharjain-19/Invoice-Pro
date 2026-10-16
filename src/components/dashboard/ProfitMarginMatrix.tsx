'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Percent, ShoppingBag, PieChart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProfitMarginData {
  grossRevenue: number;
  cogs: number; // Cost of goods sold
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  averageOrderValue: number;
  totalOrders: number;
  discountsGiven: number;
}

interface ProfitMarginMatrixProps {
  data: ProfitMarginData;
  onRemove?: () => void;
}

export function ProfitMarginMatrix({ data, onRemove }: ProfitMarginMatrixProps) {
  const isNetProfitPositive = data.netProfit >= 0;
  const isGrossProfitPositive = data.grossProfit >= 0;

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <PieChart className="h-4.5 w-4.5 text-primary" />
              Profitability & Margin Matrix
            </CardTitle>
            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
              Financial Scorecard
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground/80">
            Real-time margin analysis, cost of goods, and net earnings health
          </CardDescription>
        </div>
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
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Top 3 Primary Margin Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Gross Profit */}
          <div className="p-3.5 rounded-xl border border-border/50 bg-muted/15 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Gross Profit</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${isGrossProfitPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                {data.grossMarginPct.toFixed(1)}% margin
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-extrabold text-foreground tracking-tight">{formatCurrency(data.grossProfit)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Revenue minus inventory cost</p>
            </div>
          </div>

          {/* Net Profit */}
          <div className={`p-3.5 rounded-xl border ${isNetProfitPositive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'} flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Net Profit</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isNetProfitPositive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'}`}>
                {isNetProfitPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {data.netMarginPct.toFixed(1)}% net
              </span>
            </div>
            <div className="mt-2">
              <p className={`text-xl font-extrabold tracking-tight ${isNetProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(data.netProfit)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Bottom line after all expenses</p>
            </div>
          </div>

          {/* Average Order Value (AOV) */}
          <div className="p-3.5 rounded-xl border border-border/50 bg-muted/15 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Avg Order Value</span>
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {data.totalOrders} bills
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-extrabold text-foreground tracking-tight">{formatCurrency(data.averageOrderValue)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Average ticket size per checkout</p>
            </div>
          </div>
        </div>

        {/* Detailed Financial Matrix Ledger */}
        <div className="rounded-xl border border-border/40 overflow-hidden bg-card">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/40 text-center">
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gross Sales</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(data.grossRevenue)}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost of Goods (COGS)</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-0.5">{formatCurrency(data.cogs)}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operating Expenses</p>
              <p className="text-sm font-bold text-rose-500 mt-0.5">{formatCurrency(data.operatingExpenses)}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Discounts</p>
              <p className="text-sm font-bold text-amber-500 mt-0.5">{formatCurrency(data.discountsGiven)}</p>
            </div>
          </div>
        </div>

        {/* Revenue Flow Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Revenue Breakdown Flow</span>
            <span>100% Total Sales</span>
          </div>
          <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${Math.min(100, Math.max(0, data.grossRevenue > 0 ? (data.cogs / data.grossRevenue) * 100 : 0))}%` }}
              className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
              title={`COGS: ${data.grossRevenue > 0 ? ((data.cogs / data.grossRevenue) * 100).toFixed(1) : 0}%`}
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, data.grossRevenue > 0 ? (data.operatingExpenses / data.grossRevenue) * 100 : 0))}%` }}
              className="bg-rose-500/80 h-full transition-all"
              title={`Expenses: ${data.grossRevenue > 0 ? ((data.operatingExpenses / data.grossRevenue) * 100).toFixed(1) : 0}%`}
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, data.grossRevenue > 0 ? (Math.max(0, data.netProfit) / data.grossRevenue) * 100 : 0))}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`Net Profit: ${data.grossRevenue > 0 ? ((Math.max(0, data.netProfit) / data.grossRevenue) * 100).toFixed(1) : 0}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
              <span>COGS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500/80" />
              <span>OpEx</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Net Profit</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
