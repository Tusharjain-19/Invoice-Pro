'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Activity, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export interface CashFlowPoint {
  period: string;
  inflow: number; // Cash received from invoices
  outflow: number; // Expenses paid
  net: number; // Net cash flow
}

interface CashFlowTrendChartProps {
  data: CashFlowPoint[];
  onRemove?: () => void;
}

export function CashFlowTrendChart({ data, onRemove }: CashFlowTrendChartProps) {
  const totalInflow = data.reduce((s, p) => s + p.inflow, 0);
  const totalOutflow = data.reduce((s, p) => s + p.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;
  const isNetPositive = netCashFlow >= 0;

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Activity className="h-4.5 w-4.5 text-primary" />
              Cash Flow Trend (Inflow vs Outflow)
            </CardTitle>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isNetPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}`}>
              Net: {formatCurrency(netCashFlow)}
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground/80">
            Monthly cash receipts versus operating disbursements curve
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

      <CardContent className="pt-4 space-y-4">
        {/* Metric indicators */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-muted-foreground">Inflow:</span>
              <span className="font-bold font-mono text-foreground">{formatCurrency(totalInflow)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="font-semibold text-muted-foreground">Outflow:</span>
              <span className="font-bold font-mono text-foreground">{formatCurrency(totalOutflow)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold">
            {isNetPositive ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> Cash Positive
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" /> Deficit
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0)]}
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  borderRadius: '0.5rem',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#inflowGrad)" name="Cash Inflow" />
              <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#outflowGrad)" name="Cash Outflow" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
