'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RevenueChartProps {
  data: any[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate summary numbers for the last 6 months
  const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalExpenses = data.reduce((sum, item) => sum + (item.expenses || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/90 backdrop-blur-md border border-border/50 rounded-xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-35">
          <p className="font-bold text-muted-foreground mb-1">{label}</p>
          {payload.map((pld: any) => (
            <div key={pld.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pld.fill }} />
                {pld.name.charAt(0).toUpperCase() + pld.name.slice(1)}
              </span>
              <span className="font-bold text-foreground">{formatCurrency(pld.value, 0)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Revenue vs Expenses</CardTitle>
            <p className="text-[11px] text-muted-foreground/80 font-medium">Monthly breakdown over the last 6 months</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* Summary Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6 bg-muted/20 border border-border/40 p-4 rounded-xl">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Revenue</span>
            <span className="text-base sm:text-lg font-extrabold text-foreground">{formatCurrency(totalRevenue, 0)}</span>
          </div>
          <div className="space-y-1 border-x border-border/40 px-4">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Expenses</span>
            <span className="text-base sm:text-lg font-extrabold text-red-500">{formatCurrency(totalExpenses, 0)}</span>
          </div>
          <div className="space-y-1 pl-4">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Profit</span>
            <div className="flex items-center gap-1">
              <span className="text-base sm:text-lg font-extrabold text-emerald-500">{formatCurrency(totalProfit, 0)}</span>
              <span className={`hidden sm:inline-flex text-[9px] font-bold px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`}>
                {profitMargin.toFixed(0)}% margin
              </span>
            </div>
          </div>
        </div>

        <div className="h-62.5 w-full min-w-0 min-h-62.5 relative">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  className="text-xs" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                />
                <YAxis 
                  className="text-xs" 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-muted-foreground capitalize">{value}</span>} />
                <Bar dataKey="revenue" name="revenue" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={12} />
                <Bar dataKey="expenses" name="expenses" fill="#DC2626" radius={[6, 6, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full min-h-62.5 flex items-center justify-center bg-muted/5 rounded-xl" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
