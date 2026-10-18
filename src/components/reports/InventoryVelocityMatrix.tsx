'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  PackageCheck,
  AlertOctagon,
  Zap,
  TrendingDown,
  Layers,
  Sparkles,
  ArrowRight,
  Boxes,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import type { InventoryVelocityAnalytics } from '@/lib/analyticsHelper';

interface InventoryVelocityMatrixProps {
  data: InventoryVelocityAnalytics;
  periodLabel: string;
}

export function InventoryVelocityMatrix({ data, periodLabel }: InventoryVelocityMatrixProps) {
  const chartData = [
    {
      name: 'Fast Moving (High Velocity)',
      value: data.fastCount,
      color: '#10b981', // emerald
    },
    {
      name: 'Moderate (Steady)',
      value: data.moderateCount,
      color: '#3b82f6', // blue
    },
    {
      name: 'Dead Stock (0 Sales)',
      value: data.deadCount,
      color: '#ef4444', // red
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* 1. Trapped Capital & Velocity KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trapped Capital Alert */}
        <Card className="border-rose-500/30 bg-rose-500/5 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
              <span>Trapped Working Capital</span>
              <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(data.trappedCapitalTotal)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Locked in <strong className="text-foreground">{data.deadCount} dead inventory SKUs</strong>
            </p>
          </CardContent>
        </Card>

        {/* Trapped Capital Ratio */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Trapped Capital Ratio</span>
              <Percent className="h-3.5 w-3.5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {data.trappedCapitalPct.toFixed(1)}%
            </div>
            <p className="text-[11px] text-muted-foreground">
              of total stock valuation ({formatCurrency(data.totalInventoryValuation)})
            </p>
          </CardContent>
        </Card>

        {/* Fast Moving Velocity */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Fast Moving SKUs (⚡)</span>
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {data.fastCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              High turn velocity (&ge; 5 units sold in {periodLabel})
            </p>
          </CardContent>
        </Card>

        {/* Total Catalog Breadth */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Catalog SKUs Tracked</span>
              <Boxes className="h-3.5 w-3.5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {data.totalCatalogCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Active inventory items in database
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Stock Velocity Distribution & Dead Stock Liquidation Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Inventory Velocity Breakdown */}
        <Card className="lg:col-span-5 border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <PackageCheck className="h-4.5 w-4.5 text-primary" />
                  Inventory Velocity Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  SKU distribution by turnover velocity in {periodLabel}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-center">
              {chartData.length > 0 ? (
                <div className="relative w-44 h-44">
                  <ResponsiveContainer width="100%" height={176}>
                    <PieChart>
                      <Tooltip
                        formatter={(val: any) => [`${val} SKUs`, 'Count']}
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
                        innerRadius={46}
                        outerRadius={70}
                        paddingAngle={4}
                      >
                        {chartData.map((entry, idx) => (
                          <Cell key={`velocity-cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-foreground">
                      {data.totalCatalogCount}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                      Total SKUs
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
                  No catalog items found
                </div>
              )}
            </div>

            {/* Velocity Category Cards */}
            <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-foreground">Fast Movers (⚡)</span>
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {data.fastCount} SKUs ({data.totalCatalogCount > 0 ? ((data.fastCount / data.totalCatalogCount) * 100).toFixed(0) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-bold text-foreground">Moderate Movers</span>
                </div>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {data.moderateCount} SKUs ({data.totalCatalogCount > 0 ? ((data.moderateCount / data.totalCatalogCount) * 100).toFixed(0) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="font-bold text-foreground">Dead Stock (⚠️)</span>
                </div>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {data.deadCount} SKUs ({data.totalCatalogCount > 0 ? ((data.deadCount / data.totalCatalogCount) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dead Stock & Trapped Capital Table */}
        <Card className="lg:col-span-7 border-border/60 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <AlertOctagon className="h-4.5 w-4.5 text-rose-500" />
                  Dead Stock Liquidation List (0 Sales, Capital Trapped)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Products tying up working capital that haven't sold in {periodLabel}
                </CardDescription>
              </div>
              <span className="text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20">
                Action Required
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-3">
            <div className="divide-y divide-border/40 max-h-72 overflow-y-auto pr-1">
              {data.deadItems.length > 0 ? (
                data.deadItems.slice(0, 8).map((item, idx) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{item.name}</span>
                        <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {item.sku}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>On-hand: <strong className="text-foreground">{item.currentStock} units</strong></span>
                        <span>•</span>
                        <span>Cost: {formatCurrency(item.purchasePrice)}/unit</span>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Recommendation: 15% Clearance Promo
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400 block">
                        {formatCurrency(item.trappedCapital)}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        Trapped Capital
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  🎉 Fantastic! No dead stock detected in this period. Inventory is circulating well.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
