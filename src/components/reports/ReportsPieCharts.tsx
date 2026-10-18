'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  PieChart as RPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  PieChart,
  CreditCard,
  Receipt,
  CheckCircle2,
  Scale,
  Sparkles,
  Wallet,
  Clock,
} from 'lucide-react';
import type {
  ExpenseCategorySlice,
  PaymentModeSlice,
  TaxSlice,
  TaxRateSlabItem,
  InvoiceStatusSlice,
} from './types';

interface ReportsPieChartsProps {
  expenseCategories: ExpenseCategorySlice[];
  paymentModes: PaymentModeSlice[];
  taxDistribution: TaxSlice[];
  taxRateSlabs: TaxRateSlabItem[];
  invoiceStatuses: InvoiceStatusSlice[];
  periodLabel: string;
  totalExpenses: number;
  totalCollected: number;
  collectionRate: number;
  totalTax: number;
  totalSales: number;
  singleCardMode?: 'expenses' | 'payments' | 'taxes' | 'statuses' | 'all';
}

export function ReportsPieCharts({
  expenseCategories,
  paymentModes,
  taxDistribution,
  taxRateSlabs,
  invoiceStatuses,
  periodLabel,
  totalExpenses,
  totalCollected,
  collectionRate,
  totalTax,
  totalSales,
  singleCardMode = 'all',
}: ReportsPieChartsProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredExpenseIndex, setHoveredExpenseIndex] = useState<number | null>(null);
  const [hoveredPaymentIndex, setHoveredPaymentIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-xl p-3 shadow-xl text-xs space-y-1 min-w-40">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}</span>
          </div>
          <div className="flex justify-between text-muted-foreground pt-1">
            <span>Value:</span>
            <span className="font-bold font-mono text-foreground">
              {formatCurrency(item.amount || item.value || 0)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Share:</span>
            <span className="font-bold font-mono text-primary dark:text-foreground">
              {item.percentage}%
            </span>
          </div>
          {item.count !== undefined && (
            <div className="flex justify-between text-muted-foreground">
              <span>Count:</span>
              <span className="font-mono text-foreground">{item.count}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={singleCardMode === 'all' ? "space-y-6" : "w-full h-full"}>
      {/* Container: 2-Column Grid when all, or full width single card */}
      <div className={singleCardMode === 'all' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "w-full h-full"}>
        {/* 1. Operating Expense Distribution Donut Chart */}
        {(singleCardMode === 'all' || singleCardMode === 'expenses') && (
          <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Expense Head Distribution
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Proportional operating outlays for {periodLabel}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                Donut Chart
              </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {expenseCategories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                  No expenses recorded for this period.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Pie Chart Canvas */}
                  <div className="w-52 h-52 shrink-0 relative flex items-center justify-center">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <RPieChart>
                          <RechartsTooltip content={<CustomPieTooltip />} />
                          <Pie
                            data={expenseCategories}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="amount"
                            onMouseEnter={(_, index) => setHoveredExpenseIndex(index)}
                            onMouseLeave={() => setHoveredExpenseIndex(null)}
                          >
                            {expenseCategories.map((entry, index) => (
                              <Cell
                                key={`cell-exp-${index}`}
                                fill={entry.color}
                                stroke={hoveredExpenseIndex === index ? '#ffffff' : 'transparent'}
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                        </RPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-muted-foreground">Loading chart...</div>
                    )}

                    {/* Center Total Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Total Opex
                      </span>
                      <span className="text-sm font-black font-mono text-foreground mt-0.5">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </div>
                  </div>

                  {/* Legend Breakdown */}
                  <div className="w-full space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {expenseCategories.map((cat, idx) => (
                      <div
                        key={cat.name}
                        className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors ${
                          hoveredExpenseIndex === idx ? 'bg-muted/80' : 'hover:bg-muted/40'
                        }`}
                        onMouseEnter={() => setHoveredExpenseIndex(idx)}
                        onMouseLeave={() => setHoveredExpenseIndex(null)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="font-medium text-foreground truncate">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-muted-foreground text-[11px]">{cat.percentage}%</span>
                          <span className="font-bold font-mono text-foreground">{formatCurrency(cat.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 2. Payment Modes & Cash Flow Channels Donut Chart */}
        {(singleCardMode === 'all' || singleCardMode === 'payments') && (
          <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Payment Collections by Channel
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Cash, UPI, Bank Transfer, & Credit share
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                Pie Chart
              </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {paymentModes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                  No payment collections recorded for this period.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Donut Canvas */}
                  <div className="w-52 h-52 shrink-0 relative flex items-center justify-center">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <RPieChart>
                          <RechartsTooltip content={<CustomPieTooltip />} />
                          <Pie
                            data={paymentModes}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="amount"
                            onMouseEnter={(_, index) => setHoveredPaymentIndex(index)}
                            onMouseLeave={() => setHoveredPaymentIndex(null)}
                          >
                            {paymentModes.map((entry, index) => (
                              <Cell
                                key={`cell-pay-${index}`}
                                fill={entry.color}
                                stroke={hoveredPaymentIndex === index ? '#ffffff' : 'transparent'}
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                        </RPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-muted-foreground">Loading chart...</div>
                    )}

                    {/* Center Collection Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Recovery Rate
                      </span>
                      <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {collectionRate}%
                      </span>
                    </div>
                  </div>

                  {/* Legend Breakdown */}
                  <div className="w-full space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {paymentModes.map((mode, idx) => (
                      <div
                        key={mode.name}
                        className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors ${
                          hoveredPaymentIndex === idx ? 'bg-muted/80' : 'hover:bg-muted/40'
                        }`}
                        onMouseEnter={() => setHoveredPaymentIndex(idx)}
                        onMouseLeave={() => setHoveredPaymentIndex(null)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mode.color }} />
                          <span className="font-medium text-foreground truncate">{mode.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({mode.count})</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-muted-foreground text-[11px]">{mode.percentage}%</span>
                          <span className="font-bold font-mono text-foreground">{formatCurrency(mode.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. GST Tax Composition & Rate Slabs Pie Chart */}
        {(singleCardMode === 'all' || singleCardMode === 'taxes') && (
          <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                    <Scale className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Statutory Tax Composition
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Central (CGST), State (SGST) & Integrated (IGST) split
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400">
                Pie Chart
              </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {totalTax === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                  No tax liability recorded for this period.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Donut Canvas */}
                  <div className="w-52 h-52 shrink-0 relative flex items-center justify-center">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <RPieChart>
                          <RechartsTooltip content={<CustomPieTooltip />} />
                          <Pie
                            data={taxDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="amount"
                          >
                            {taxDistribution.map((entry, index) => (
                              <Cell key={`cell-tax-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </RPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-muted-foreground">Loading chart...</div>
                    )}

                    {/* Center Tax Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Total GST
                      </span>
                      <span className="text-sm font-black font-mono text-primary dark:text-foreground mt-0.5">
                        {formatCurrency(totalTax)}
                      </span>
                    </div>
                  </div>

                  {/* Slices & Slabs breakdown */}
                  <div className="w-full space-y-2">
                    <div className="space-y-1.5 pb-2 border-b border-border/40">
                      {taxDistribution.map((t) => (
                        <div key={t.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                            <span className="font-semibold text-foreground">{t.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-muted-foreground text-[11px]">{t.percentage}%</span>
                            <span className="font-bold font-mono text-foreground">{formatCurrency(t.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Slabs tags */}
                    <div className="pt-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Active GST Slabs
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {taxRateSlabs.map((slab) => (
                          <Badge
                            key={slab.rate}
                            variant="outline"
                            className="text-[10px] font-mono h-5 px-1.5 border-border/60 flex items-center gap-1"
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: slab.color }} />
                            <span>{slab.rate} Rate</span>
                            <span className="text-muted-foreground font-normal">({formatCurrency(slab.tax)})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. Invoice Realization Status Pie Chart */}
        {(singleCardMode === 'all' || singleCardMode === 'statuses') && (
          <Card className="border border-border/70 shadow-xs bg-card/80 backdrop-blur-md overflow-hidden h-full flex flex-col justify-between">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Invoice Status Realization
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Paid, Partial, Unpaid, and Overdue distribution
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400">
                Donut Chart
              </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {invoiceStatuses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                  No invoices recorded for this period.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Donut Canvas */}
                  <div className="w-52 h-52 shrink-0 relative flex items-center justify-center">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <RPieChart>
                          <RechartsTooltip content={<CustomPieTooltip />} />
                          <Pie
                            data={invoiceStatuses}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="amount"
                          >
                            {invoiceStatuses.map((entry, index) => (
                              <Cell key={`cell-status-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </RPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-muted-foreground">Loading chart...</div>
                    )}

                    {/* Center Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Total Volume
                      </span>
                      <span className="text-sm font-black font-mono text-foreground mt-0.5">
                        {formatCurrency(totalSales)}
                      </span>
                    </div>
                  </div>

                  {/* Legend Breakdown */}
                  <div className="w-full space-y-1.5">
                    {invoiceStatuses.map((st) => (
                      <div key={st.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                          <span className="font-semibold text-foreground">{st.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({st.count})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-muted-foreground text-[11px]">{st.percentage}%</span>
                          <span className="font-bold font-mono text-foreground">{formatCurrency(st.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
