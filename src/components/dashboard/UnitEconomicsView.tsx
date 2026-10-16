'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  Calculator, PieChart, Layers, Scale, DollarSign, Percent,
  ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, TrendingUp, Sparkles, Building2
} from 'lucide-react';

export interface UnitEconomicComponent {
  id: string;
  name: string;
  category: 'Revenue' | 'COGS' | 'Fixed Cost' | 'Variable Cost' | 'Tax' | 'Net Profit';
  color: string;
  totalPeriodAmount: number;
  percentageOfRevenue: number;
  benchmarkText: string;
  health: 'optimal' | 'healthy' | 'caution' | 'alert';
  notes: string;
}

interface UnitEconomicsViewProps {
  periodLabel: string;
  totalSales: number;
  cogs: number;
  grossProfit: number;
  fixedCosts: number;
  variableCosts: number;
  totalExpenses: number;
  totalTax: number;
  netProfit: number;
  orderCount: number;
  averageOrderValue: number;
  fixedBreakdown: {
    rent: number;
    salary: number;
    internetAndPhone: number;
    insurance: number;
  };
  variableBreakdown: {
    electricity: number;
    fuel: number;
    officeSupplies: number;
    maintenance: number;
    miscellaneous: number;
  };
}

export function UnitEconomicsView({
  periodLabel,
  totalSales,
  cogs,
  grossProfit,
  fixedCosts,
  variableCosts,
  totalExpenses,
  totalTax,
  netProfit,
  orderCount,
  averageOrderValue,
  fixedBreakdown,
  variableBreakdown,
}: UnitEconomicsViewProps) {
  // Unit Base Selector: default to 100 as requested
  const [unitBase, setUnitBase] = useState<number>(100);
  const [customInput, setCustomInput] = useState<string>('100');

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      setUnitBase(parsed);
    }
  };

  const setPreset = (amount: number) => {
    setUnitBase(amount);
    setCustomInput(amount.toString());
  };

  // Safe percentages of revenue (or industry standard defaults if no sales yet)
  const hasSales = totalSales > 0;
  const safeSales = hasSales ? totalSales : 100000;

  const cogsPct = (cogs / safeSales) * 100;
  const grossMarginPct = ((grossProfit) / safeSales) * 100;

  // Fixed breakdown percentages
  const rentPct = (fixedBreakdown.rent / safeSales) * 100;
  const salaryPct = (fixedBreakdown.salary / safeSales) * 100;
  const techPct = (fixedBreakdown.internetAndPhone / safeSales) * 100;
  const insPct = (fixedBreakdown.insurance / safeSales) * 100;
  const totalFixedPct = (fixedCosts / safeSales) * 100;

  // Variable breakdown percentages
  const elecPct = (variableBreakdown.electricity / safeSales) * 100;
  const fuelPct = (variableBreakdown.fuel / safeSales) * 100;
  const officePct = (variableBreakdown.officeSupplies / safeSales) * 100;
  const maintPct = (variableBreakdown.maintenance / safeSales) * 100;
  const miscPct = (variableBreakdown.miscellaneous / safeSales) * 100;
  const totalVarPct = (variableCosts / safeSales) * 100;

  const taxPct = (totalTax / safeSales) * 100;
  const netMarginPct = (netProfit / safeSales) * 100;

  // Per ₹100 calculation helpers
  const toUnit = (pct: number) => (pct / 100) * unitBase;

  // Breakeven Analysis
  const gmDecimal = grossMarginPct / 100;
  const monthlyBreakevenRevenue = gmDecimal > 0 ? fixedCosts / gmDecimal : 0;
  const breakevenInvoices = averageOrderValue > 0 ? Math.ceil(monthlyBreakevenRevenue / averageOrderValue) : 0;
  const marginOfSafetyPct = totalSales > monthlyBreakevenRevenue && totalSales > 0
    ? ((totalSales - monthlyBreakevenRevenue) / totalSales) * 100
    : 0;

  // Build the decomposition rows
  const decompositionRows = [
    {
      id: 'revenue',
      name: 'Gross Selling Price (Revenue Base)',
      classification: 'Top Line',
      type: 'revenue',
      periodTotal: totalSales,
      pct: 100,
      unitVal: unitBase,
      benchmark: 'Baseline 100%',
      health: 'optimal',
      color: 'bg-slate-900 dark:bg-slate-100',
    },
    {
      id: 'cogs',
      name: 'Product Procurement Cost (COGS)',
      classification: 'Direct COGS',
      type: 'cost',
      periodTotal: cogs,
      pct: cogsPct,
      unitVal: toUnit(cogsPct),
      benchmark: 'Target < 65% of sale',
      health: cogsPct <= 60 ? 'optimal' : cogsPct <= 70 ? 'healthy' : 'caution',
      color: 'bg-blue-500',
    },
    {
      id: 'gross_margin',
      name: 'Gross Contribution Margin (CM1)',
      classification: 'Contribution 1',
      type: 'profit',
      periodTotal: grossProfit,
      pct: grossMarginPct,
      unitVal: toUnit(grossMarginPct),
      benchmark: 'Target > 35% of sale',
      health: grossMarginPct >= 35 ? 'optimal' : grossMarginPct >= 25 ? 'healthy' : 'caution',
      color: 'bg-emerald-500',
    },
    {
      id: 'salary',
      name: 'Employee Salaries & Sales Commission',
      classification: 'Fixed Overhead',
      type: 'cost',
      periodTotal: fixedBreakdown.salary,
      pct: salaryPct,
      unitVal: toUnit(salaryPct),
      benchmark: 'Target < 12% of sale',
      health: salaryPct <= 10 ? 'optimal' : salaryPct <= 15 ? 'healthy' : 'caution',
      color: 'bg-amber-500',
    },
    {
      id: 'rent',
      name: 'Showroom & Warehouse Rent',
      classification: 'Fixed Overhead',
      type: 'cost',
      periodTotal: fixedBreakdown.rent,
      pct: rentPct,
      unitVal: toUnit(rentPct),
      benchmark: 'Target < 8% of sale',
      health: rentPct <= 6 ? 'optimal' : rentPct <= 10 ? 'healthy' : 'caution',
      color: 'bg-orange-500',
    },
    {
      id: 'tech_insurance',
      name: 'IT, Telecom & Commercial Insurance',
      classification: 'Fixed Overhead',
      type: 'cost',
      periodTotal: fixedBreakdown.internetAndPhone + fixedBreakdown.insurance,
      pct: techPct + insPct,
      unitVal: toUnit(techPct + insPct),
      benchmark: 'Target < 3% of sale',
      health: (techPct + insPct) <= 3 ? 'optimal' : 'healthy',
      color: 'bg-indigo-500',
    },
    {
      id: 'utilities',
      name: 'Electricity, Power & Fuel Outflow',
      classification: 'Variable Overhead',
      type: 'cost',
      periodTotal: variableBreakdown.electricity + variableBreakdown.fuel,
      pct: elecPct + fuelPct,
      unitVal: toUnit(elecPct + fuelPct),
      benchmark: 'Target < 4% of sale',
      health: (elecPct + fuelPct) <= 4 ? 'optimal' : 'healthy',
      color: 'bg-purple-500',
    },
    {
      id: 'office_misc',
      name: 'Office Supplies, Maintenance & Misc',
      classification: 'Variable Overhead',
      type: 'cost',
      periodTotal: variableBreakdown.officeSupplies + variableBreakdown.maintenance + variableBreakdown.miscellaneous,
      pct: officePct + maintPct + miscPct,
      unitVal: toUnit(officePct + maintPct + miscPct),
      benchmark: 'Target < 3% of sale',
      health: (officePct + maintPct + miscPct) <= 3 ? 'optimal' : 'healthy',
      color: 'bg-pink-500',
    },
    {
      id: 'taxes',
      name: 'GST Tax Liability (Indirect Tax Outflow)',
      classification: 'Statutory Outflow',
      type: 'tax',
      periodTotal: totalTax,
      pct: taxPct,
      unitVal: toUnit(taxPct),
      benchmark: 'Pass-through GST liability',
      health: 'healthy',
      color: 'bg-slate-500',
    },
    {
      id: 'net_profit',
      name: 'Net Operating Profit Retained (Bottom Line)',
      classification: 'Retained Cash',
      type: 'profit',
      periodTotal: netProfit,
      pct: netMarginPct,
      unitVal: toUnit(netMarginPct),
      benchmark: 'Target > 15% net yield',
      health: netMarginPct >= 18 ? 'optimal' : netMarginPct >= 10 ? 'healthy' : netMarginPct >= 0 ? 'caution' : 'alert',
      color: 'bg-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Unit Selector Bar */}
      <Card className="border border-border/70 shadow-xs bg-linear-to-r from-card via-muted/20 to-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calculator className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">
                  Unit Economics Simulator
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/20 bg-primary/10 text-primary">
                  Per ₹{unitBase.toLocaleString('en-IN')} Scale
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Understand exactly where every single rupee goes when you make a sale. Set custom unit sale values below.
              </p>
            </div>

            {/* Presets and Custom Input */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">Unit Presets:</span>
              <Button
                type="button"
                variant={unitBase === 100 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreset(100)}
                className="h-7.5 px-2.5 text-xs font-mono font-bold rounded-lg shadow-xs"
              >
                ₹100 (Standard)
              </Button>
              <Button
                type="button"
                variant={unitBase === 500 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreset(500)}
                className="h-7.5 px-2.5 text-xs font-mono font-bold rounded-lg shadow-xs"
              >
                ₹500
              </Button>
              <Button
                type="button"
                variant={unitBase === 1000 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreset(1000)}
                className="h-7.5 px-2.5 text-xs font-mono font-bold rounded-lg shadow-xs"
              >
                ₹1,000
              </Button>
              <Button
                type="button"
                variant={unitBase === 10000 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreset(10000)}
                className="h-7.5 px-2.5 text-xs font-mono font-bold rounded-lg shadow-xs"
              >
                ₹10,000
              </Button>
              {averageOrderValue > 0 && (
                <Button
                  type="button"
                  variant={unitBase === Math.round(averageOrderValue) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreset(Math.round(averageOrderValue))}
                  className="h-7.5 px-2.5 text-xs font-mono font-bold rounded-lg shadow-xs"
                >
                  AOV: ₹{Math.round(averageOrderValue)}
                </Button>
              )}

              {/* Custom Input */}
              <div className="flex items-center gap-1 pl-1">
                <span className="text-xs font-bold text-muted-foreground font-mono">₹</span>
                <Input
                  type="number"
                  min="1"
                  value={customInput}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className="w-24 h-7.5 text-xs font-mono font-bold"
                  placeholder="Custom"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The Visual ₹100 Waterfall Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Product Cost Card */}
        <div className="p-3.5 rounded-xl border border-blue-500/25 bg-blue-500/5 dark:bg-blue-500/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
            1. Procurement (COGS)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black font-mono text-blue-900 dark:text-blue-200">
              ₹{toUnit(cogsPct).toFixed(2)}
            </span>
            <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
              {cogsPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-blue-800/70 dark:text-blue-300/70 block">
            Inventory & hardware buying
          </span>
        </div>

        {/* Salaries & Staff Card */}
        <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
            2. Salaries & Payroll
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black font-mono text-amber-900 dark:text-amber-200">
              ₹{toUnit(salaryPct).toFixed(2)}
            </span>
            <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
              {salaryPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-amber-800/70 dark:text-amber-300/70 block">
            Store staff & commissions
          </span>
        </div>

        {/* Rent & Facilities Card */}
        <div className="p-3.5 rounded-xl border border-orange-500/25 bg-orange-500/5 dark:bg-orange-500/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 block">
            3. Rent & Facilities
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black font-mono text-orange-900 dark:text-orange-200">
              ₹{toUnit(rentPct).toFixed(2)}
            </span>
            <span className="text-xs font-bold font-mono text-orange-600 dark:text-orange-400">
              {rentPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-orange-800/70 dark:text-orange-300/70 block">
            Showroom & godown rent
          </span>
        </div>

        {/* Variable Overheads Card */}
        <div className="p-3.5 rounded-xl border border-purple-500/25 bg-purple-500/5 dark:bg-purple-500/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
            4. Power & Opex
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black font-mono text-purple-900 dark:text-purple-200">
              ₹{toUnit(totalVarPct).toFixed(2)}
            </span>
            <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
              {totalVarPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-purple-800/70 dark:text-purple-300/70 block">
            Electricity, fuel, maintenance
          </span>
        </div>

        {/* Net Profit Retained Card */}
        <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
            5. Net Cash Retained
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-xl font-black font-mono ${netMarginPct >= 0 ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-600'}`}>
              ₹{toUnit(netMarginPct).toFixed(2)}
            </span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {netMarginPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-emerald-800/70 dark:text-emerald-300/70 block">
            Pure profit in owner pocket
          </span>
        </div>
      </div>

      {/* Visual Stacked Progress Bar: Where the Rupee Goes */}
      <Card className="border border-border/70 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-foreground flex items-center gap-1.5">
              <PieChart className="h-4 w-4 text-primary" />
              100% Revenue Waterfall Stack
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Scaled to ₹{unitBase.toLocaleString('en-IN')} Base
            </span>
          </div>

          {/* Stacked bar */}
          <div className="h-6 w-full rounded-lg overflow-hidden flex bg-muted shadow-inner border border-border/40">
            {cogsPct > 0 && (
              <div
                style={{ width: `${Math.min(100, cogsPct)}%` }}
                className="bg-blue-500 h-full flex items-center justify-center text-[10px] text-white font-mono font-bold"
                title={`COGS: ₹${toUnit(cogsPct).toFixed(2)} (${cogsPct.toFixed(1)}%)`}
              >
                {cogsPct > 12 && `${cogsPct.toFixed(0)}%`}
              </div>
            )}
            {salaryPct > 0 && (
              <div
                style={{ width: `${Math.min(100, salaryPct)}%` }}
                className="bg-amber-500 h-full flex items-center justify-center text-[10px] text-white font-mono font-bold"
                title={`Salaries: ₹${toUnit(salaryPct).toFixed(2)} (${salaryPct.toFixed(1)}%)`}
              >
                {salaryPct > 8 && `${salaryPct.toFixed(0)}%`}
              </div>
            )}
            {rentPct > 0 && (
              <div
                style={{ width: `${Math.min(100, rentPct)}%` }}
                className="bg-orange-500 h-full flex items-center justify-center text-[10px] text-white font-mono font-bold"
                title={`Rent: ₹${toUnit(rentPct).toFixed(2)} (${rentPct.toFixed(1)}%)`}
              >
                {rentPct > 6 && `${rentPct.toFixed(0)}%`}
              </div>
            )}
            {totalVarPct > 0 && (
              <div
                style={{ width: `${Math.min(100, totalVarPct)}%` }}
                className="bg-purple-500 h-full flex items-center justify-center text-[10px] text-white font-mono font-bold"
                title={`Operating & Fuel: ₹${toUnit(totalVarPct).toFixed(2)} (${totalVarPct.toFixed(1)}%)`}
              >
                {totalVarPct > 6 && `${totalVarPct.toFixed(0)}%`}
              </div>
            )}
            {taxPct > 0 && (
              <div
                style={{ width: `${Math.min(100, taxPct)}%` }}
                className="bg-slate-500 h-full flex items-center justify-center text-[10px] text-white font-mono font-bold"
                title={`GST: ₹${toUnit(taxPct).toFixed(2)} (${taxPct.toFixed(1)}%)`}
              >
                {taxPct > 6 && `${taxPct.toFixed(0)}%`}
              </div>
            )}
            {netMarginPct > 0 && (
              <div
                style={{ width: `${Math.min(100, netMarginPct)}%` }}
                className="bg-emerald-500 h-full flex items-center justify-center text-[10px] text-white font-mono font-bold"
                title={`Net Profit: ₹${toUnit(netMarginPct).toFixed(2)} (${netMarginPct.toFixed(1)}%)`}
              >
                {netMarginPct > 8 && `${netMarginPct.toFixed(0)}%`}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-blue-500 shrink-0" />
              <span>COGS: ₹{toUnit(cogsPct).toFixed(2)} ({cogsPct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-amber-500 shrink-0" />
              <span>Salaries: ₹{toUnit(salaryPct).toFixed(2)} ({salaryPct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-orange-500 shrink-0" />
              <span>Rent: ₹{toUnit(rentPct).toFixed(2)} ({rentPct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-purple-500 shrink-0" />
              <span>Operations: ₹{toUnit(totalVarPct).toFixed(2)} ({totalVarPct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 shrink-0" />
              <span className="font-bold text-foreground">Net Retained: ₹{toUnit(netMarginPct).toFixed(2)} ({netMarginPct.toFixed(1)}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Financial Decomposition Table */}
      <Card className="border border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-5 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
                <Layers className="h-4.5 w-4.5 text-primary" />
                Line-by-Line Spending Breakdown: Percentages & Amounts
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Exact spending allocation across direct procurement, overheads, payroll, and profit yield.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/20 bg-primary/5">
              Scale: ₹{unitBase.toLocaleString('en-IN')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 text-left">Spending Line Item</th>
                  <th className="py-3 px-4 text-left">Cost Classification</th>
                  <th className="py-3 px-4 text-right font-mono font-bold text-foreground">
                    Period Total (₹)
                  </th>
                  <th className="py-3 px-4 text-right">
                    % of Revenue
                  </th>
                  <th className="py-3 px-4 text-right font-mono font-bold text-primary">
                    Per ₹100 Sold (₹)
                  </th>
                  <th className="py-3 px-4 text-right font-mono font-bold text-foreground">
                    Per ₹{unitBase.toLocaleString('en-IN')} Sale (₹)
                  </th>
                  <th className="py-3 px-4 text-left">
                    Target Benchmark
                  </th>
                  <th className="py-3 px-4 text-center">
                    Health Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {decompositionRows.map((row) => {
                  const isRevenue = row.id === 'revenue';
                  const isNetProfit = row.id === 'net_profit';
                  const isGrossMargin = row.id === 'gross_margin';

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isRevenue
                          ? 'bg-muted/30 font-bold'
                          : isNetProfit
                          ? 'bg-emerald-500/5 font-bold'
                          : isGrossMargin
                          ? 'bg-blue-500/5 font-semibold'
                          : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${row.color}`} />
                          <span className={`text-xs ${isRevenue || isNetProfit ? 'font-black text-foreground' : 'text-foreground/90'}`}>
                            {row.name}
                          </span>
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40 whitespace-nowrap">
                          {row.classification}
                        </span>
                      </td>

                      {/* Total Period Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs text-foreground">
                        {formatCurrency(row.periodTotal)}
                      </td>

                      {/* Percentage of Revenue */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs">
                        <span className={isNetProfit ? (row.pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600') : 'text-foreground'}>
                          {row.pct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Per ₹100 Sold */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs text-primary dark:text-primary-fixed-dim">
                        ₹{(row.pct).toFixed(2)}
                      </td>

                      {/* Per Custom Unit */}
                      <td className="py-3 px-4 text-right font-mono font-black text-xs text-foreground">
                        ₹{row.unitVal.toFixed(2)}
                      </td>

                      {/* Benchmark */}
                      <td className="py-3 px-4 text-left text-muted-foreground text-[11px]">
                        {row.benchmark}
                      </td>

                      {/* Health Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            row.health === 'optimal'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                              : row.health === 'healthy'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                              : row.health === 'caution'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                          }`}
                        >
                          {row.health === 'optimal' && <ShieldCheck className="h-3 w-3" />}
                          {row.health === 'healthy' && <CheckCircle2 className="h-3 w-3" />}
                          {row.health === 'caution' && <AlertTriangle className="h-3 w-3" />}
                          {row.health === 'alert' && <AlertTriangle className="h-3 w-3" />}
                          <span className="capitalize">{row.health}</span>
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

      {/* Financial Cockpit: Breakeven Analysis & Operating Leverage */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Monthly Breakeven Revenue */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Breakeven Sales Required</span>
              <Scale className="h-3.5 w-3.5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-xl font-black font-mono text-foreground">
              {formatCurrency(monthlyBreakevenRevenue)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Sales needed just to cover {formatCurrency(fixedCosts)} fixed costs.
            </p>
          </CardContent>
        </Card>

        {/* Breakeven Orders */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Breakeven Orders Needed</span>
              <Building2 className="h-3.5 w-3.5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-xl font-black font-mono text-foreground">
              {breakevenInvoices} Invoices
            </div>
            <p className="text-[10px] text-muted-foreground">
              Based on {formatCurrency(averageOrderValue)} average order value.
            </p>
          </CardContent>
        </Card>

        {/* Margin of Safety */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Margin of Safety</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className={`text-xl font-black font-mono ${marginOfSafetyPct > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
              {marginOfSafetyPct > 0 ? `+${marginOfSafetyPct.toFixed(1)}%` : 'Below BEP'}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {marginOfSafetyPct > 0 ? 'Buffer before operational loss occurs' : 'Sales currently below fixed overheads'}
            </p>
          </CardContent>
        </Card>

        {/* Operating Leverage */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Contribution Margin (CM1)</span>
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-xl font-black font-mono text-foreground">
              {grossMarginPct.toFixed(1)}%
            </div>
            <p className="text-[10px] text-muted-foreground">
              ₹{(grossMarginPct).toFixed(2)} retained per ₹100 to pay bills & profit.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
