'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Package,
  Layers,
  TrendingUp,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import type {
  TimelinePoint,
  TopProductBarItem,
  ExpenseCategorySlice,
  PeriodComparisonBarItem,
} from './types';

interface ReportsBarChartsProps {
  timeline: TimelinePoint[];
  topProducts: TopProductBarItem[];
  expenseCategories: ExpenseCategorySlice[];
  periodComparisons: PeriodComparisonBarItem[];
  periodLabel: string;
  singleCardMode?: 'grouped' | 'products' | 'expenses' | 'comparison' | 'all';
}

export function ReportsBarCharts({
  timeline,
  topProducts,
  expenseCategories,
  periodComparisons,
  periodLabel,
  singleCardMode = 'all',
}: ReportsBarChartsProps) {
  const [mounted, setMounted] = useState(false);
  const [barChartMetric, setBarChartMetric] = useState<'all' | 'revenue-expense' | 'profit-only'>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const CustomGroupedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: TimelinePoint | undefined = payload[0]?.payload;
      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-52">
          <div className="border-b border-border/40 pb-1.5 flex justify-between items-center">
            <span className="font-bold text-foreground">{dataPoint?.fullDate || label}</span>
            {dataPoint && dataPoint.invoiceCount > 0 && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {dataPoint.invoiceCount} invoices
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                  {entry.name}
                </span>
                <span className="font-bold font-mono text-foreground text-[11px]">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
          {dataPoint && (
            <div className="border-t border-border/40 pt-1.5 flex justify-between text-[10px] text-muted-foreground">
              <span>Net Profit Yield:</span>
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

  const CustomProductTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: TopProductBarItem = payload[0].payload;
      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-48">
          <p className="font-bold text-foreground text-sm">{item.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono">HSN/SKU: {item.sku}</p>
          <div className="border-t border-border/40 pt-1.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Units Sold:</span>
              <span className="font-bold font-mono text-foreground">{item.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Revenue:</span>
              <span className="font-bold font-mono text-primary dark:text-foreground">
                {formatCurrency(item.revenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sales Contribution:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {item.percentage}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomExpenseTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: ExpenseCategorySlice = payload[0].payload;
      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl p-3 shadow-xl text-xs space-y-1 min-w-44">
          <p className="font-bold text-foreground">{item.name}</p>
          <div className="flex justify-between text-muted-foreground pt-1">
            <span>Amount:</span>
            <span className="font-bold font-mono text-destructive">{formatCurrency(item.amount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Share of Total:</span>
            <span className="font-bold font-mono text-foreground">{item.percentage}%</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Transactions:</span>
            <span className="font-mono text-foreground">{item.count}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomComparisonTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-56">
          <p className="font-bold text-foreground border-b border-border/40 pb-1">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                  {entry.name}
                </span>
                <span className="font-bold font-mono text-foreground text-[11px]">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={singleCardMode === 'all' ? "space-y-6" : "w-full h-full"}>
      {/* 1. Grouped Revenue vs Expenses vs Net Profit Bar Chart */}
      {(singleCardMode === 'all' || singleCardMode === 'grouped') && (
        <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  Revenue, Outlays & Profit Comparison
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400">
                  Grouped Bar Graph
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Side-by-side volume distribution per timeline interval for {periodLabel}.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/40 self-start md:self-auto">
              <Button
                size="sm"
                variant={barChartMetric === 'all' ? 'default' : 'ghost'}
                onClick={() => setBarChartMetric('all')}
                className="h-7 text-xs font-bold rounded-lg"
              >
                All Metrics
              </Button>
              <Button
                size="sm"
                variant={barChartMetric === 'revenue-expense' ? 'default' : 'ghost'}
                onClick={() => setBarChartMetric('revenue-expense')}
                className="h-7 text-xs font-bold rounded-lg"
              >
                Rev vs Exp
              </Button>
              <Button
                size="sm"
                variant={barChartMetric === 'profit-only' ? 'default' : 'ghost'}
                onClick={() => setBarChartMetric('profit-only')}
                className="h-7 text-xs font-bold rounded-lg"
              >
                Net Profit
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div style={{ height: '300px', minHeight: '300px' }} className="w-full relative">
              {mounted ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
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
                    <RechartsTooltip content={<CustomGroupedTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                      formatter={(val) => <span className="font-semibold text-muted-foreground">{val}</span>}
                    />

                    {(barChartMetric === 'all' || barChartMetric === 'revenue-expense') && (
                      <Bar
                        dataKey="revenue"
                        name="Gross Revenue"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                    )}

                    {(barChartMetric === 'all' || barChartMetric === 'revenue-expense') && (
                      <Bar
                        dataKey="expenses"
                        name="Operating Expenses"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                    )}

                    {(barChartMetric === 'all' || barChartMetric === 'profit-only') && (
                      <Bar
                        dataKey="netProfit"
                        name="Net Retained Profit"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading grouped bar graph...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2-Column Grid: Top Products Bar Chart & Expense Category Bar Chart */}
      <div className={singleCardMode === 'all' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "w-full h-full"}>
        {/* Top Selling Products Bar Chart */}
        {(singleCardMode === 'all' || singleCardMode === 'products') && (
          <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Package className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Top Revenue Products
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Ranked revenue drivers for {periodLabel}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400">
                Bar Chart
              </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {topProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                  No sales items recorded for this period.
                </div>
              ) : (
                <div style={{ height: '300px', minHeight: '300px' }} className="w-full relative">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={topProducts}
                        layout="vertical"
                        margin={{ top: 8, right: 24, left: 20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                        <XAxis
                          type="number"
                          className="text-[11px] fill-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) =>
                            val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          className="text-[11px] fill-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                          width={110}
                          tickFormatter={(val) =>
                            val.length > 14 ? `${val.slice(0, 14)}…` : val
                          }
                        />
                        <RechartsTooltip content={<CustomProductTooltip />} />
                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={20}
                        >
                          {topProducts.map((entry, index) => (
                            <Cell key={`cell-prod-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                      Rendering product rankings...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Operating Expenditure by Category Bar Chart */}
        {(singleCardMode === 'all' || singleCardMode === 'expenses') && (
          <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Expense Head Rankings
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Breakdown by expenditure category
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                Bar Chart
              </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {expenseCategories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                  No operating expenses recorded for this period.
                </div>
              ) : (
                <div style={{ height: '300px', minHeight: '300px' }} className="w-full relative">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={expenseCategories}
                        layout="vertical"
                        margin={{ top: 8, right: 24, left: 20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                        <XAxis
                          type="number"
                          className="text-[11px] fill-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) =>
                            val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          className="text-[11px] fill-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                          width={110}
                          tickFormatter={(val) =>
                            val.length > 14 ? `${val.slice(0, 14)}…` : val
                          }
                        />
                        <RechartsTooltip content={<CustomExpenseTooltip />} />
                        <Bar
                          dataKey="amount"
                          name="Spent Amount"
                          radius={[0, 4, 4, 0]}
                          maxBarSize={20}
                        >
                          {expenseCategories.map((entry, index) => (
                            <Cell key={`cell-exp-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                      Rendering expense distribution bars...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 4. Period Comparison Bar Chart (Current vs Previous vs YoY) */}
      {(singleCardMode === 'all' || singleCardMode === 'comparison') && (
        <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  Period-over-Period Performance Comparison
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                  Comparative Bars
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Current window benchmarked directly against Prior Period and Year-over-Year (YoY).
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div style={{ height: '300px', minHeight: '300px' }} className="w-full relative">
              {mounted ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={periodComparisons}
                    margin={{ top: 12, right: 16, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis
                      dataKey="metric"
                      className="text-[11px] fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      dy={6}
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
                    <RechartsTooltip content={<CustomComparisonTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                      formatter={(val) => <span className="font-semibold text-muted-foreground">{val}</span>}
                    />
                    <Bar
                      dataKey="current"
                      name="Current Period"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="previous"
                      name="Previous Period"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="yoy"
                      name="Prior Year (YoY)"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading comparative performance bars...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
