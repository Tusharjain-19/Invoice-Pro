'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
  ShieldCheck, AlertTriangle, Layers, Percent, DollarSign, Activity, FileText
} from 'lucide-react';

export interface FinancialGrowthMetric {
  key: string;
  name: string;
  description: string;
  category: 'revenue' | 'cogs' | 'profit' | 'fixed-cost' | 'variable-cost' | 'total-cost' | 'tax';
  current: number;
  previous: number;
  yoy: number;
  isCostOrExpense?: boolean; // if true, decrease is favorable (green), increase is attention (amber/rose)
  benchmarkText: string;
}

interface GrowthMatrixViewProps {
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  previousPeriodType: 'MoM' | 'QoQ' | 'PoP';
  yoyPeriodLabel: string;
  metrics: FinancialGrowthMetric[];
}

// Helper to compute difference and growth percentage
function calcGrowth(current: number, prior: number) {
  const diff = current - prior;
  let pct = 0;
  if (prior !== 0) {
    pct = (diff / Math.abs(prior)) * 100;
  } else if (current !== 0) {
    pct = 100;
  }
  return { diff, pct };
}

// Trend Badge component
function TrendBadge({
  diff,
  pct,
  periodType,
  isCost = false,
}: {
  diff: number;
  pct: number;
  periodType: string;
  isCost?: boolean;
}) {
  const isUp = diff > 0.01;
  const isDown = diff < -0.01;
  const isFlat = !isUp && !isDown;

  if (isFlat) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
        <Minus className="h-3 w-3" /> 0.0%
      </span>
    );
  }

  // If it's a cost/expense: down is green (savings!), up is attention
  const isPositiveSentiment = isCost ? isDown : isUp;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${
          isPositiveSentiment
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
        }`}
      >
        {isUp ? <TrendingUp className="h-3 w-3 stroke-[2.5]" /> : <TrendingDown className="h-3 w-3 stroke-[2.5]" />}
        <span>{isUp ? '+' : ''}{pct.toFixed(1)}%</span>
      </span>
      <span className="text-[10px] text-muted-foreground font-mono">
        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
      </span>
    </div>
  );
}

export function GrowthMatrixView({
  currentPeriodLabel,
  previousPeriodLabel,
  previousPeriodType,
  yoyPeriodLabel,
  metrics,
}: GrowthMatrixViewProps) {
  // Find key anchor metrics for top summary cards
  const salesMetric = metrics.find(m => m.key === 'sales');
  const grossProfitMetric = metrics.find(m => m.key === 'gross_profit');
  const fixedCostMetric = metrics.find(m => m.key === 'fixed_costs');
  const netProfitMetric = metrics.find(m => m.key === 'net_profit');

  const salesMoM = salesMetric ? calcGrowth(salesMetric.current, salesMetric.previous) : { diff: 0, pct: 0 };
  const salesYoY = salesMetric ? calcGrowth(salesMetric.current, salesMetric.yoy) : { diff: 0, pct: 0 };

  const npMoM = netProfitMetric ? calcGrowth(netProfitMetric.current, netProfitMetric.previous) : { diff: 0, pct: 0 };
  const npYoY = netProfitMetric ? calcGrowth(netProfitMetric.current, netProfitMetric.yoy) : { diff: 0, pct: 0 };

  const fcMoM = fixedCostMetric ? calcGrowth(fixedCostMetric.current, fixedCostMetric.previous) : { diff: 0, pct: 0 };
  const fcYoY = fixedCostMetric ? calcGrowth(fixedCostMetric.current, fixedCostMetric.yoy) : { diff: 0, pct: 0 };

  return (
    <div className="space-y-5">
      {/* Top Growth Highlight Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales Expansion Card */}
        <Card className="border border-border/70 shadow-xs bg-linear-to-br from-card to-primary/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Revenue Trajectory
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary border-primary/20">
                Top Line
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-foreground">
                {salesMetric ? formatCurrency(salesMetric.current) : '₹0'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">vs {previousPeriodLabel} ({previousPeriodType})</span>
                <span className={`font-mono font-bold flex items-center gap-1 ${salesMoM.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {salesMoM.diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {salesMoM.diff >= 0 ? '+' : ''}{salesMoM.pct.toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px]">vs Last Year (YoY)</span>
                <span className={`font-mono font-bold flex items-center justify-end gap-1 ${salesYoY.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {salesYoY.diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {salesYoY.diff >= 0 ? '+' : ''}{salesYoY.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fixed Overhead Control Card */}
        <Card className="border border-border/70 shadow-xs bg-linear-to-br from-card to-amber-500/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fixed Cost Discipline
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold text-amber-600 border-amber-500/20">
                Overheads
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-foreground">
                {fixedCostMetric ? formatCurrency(fixedCostMetric.current) : '₹0'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">vs {previousPeriodLabel} ({previousPeriodType})</span>
                <span className={`font-mono font-bold flex items-center gap-1 ${fcMoM.diff <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {fcMoM.diff <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                  {fcMoM.diff > 0 ? '+' : ''}{fcMoM.pct.toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px]">vs Last Year (YoY)</span>
                <span className={`font-mono font-bold flex items-center justify-end gap-1 ${fcYoY.diff <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {fcYoY.diff <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                  {fcYoY.diff > 0 ? '+' : ''}{fcYoY.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Bottom Line Acceleration Card */}
        <Card className="border border-border/70 shadow-xs bg-linear-to-br from-card to-emerald-500/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Net Profit Momentum
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold text-emerald-600 border-emerald-500/20">
                Bottom Line
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-black font-mono ${netProfitMetric && netProfitMetric.current >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {netProfitMetric ? formatCurrency(netProfitMetric.current) : '₹0'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">vs {previousPeriodLabel} ({previousPeriodType})</span>
                <span className={`font-mono font-bold flex items-center gap-1 ${npMoM.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {npMoM.diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {npMoM.diff >= 0 ? '+' : ''}{npMoM.pct.toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px]">vs Last Year (YoY)</span>
                <span className={`font-mono font-bold flex items-center justify-end gap-1 ${npYoY.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {npYoY.diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {npYoY.diff >= 0 ? '+' : ''}{npYoY.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Comparative Matrix Table */}
      <Card className="border border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-5 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
                <Activity className="h-4.5 w-4.5 text-primary" />
                Comprehensive MoM & YoY Growth Matrix
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Side-by-side financial comparison tracking sales, procurement costs, fixed overheads, and retained profitability.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono border-primary/25 bg-primary/5 text-primary">
                Current: {currentPeriodLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 text-left">Financial Metric</th>
                  <th className="py-3 px-4 text-left">Category</th>
                  <th className="py-3 px-4 text-right font-mono font-bold text-foreground">
                    Current Period ({currentPeriodLabel})
                  </th>
                  <th className="py-3 px-4 text-right font-mono">
                    Prior Period ({previousPeriodLabel})
                  </th>
                  <th className="py-3 px-4 text-right">
                    {previousPeriodType} Growth
                  </th>
                  <th className="py-3 px-4 text-right font-mono">
                    Last Year ({yoyPeriodLabel})
                  </th>
                  <th className="py-3 px-4 text-right">
                    YoY Growth
                  </th>
                  <th className="py-3 px-4 text-left">
                    Benchmark & Observation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {metrics.map((row) => {
                  const mom = calcGrowth(row.current, row.previous);
                  const yoy = calcGrowth(row.current, row.yoy);

                  const isMajorRow = ['sales', 'gross_profit', 'net_profit'].includes(row.key);

                  return (
                    <tr
                      key={row.key}
                      className={`hover:bg-muted/20 transition-colors ${
                        isMajorRow ? 'bg-primary/2 font-semibold' : ''
                      }`}
                    >
                      {/* Metric Name */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className={`text-xs ${isMajorRow ? 'font-bold text-foreground' : 'text-foreground/90'}`}>
                            {row.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            {row.description}
                          </span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40 whitespace-nowrap">
                          {row.category.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>

                      {/* Current Period */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs text-foreground">
                        {formatCurrency(row.current)}
                      </td>

                      {/* Previous Period */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(row.previous)}
                      </td>

                      {/* MoM Growth */}
                      <td className="py-3 px-4 text-right">
                        <TrendBadge
                          diff={mom.diff}
                          pct={mom.pct}
                          periodType={previousPeriodType}
                          isCost={row.isCostOrExpense}
                        />
                      </td>

                      {/* Last Year */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(row.yoy)}
                      </td>

                      {/* YoY Growth */}
                      <td className="py-3 px-4 text-right">
                        <TrendBadge
                          diff={yoy.diff}
                          pct={yoy.pct}
                          periodType="YoY"
                          isCost={row.isCostOrExpense}
                        />
                      </td>

                      {/* Benchmark & Observation */}
                      <td className="py-3 px-4 text-left">
                        <span className="text-[11px] text-muted-foreground font-medium block">
                          {row.benchmarkText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
