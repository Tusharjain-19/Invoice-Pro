'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  Activity,
  BarChart3,
  PieChart,
  TrendingUp,
  Receipt,
  Wallet,
  Sparkles,
  Layers,
  ArrowUpRight,
  CreditCard,
  Scale,
  Calendar,
} from 'lucide-react';
import type { ReportsChartsData } from './types';
import { ReportsLineCharts } from './ReportsLineCharts';
import { ReportsBarCharts } from './ReportsBarCharts';
import { ReportsPieCharts } from './ReportsPieCharts';

interface ReportsVisualAnalyticsProps {
  data: ReportsChartsData;
  periodLabel: string;
  dateWindow: string;
}

export function ReportsVisualAnalytics({
  data,
  periodLabel,
  dateWindow,
}: ReportsVisualAnalyticsProps) {
  const [selectedChartType, setSelectedChartType] = useState<'all' | 'line' | 'bar' | 'pie'>('all');

  const { summary, timeline, topProducts, expenseCategories, periodComparisons, paymentModes, taxDistribution, taxRateSlabs, invoiceStatuses } = data;

  const hasData = summary.totalRevenue > 0 || summary.totalExpenses > 0 || timeline.some(t => t.revenue > 0 || t.expenses > 0);

  return (
    <div className="space-y-6">
      {/* Visual Analytics Header & Category Filters */}
      <Card className="border border-border/70 shadow-xs bg-card/90 backdrop-blur-md">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    Visual Analytics & Chart Suite
                    <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Interactive line charts, bar graphs, and pie charts for {periodLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart Type Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/40 self-start md:self-auto">
              <Button
                size="sm"
                variant={selectedChartType === 'all' ? 'default' : 'ghost'}
                onClick={() => setSelectedChartType('all')}
                className="h-8 rounded-lg text-xs font-bold gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                All Charts ({selectedChartType === 'all' ? '8' : '8'})
              </Button>

              <Button
                size="sm"
                variant={selectedChartType === 'line' ? 'default' : 'ghost'}
                onClick={() => setSelectedChartType('line')}
                className="h-8 rounded-lg text-xs font-bold gap-1.5"
              >
                <Activity className="h-3.5 w-3.5 text-blue-500" />
                Line Charts (2)
              </Button>

              <Button
                size="sm"
                variant={selectedChartType === 'bar' ? 'default' : 'ghost'}
                onClick={() => setSelectedChartType('bar')}
                className="h-8 rounded-lg text-xs font-bold gap-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                Bar Graphs (3)
              </Button>

              <Button
                size="sm"
                variant={selectedChartType === 'pie' ? 'default' : 'ghost'}
                onClick={() => setSelectedChartType('pie')}
                className="h-8 rounded-lg text-xs font-bold gap-1.5"
              >
                <PieChart className="h-3.5 w-3.5 text-amber-500" />
                Pie Charts (3)
              </Button>
            </div>
          </div>

          {/* Quick Stats Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-border/40">
            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Turnover
              </span>
              <span className="text-sm font-black font-mono text-primary dark:text-foreground">
                {formatCurrency(summary.totalRevenue)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Operating Opex
              </span>
              <span className="text-sm font-black font-mono text-destructive">
                {formatCurrency(summary.totalExpenses)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Net Operating Profit
              </span>
              <span className={`text-sm font-black font-mono ${summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {formatCurrency(summary.netProfit)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Net Margin Yield
              </span>
              <span className="text-sm font-black font-mono text-foreground">
                {summary.netMargin.toFixed(1)}%
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Total GST Liability
              </span>
              <span className="text-sm font-black font-mono text-foreground">
                {formatCurrency(summary.totalTax)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Collection Recovery
              </span>
              <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                {summary.collectionRate}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <Card className="border border-border/70 p-12 text-center bg-card/60">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-base font-bold text-foreground">No Transaction Records Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            There are no sales invoices or recorded expenses in {periodLabel}. Change the date filter above or create invoices to view rich charts.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* 1. LINE CHARTS SECTION */}
          {(selectedChartType === 'all' || selectedChartType === 'line') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    1. Trend Trajectory & Cash Velocity (Line Charts)
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-blue-500/20 text-blue-600 dark:text-blue-400">
                  2 Line Charts
                </Badge>
              </div>

              <ReportsLineCharts
                timeline={timeline}
                periodLabel={periodLabel}
                summary={{
                  totalRevenue: summary.totalRevenue,
                  totalExpenses: summary.totalExpenses,
                  netProfit: summary.netProfit,
                  netMargin: summary.netMargin,
                  peakRevenueDay: summary.peakRevenueDay,
                  peakExpenseDay: summary.peakExpenseDay,
                }}
              />
            </div>
          )}

          {/* 2. BAR GRAPHS SECTION */}
          {(selectedChartType === 'all' || selectedChartType === 'bar') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    2. Volume Comparisons & Head Rankings (Bar Graphs)
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  3 Bar Charts
                </Badge>
              </div>

              <ReportsBarCharts
                timeline={timeline}
                topProducts={topProducts}
                expenseCategories={expenseCategories}
                periodComparisons={periodComparisons}
                periodLabel={periodLabel}
              />
            </div>
          )}

          {/* 3. PIE CHARTS SECTION */}
          {(selectedChartType === 'all' || selectedChartType === 'pie') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    3. Proportional Distributions & Channel Share (Pie Charts)
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/20 text-amber-600 dark:text-amber-400">
                  3 Pie & Donut Charts
                </Badge>
              </div>

              <ReportsPieCharts
                expenseCategories={expenseCategories}
                paymentModes={paymentModes}
                taxDistribution={taxDistribution}
                taxRateSlabs={taxRateSlabs}
                invoiceStatuses={invoiceStatuses}
                periodLabel={periodLabel}
                totalExpenses={summary.totalExpenses}
                totalCollected={summary.totalCollected}
                collectionRate={summary.collectionRate}
                totalTax={summary.totalTax}
                totalSales={summary.totalRevenue}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
