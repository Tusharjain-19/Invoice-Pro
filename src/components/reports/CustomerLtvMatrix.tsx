'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users,
  Repeat,
  HeartHandshake,
  TrendingUp,
  UserCheck,
  UserPlus,
  Crown,
  Sparkles,
  Phone,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import type { CustomerLtvAnalytics } from '@/lib/analyticsHelper';

interface CustomerLtvMatrixProps {
  data: CustomerLtvAnalytics;
  periodLabel: string;
}

export function CustomerLtvMatrix({ data, periodLabel }: CustomerLtvMatrixProps) {
  const cohortChartData = [
    {
      name: 'Repeat Buyers',
      value: data.repeatBuyerRevenue,
      count: data.repeatBuyersCount,
      color: '#10b981', // emerald
    },
    {
      name: 'New Buyers',
      value: data.newBuyerRevenue,
      count: data.newBuyersCount,
      color: '#3b82f6', // blue
    },
  ].filter((d) => d.value > 0 || d.count > 0);

  return (
    <div className="space-y-6">
      {/* 1. Customer Intelligence KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Repeat Customer Rate */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Repeat Customer Rate</span>
              <Repeat className="h-3.5 w-3.5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {data.repeatRatePct.toFixed(1)}%
            </div>
            <p className="text-[11px] text-muted-foreground">
              {data.repeatBuyersCount} returning out of {data.totalUniqueBuyers} buyers
            </p>
          </CardContent>
        </Card>

        {/* Customer Lifetime Value (LTV) */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Avg Customer LTV</span>
              <HeartHandshake className="h-3.5 w-3.5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {formatCurrency(data.avgLtv)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Average total revenue generated per unique client
            </p>
          </CardContent>
        </Card>

        {/* Purchase Frequency */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Purchase Frequency</span>
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {data.avgPurchaseFrequency.toFixed(1)}x
            </div>
            <p className="text-[11px] text-muted-foreground">
              Average orders completed per active customer
            </p>
          </CardContent>
        </Card>

        {/* New Buyer Acquisition */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>New Buyer Growth</span>
              <UserPlus className="h-3.5 w-3.5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {data.newBuyersCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Generated {formatCurrency(data.newBuyerRevenue)} in initial sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Cohort Revenue Distribution & Retention Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Repeat vs New Revenue Contribution */}
        <Card className="lg:col-span-5 border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Users className="h-4.5 w-4.5 text-primary" />
                  Buyer Cohort Revenue Split
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Revenue contribution from Repeat vs. First-time buyers in {periodLabel}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-center">
              {cohortChartData.length > 0 ? (
                <div className="relative w-44 h-44">
                  <ResponsiveContainer width="100%" height={176}>
                    <PieChart>
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Revenue']}
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
                        data={cohortChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={70}
                        paddingAngle={4}
                      >
                        {cohortChartData.map((entry, idx) => (
                          <Cell key={`cohort-cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-foreground">
                      {data.repeatRatePct.toFixed(0)}%
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                      Repeat Ratio
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
                  No buyer transactions yet
                </div>
              )}
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-foreground">Repeat Buyers</span>
                </div>
                <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(data.repeatBuyerRevenue)}
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {data.repeatBuyersCount} repeat shoppers
                </span>
              </div>

              <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-foreground">New Buyers</span>
                </div>
                <div className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(data.newBuyerRevenue)}
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {data.newBuyersCount} new customers
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Loyal Spenders Leaderboard */}
        <Card className="lg:col-span-7 border-border/60 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Crown className="h-4.5 w-4.5 text-amber-500" />
                  Top Loyal Customers (Highest Lifetime Value)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Top clients ranked by total all-time revenue contribution
                </CardDescription>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
                VIP Clients
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-3">
            <div className="divide-y divide-border/40">
              {data.topLoyalCustomers.length > 0 ? (
                data.topLoyalCustomers.map((cust, idx) => (
                  <div
                    key={cust.customerId}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{cust.name}</span>
                          {cust.totalOrders > 2 && (
                            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              Loyal VIP
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          {cust.phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="h-2.5 w-2.5" /> {cust.phone}
                            </span>
                          )}
                          <span>•</span>
                          <span>{cust.totalOrders} {cust.totalOrders === 1 ? 'order' : 'orders'}</span>
                          <span>•</span>
                          <span>AOV: {formatCurrency(cust.avgOrderValue)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono text-foreground block">
                        {formatCurrency(cust.totalSpend)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Last seen {formatDate(cust.lastOrderDate)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No customer records available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
