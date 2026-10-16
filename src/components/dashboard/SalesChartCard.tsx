'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface SalesChartCardProps {
  data: any[];
  period: string;
  onPeriodChange: (period: any) => void;
}

export function SalesChartCard({ data, period, onPeriodChange }: SalesChartCardProps) {
  const [mounted, setMounted] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState({
    revenue: true,
    expenses: false,
    profit: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMetric = (metric: keyof typeof activeMetrics) => {
    setActiveMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/90 backdrop-blur-md border border-border/50 rounded-xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-35">
          <p className="font-bold text-muted-foreground mb-1">{label}</p>
          {payload.map((pld: any) => (
            <div key={pld.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pld.color || pld.stroke }} />
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
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Sales Trend</CardTitle>
            <p className="text-[11px] text-muted-foreground/80 font-medium">Visualizing sales performance indicators</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['today', 'week', 'month', 'year'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 rounded-lg text-xs font-bold capitalize transition-all",
                period === p 
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
              onClick={() => onPeriodChange(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* Toggle Toggles */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleMetric('revenue')}
            className={cn(
              "h-8 rounded-lg text-xs font-bold transition-all border-border/40",
              activeMetrics.revenue 
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-primary mr-1.5" />
            Revenue
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleMetric('expenses')}
            className={cn(
              "h-8 rounded-lg text-xs font-bold transition-all border-border/40",
              activeMetrics.expenses 
                ? "bg-destructive/10 border-destructive/30 text-destructive" 
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-destructive mr-1.5" />
            Expenses
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleMetric('profit')}
            className={cn(
              "h-8 rounded-lg text-xs font-bold transition-all border-border/40",
              activeMetrics.profit 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
            Profit
          </Button>
        </div>

        <div className="h-75 w-full min-w-0 min-h-75 relative">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
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
                
                {activeMetrics.revenue && (
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    name="revenue"
                    stroke="#2563EB" 
                    fill="url(#revenueGrad)" 
                    strokeWidth={2.5} 
                    animationDuration={600}
                  />
                )}
                {activeMetrics.expenses && (
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    name="expenses"
                    stroke="#DC2626" 
                    fill="url(#expenseGrad)" 
                    strokeWidth={2.5} 
                    animationDuration={600}
                  />
                )}
                {activeMetrics.profit && (
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="profit"
                    stroke="#10b981" 
                    fill="url(#profitGrad)" 
                    strokeWidth={2.5} 
                    animationDuration={600}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full min-h-75 flex items-center justify-center bg-muted/5 rounded-xl" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
