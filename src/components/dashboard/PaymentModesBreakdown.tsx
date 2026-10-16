'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export interface PaymentModeItem {
  mode: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface PaymentModesData {
  items: PaymentModeItem[];
  totalCollected: number;
  totalPending: number;
  collectionRatePct: number;
}

interface PaymentModesBreakdownProps {
  data: PaymentModesData;
  onRemove?: () => void;
}

const MODE_COLORS: Record<string, string> = {
  Cash: '#10b981', // green
  UPI: '#6366f1', // indigo
  'Bank Transfer': '#3b82f6', // blue
  Cheque: '#f59e0b', // amber
  Credit: '#ef4444', // red
  Other: '#8b5cf6', // purple
};

export function PaymentModesBreakdown({ data, onRemove }: PaymentModesBreakdownProps) {
  const chartData = data.items.map(item => ({
    name: item.mode,
    value: item.amount,
    count: item.count,
    color: MODE_COLORS[item.mode] || '#94a3b8'
  }));

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CreditCard className="h-4.5 w-4.5 text-primary" />
              Payment Modes & Collections
            </CardTitle>
            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
              Cash Flow
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground/80">
            Payment channels distribution and collection recovery efficiency
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
        {/* Collection Efficiency Scorecard */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Recovered</span>
              <span className="text-base font-extrabold text-foreground block mt-0.5">{formatCurrency(data.totalCollected)}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Pending Due</span>
              <span className="text-base font-extrabold text-foreground block mt-0.5">{formatCurrency(data.totalPending)}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Donut Chart & Breakdown Table */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 flex justify-center">
            {chartData.length > 0 ? (
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Amount']}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-extrabold text-foreground">{data.collectionRatePct.toFixed(0)}%</span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Collected</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">No payment records yet</div>
            )}
          </div>

          <div className="md:col-span-7 space-y-2">
            {data.items.slice(0, 4).map((item) => (
              <div key={item.mode} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: MODE_COLORS[item.mode] || '#94a3b8' }}
                  />
                  <span className="font-semibold text-foreground">{item.mode}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">({item.count})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground font-mono">{formatCurrency(item.amount)}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold ml-1.5">({item.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
