'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  Clock,
  CalendarDays,
  TrendingUp,
  Sparkles,
  Smartphone,
  Banknote,
  Landmark,
  Wallet,
  ShieldAlert,
  Flame,
  Award,
  IndianRupee,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { PaymentAnalytics, SalesTimingAnalytics } from '@/lib/analyticsHelper';
import { PAYMENT_MODE_COLORS } from '@/lib/analyticsHelper';
import type { TimelinePoint } from './types';

interface SalesContextChartsProps {
  timeline: TimelinePoint[];
  paymentAnalytics: PaymentAnalytics;
  timingAnalytics: SalesTimingAnalytics;
  periodLabel: string;
}

const getPaymentIcon = (mode: string) => {
  switch (mode) {
    case 'UPI':
      return <Smartphone className="h-3.5 w-3.5 text-indigo-500" />;
    case 'Card':
      return <CreditCard className="h-3.5 w-3.5 text-cyan-500" />;
    case 'Cash':
      return <Banknote className="h-3.5 w-3.5 text-emerald-500" />;
    case 'Bank Transfer':
      return <Landmark className="h-3.5 w-3.5 text-blue-500" />;
    case 'EMI':
      return <Wallet className="h-3.5 w-3.5 text-purple-500" />;
    case 'Credit':
      return <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />;
    default:
      return <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export function SalesContextCharts({
  timeline,
  paymentAnalytics,
  timingAnalytics,
  periodLabel,
}: SalesContextChartsProps) {
  // Chart data for Payment Modes
  const paymentChartData = paymentAnalytics.items.map((item) => ({
    name: item.mode,
    value: item.amount,
    count: item.count,
    color: PAYMENT_MODE_COLORS[item.mode] || '#94a3b8',
  }));

  const getChannelAmount = (mode: string) => {
    const found = paymentAnalytics.items.find((i) => i.mode.toLowerCase() === mode.toLowerCase());
    return found ? { amount: found.amount, count: found.count, pct: found.percentage } : { amount: 0, count: 0, pct: 0 };
  };

  const upiChannel = getChannelAmount('UPI');
  const cardChannel = getChannelAmount('Card');
  const cashChannel = getChannelAmount('Cash');
  const bankChannel = getChannelAmount('Bank Transfer');
  const emiChannel = getChannelAmount('EMI');

  const totalBillsCount = paymentAnalytics.items.reduce((s, it) => s + (it.count || 0), 0);
  const avgTicket = totalBillsCount > 0 ? paymentAnalytics.totalCollected / totalBillsCount : 0;

  const getDynamicAmountClass = (val: number | string) => {
    const str = typeof val === 'number' ? formatCurrency(val) : String(val);
    if (str.length > 14) return 'text-xs sm:text-sm';
    if (str.length > 10) return 'text-sm sm:text-base';
    return 'text-base sm:text-lg';
  };

  return (
    <div className="space-y-6">
      {/* Symmetrical 2-Liner Payment Collection Matrix (4 + 4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Row 1, Card 1: All Modes Total Hero */}
        <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-3 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-primary text-[11px] font-bold">
            <span className="flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5" /> All Modes Total</span>
            <span className="text-[10px] font-mono bg-primary/20 px-1.5 py-0.2 rounded font-black">{paymentAnalytics.collectionRatePct.toFixed(0)}%</span>
          </div>
          <div className="mt-1.5">
            <div className={`font-black font-mono text-primary dark:text-foreground tracking-tight truncate ${getDynamicAmountClass(paymentAnalytics.totalCollected)}`} title={formatCurrency(paymentAnalytics.totalCollected)}>
              {formatCurrency(paymentAnalytics.totalCollected)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Total collections received</div>
          </div>
        </div>

        {/* Row 1, Card 2: UPI */}
        <div className="bg-card/70 border border-indigo-500/20 rounded-xl p-3 shadow-xs hover:border-indigo-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
            <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-indigo-500" /> UPI</span>
            <span className="text-[10px] font-mono text-indigo-500 font-bold">{upiChannel.count} bills</span>
          </div>
          <div className="mt-1.5">
            <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(upiChannel.amount)}`} title={formatCurrency(upiChannel.amount)}>
              {formatCurrency(upiChannel.amount)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{upiChannel.pct.toFixed(0)}% of collections</div>
          </div>
        </div>

        {/* Row 1, Card 3: Card / POS */}
        <div className="bg-card/70 border border-cyan-500/20 rounded-xl p-3 shadow-xs hover:border-cyan-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
            <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-cyan-500" /> Card / POS</span>
            <span className="text-[10px] font-mono text-cyan-500 font-bold">{cardChannel.count} bills</span>
          </div>
          <div className="mt-1.5">
            <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(cardChannel.amount)}`} title={formatCurrency(cardChannel.amount)}>
              {formatCurrency(cardChannel.amount)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{cardChannel.pct.toFixed(0)}% of collections</div>
          </div>
        </div>

        {/* Row 1, Card 4: Cash */}
        <div className="bg-card/70 border border-emerald-500/20 rounded-xl p-3 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
            <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-500" /> Cash</span>
            <span className="text-[10px] font-mono text-emerald-500 font-bold">{cashChannel.count} bills</span>
          </div>
          <div className="mt-1.5">
            <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(cashChannel.amount)}`} title={formatCurrency(cashChannel.amount)}>
              {formatCurrency(cashChannel.amount)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{cashChannel.pct.toFixed(0)}% of collections</div>
          </div>
        </div>

        {/* Row 2, Card 5: Net Banking */}
        <div className="bg-card/70 border border-blue-500/20 rounded-xl p-3 shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
            <span className="flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5 text-blue-500" /> Net Banking</span>
            <span className="text-[10px] font-mono text-blue-500 font-bold">{bankChannel.count} bills</span>
          </div>
          <div className="mt-1.5">
            <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(bankChannel.amount)}`} title={formatCurrency(bankChannel.amount)}>
              {formatCurrency(bankChannel.amount)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{bankChannel.pct.toFixed(0)}% of collections</div>
          </div>
        </div>

        {/* Row 2, Card 6: EMI Loans */}
        <div className="bg-card/70 border border-purple-500/20 rounded-xl p-3 shadow-xs hover:border-purple-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
            <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-purple-500" /> EMI Loans</span>
            <span className="text-[10px] font-mono text-purple-500 font-bold">{emiChannel.count} bills</span>
          </div>
          <div className="mt-1.5">
            <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(emiChannel.amount)}`} title={formatCurrency(emiChannel.amount)}>
              {formatCurrency(emiChannel.amount)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{emiChannel.pct.toFixed(0)}% of collections</div>
          </div>
        </div>

        {/* Row 2, Card 7: Credit Dues */}
        <div className="bg-card/70 border border-rose-500/20 rounded-xl p-3 shadow-xs hover:border-rose-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
            <span className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> Credit Dues</span>
            <span className={`text-[10px] font-mono font-bold ${paymentAnalytics.totalPending > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {paymentAnalytics.totalPending > 0 ? 'Pending' : 'Settled'}
            </span>
          </div>
          <div className="mt-1.5">
            <div className={`font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight truncate ${getDynamicAmountClass(paymentAnalytics.totalPending)}`} title={formatCurrency(paymentAnalytics.totalPending)}>
              {formatCurrency(paymentAnalytics.totalPending)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Outstanding balance</div>
          </div>
        </div>

        {/* Row 2, Card 8: Average Ticket Size */}
        <div className="bg-card/70 border border-amber-500/20 rounded-xl p-3 shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-semibold">
            <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-amber-500" /> Avg Ticket Size</span>
            <span className="text-[10px] font-mono text-amber-500 font-bold">{totalBillsCount} paid</span>
          </div>
          <div className="mt-1.5">
            <div className={`font-black font-mono text-foreground tracking-tight truncate ${getDynamicAmountClass(avgTicket)}`} title={formatCurrency(avgTicket)}>
              {formatCurrency(avgTicket)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Average ticket per bill</div>
          </div>
        </div>
      </div>

      {/* 1. Daily Sales Velocity & Payment Channels Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Velocity Timeline Area Chart */}
        <Card className="lg:col-span-7 border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4.5 w-4.5 text-primary" />
                  Sales Velocity & Revenue Curve
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Daily transaction turnover across {periodLabel}
                </CardDescription>
              </div>
              <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                Daily Timeline
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {timeline.length > 0 ? (
              <div className="w-full" style={{ height: '260px', minHeight: '260px' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesVelocityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                      dy={6}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      width={44}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Daily Sales']}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#salesVelocityGrad)"
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                No invoices in this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Channels (UPI / Card / Cash) Donut Chart */}
        <Card className="lg:col-span-5 border-border/60 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <CreditCard className="h-4.5 w-4.5 text-primary" />
                  Payment Channels & All Modes Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Exact distribution of collections by payment method
                </CardDescription>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {paymentAnalytics.collectionRatePct.toFixed(0)}% Received
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Donut */}
              <div className="sm:col-span-5 flex justify-center">
                {paymentChartData.length > 0 && paymentAnalytics.totalCollected > 0 ? (
                  <div className="relative w-36 h-36">
                    <ResponsiveContainer width="100%" height={144}>
                      <PieChart>
                        <Tooltip
                          formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Received']}
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
                          data={paymentChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={58}
                          paddingAngle={3}
                        >
                          {paymentChartData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-black text-foreground">
                        {formatCurrency(paymentAnalytics.totalCollected).split('.')[0]}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                        All Modes Total
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-xs text-muted-foreground">
                    No payment data
                  </div>
                )}
              </div>

              {/* Channel List */}
              <div className="sm:col-span-7 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {paymentAnalytics.items.map((item) => (
                  <div
                    key={item.mode}
                    className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/30 transition-colors border border-border/30"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: PAYMENT_MODE_COLORS[item.mode] || '#94a3b8' }}
                      />
                      {getPaymentIcon(item.mode)}
                      <span className="font-semibold text-foreground text-[11px]">{item.mode}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground font-mono text-[11px]">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-semibold ml-1">
                        ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick summary strip */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40 text-muted-foreground">
              <span>Total Invoiced: <strong className="text-foreground">{formatCurrency(paymentAnalytics.totalTurnover)}</strong></span>
              {paymentAnalytics.totalPending > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Due: {formatCurrency(paymentAnalytics.totalPending)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Peak Sales Time & Best Selling Day-of-Week Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Shopping Hours Bar Chart */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Clock className="h-4.5 w-4.5 text-amber-500" />
                  Peak Sales Time Heatmap (Shopping Hours)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Transaction volume & revenue distribution throughout the business day
                </CardDescription>
              </div>
              {timingAnalytics.peakHour && (
                <div className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <Flame className="h-3 w-3" />
                  Peak: {timingAnalytics.peakHour.label} ({formatCurrency(timingAnalytics.peakHour.revenue)})
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="w-full" style={{ height: '240px', minHeight: '240px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={timingAnalytics.hourlyDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    dy={4}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    width={44}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Hourly Revenue']}
                    labelFormatter={(label) => `Time Window: ${label}`}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {timingAnalytics.hourlyDistribution.map((entry, idx) => (
                      <Cell
                        key={`hour-cell-${idx}`}
                        fill={entry.isPeak ? '#f59e0b' : '#3b82f6'}
                        opacity={entry.isPeak ? 1 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              💡 Tip: Schedule additional billing staff and restock fast-selling displays prior to {timingAnalytics.peakHour?.label || 'peak shopping hours'}.
            </p>
          </CardContent>
        </Card>

        {/* Day-of-Week Sales Performance Bar Chart */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-4.5 w-4.5 text-indigo-500" />
                  Day-of-Week Sales Matrix (Best Selling Days)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Weekly sales cadence comparing weekday vs. weekend velocity
                </CardDescription>
              </div>
              {timingAnalytics.bestDay && (
                <div className="flex items-center gap-1 text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">
                  <Award className="h-3 w-3" />
                  Top Day: {timingAnalytics.bestDay.dayName}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="w-full" style={{ height: '240px', minHeight: '240px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={timingAnalytics.dayOfWeekDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="dayName"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickFormatter={(val) => val.slice(0, 3)}
                    dy={4}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    width={44}
                  />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${formatCurrency(Number(val) || 0)} (${item.payload.orderCount} bills)`,
                      'Total Revenue',
                    ]}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {timingAnalytics.dayOfWeekDistribution.map((entry, idx) => (
                      <Cell
                        key={`day-cell-${idx}`}
                        fill={entry.isBestDay ? '#6366f1' : '#10b981'}
                        opacity={entry.isBestDay ? 1 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 px-1">
              <span>Weekend Sales Share: <strong className="text-foreground">{timingAnalytics.weekendSalesShare.toFixed(1)}%</strong></span>
              <span>Best Day Avg Bill: <strong className="text-foreground">{formatCurrency(timingAnalytics.bestDay?.avgOrderValue || 0)}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
