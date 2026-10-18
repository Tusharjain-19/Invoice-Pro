'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { TimelinePoint } from './types';

interface ReportsLineChartsProps {
  timeline: TimelinePoint[];
  periodLabel: string;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    netMargin: number;
    peakRevenueDay?: { label: string; amount: number };
    peakExpenseDay?: { label: string; amount: number };
  };
  singleCardMode?: 'velocity' | 'cumulative' | 'all';
}

export function ReportsLineCharts({
  timeline,
  periodLabel,
  summary,
  singleCardMode = 'all',
}: ReportsLineChartsProps) {
  const [mounted, setMounted] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState({
    revenue: true,
    expenses: true,
    netProfit: true,
    grossProfit: false,
  });
  const [isSmooth, setIsSmooth] = useState(true);
  const [showAreaFill, setShowAreaFill] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMetric = (key: keyof typeof activeMetrics) => {
    setActiveMetrics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Find break-even point in cumulative timeline
  const breakEvenPoint = useMemo(() => {
    for (const pt of timeline) {
      if (pt.cumulativeRevenue > 0 && pt.cumulativeRevenue >= pt.cumulativeExpenses) {
        return pt;
      }
    }
    return null;
  }, [timeline]);

  const CustomVelocityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: TimelinePoint | undefined = payload[0]?.payload;
      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-56">
          <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
            <span className="font-bold text-foreground">{dataPoint?.fullDate || label}</span>
            {dataPoint && dataPoint.invoiceCount > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                {dataPoint.invoiceCount} {dataPoint.invoiceCount === 1 ? 'sale' : 'sales'}
              </Badge>
            )}
          </div>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                  {entry.name}
                </span>
                <span className="font-bold font-mono text-foreground text-[11px]">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
          {dataPoint && dataPoint.revenue > 0 && (
            <div className="border-t border-border/40 pt-1.5 flex justify-between text-[10px] text-muted-foreground">
              <span>Operating Margin:</span>
              <span className={`font-bold font-mono ${dataPoint.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {dataPoint.netMargin.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomCumulativeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: TimelinePoint | undefined = payload[0]?.payload;
      const net = (dataPoint?.cumulativeRevenue || 0) - (dataPoint?.cumulativeExpenses || 0);
      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-56">
          <div className="border-b border-border/40 pb-1.5">
            <span className="font-bold text-foreground">{dataPoint?.fullDate || label}</span>
            <p className="text-[10px] text-muted-foreground">Cumulative Period Trajectory</p>
          </div>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                  {entry.name}
                </span>
                <span className="font-bold font-mono text-foreground text-[11px]">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/40 pt-1.5 flex justify-between text-[11px]">
            <span className="font-semibold text-muted-foreground">Cumulative Surplus:</span>
            <span className={`font-bold font-mono ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              {formatCurrency(net)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. Multi-Metric Financial Velocity Line Chart */}
      {(singleCardMode === 'all' || singleCardMode === 'velocity') && (
        <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Activity className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  Financial Velocity & Trend Curves
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/20 bg-primary/5 text-primary">
                  Line Chart
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Timeline trajectory of sales revenue, operating costs, and net retained earnings for {periodLabel}.
              </CardDescription>
            </div>

            {/* Metric Toggle Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={activeMetrics.revenue ? 'default' : 'outline'}
                onClick={() => toggleMetric('revenue')}
                className={`h-7 px-2.5 text-xs font-bold rounded-lg transition-all ${
                  activeMetrics.revenue
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'text-muted-foreground border-border/60 hover:text-foreground'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-300 mr-1.5 inline-block" />
                Revenue
              </Button>

              <Button
                size="sm"
                variant={activeMetrics.expenses ? 'default' : 'outline'}
                onClick={() => toggleMetric('expenses')}
                className={`h-7 px-2.5 text-xs font-bold rounded-lg transition-all ${
                  activeMetrics.expenses
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                    : 'text-muted-foreground border-border/60 hover:text-foreground'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-300 mr-1.5 inline-block" />
                Expenses
              </Button>

              <Button
                size="sm"
                variant={activeMetrics.netProfit ? 'default' : 'outline'}
                onClick={() => toggleMetric('netProfit')}
                className={`h-7 px-2.5 text-xs font-bold rounded-lg transition-all ${
                  activeMetrics.netProfit
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'text-muted-foreground border-border/60 hover:text-foreground'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-blue-300 mr-1.5 inline-block" />
                Net Profit
              </Button>

              <Button
                size="sm"
                variant={activeMetrics.grossProfit ? 'default' : 'outline'}
                onClick={() => toggleMetric('grossProfit')}
                className={`h-7 px-2.5 text-xs font-bold rounded-lg transition-all ${
                  activeMetrics.grossProfit
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                    : 'text-muted-foreground border-border/60 hover:text-foreground'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-purple-300 mr-1.5 inline-block" />
                Gross Profit
              </Button>

              <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsSmooth((prev) => !prev)}
                className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded-lg"
                title="Toggle smooth curves vs straight segments"
              >
                {isSmooth ? 'Curved' : 'Linear'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Chart Canvas */}
            <div style={{ height: '300px', minHeight: '300px' }} className="w-full relative">
              {mounted ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={timeline}
                    margin={{ top: 12, right: 16, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis
                      dataKey="label"
                      className="text-[11px] fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      dy={6}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      className="text-[11px] fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        val >= 1000000
                          ? `₹${(val / 1000000).toFixed(1)}M`
                          : val >= 1000
                          ? `₹${(val / 1000).toFixed(0)}k`
                          : `₹${val}`
                      }
                    />
                    <RechartsTooltip content={<CustomVelocityTooltip />} />

                    {activeMetrics.revenue && (
                      <Line
                        type={isSmooth ? 'monotone' : 'linear'}
                        dataKey="revenue"
                        name="Gross Revenue"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={true}
                      />
                    )}

                    {activeMetrics.expenses && (
                      <Line
                        type={isSmooth ? 'monotone' : 'linear'}
                        dataKey="expenses"
                        name="Operating Expenses"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        dot={{ r: 2, fill: '#ef4444', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={true}
                      />
                    )}

                    {activeMetrics.netProfit && (
                      <Line
                        type={isSmooth ? 'monotone' : 'linear'}
                        dataKey="netProfit"
                        name="Net Retained Profit"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={true}
                      />
                    )}

                    {activeMetrics.grossProfit && (
                      <Line
                        type={isSmooth ? 'monotone' : 'linear'}
                        dataKey="grossProfit"
                        name="Gross Profit (CM1)"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#8b5cf6', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={true}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  Initializing timeline trend curves...
                </div>
              )}
            </div>

            {/* Velocity Highlights Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/40">
              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Peak Sales Day
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {summary.peakRevenueDay ? summary.peakRevenueDay.label : 'N/A'}
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {summary.peakRevenueDay ? formatCurrency(summary.peakRevenueDay.amount) : '₹0'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Peak Expense Day
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {summary.peakExpenseDay ? summary.peakExpenseDay.label : 'N/A'}
                  </span>
                  <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                    {summary.peakExpenseDay ? formatCurrency(summary.peakExpenseDay.amount) : '₹0'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Daily Sales Run-Rate
                </span>
                <div className="text-xs font-bold font-mono text-primary dark:text-foreground">
                  {formatCurrency(timeline.length > 0 ? summary.totalRevenue / timeline.length : 0)}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">/ day</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Net Period Margin
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold font-mono ${summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {summary.netMargin.toFixed(1)}%
                  </span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">
                    {summary.netProfit >= 0 ? 'Profitable' : 'Deficit'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Cumulative Cash Trajectory & Break-Even Curve */}
      {(singleCardMode === 'all' || singleCardMode === 'cumulative') && (
        <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  Cumulative Revenue vs Expenditure Trajectory
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400">
                  Area & Line
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Progressive cash accumulation and break-even runway across the reporting period.
              </CardDescription>
            </div>

            {breakEvenPoint && (
              <Badge className="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 self-start sm:self-auto">
                <ShieldCheck className="h-3.5 w-3.5" />
                Break-Even: {breakEvenPoint.label}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            <div style={{ height: '300px', minHeight: '300px' }} className="w-full relative">
              {mounted ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={timeline}
                    margin={{ top: 12, right: 16, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCumRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCumExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis
                      dataKey="label"
                      className="text-[11px] fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      dy={6}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      className="text-[11px] fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        val >= 1000000
                          ? `₹${(val / 1000000).toFixed(1)}M`
                          : val >= 1000
                          ? `₹${(val / 1000).toFixed(0)}k`
                          : `₹${val}`
                      }
                    />
                    <RechartsTooltip content={<CustomCumulativeTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                      formatter={(val) => <span className="font-semibold text-muted-foreground">{val}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeRevenue"
                      name="Cumulative Sales Revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorCumRev)"
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeExpenses"
                      name="Cumulative Operating Outlays"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      fillOpacity={1}
                      fill="url(#colorCumExp)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading cumulative trajectory curves...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
