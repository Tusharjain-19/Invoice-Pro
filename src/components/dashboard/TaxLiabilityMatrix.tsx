'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Landmark, FileSpreadsheet, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export interface TaxLiabilityData {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  taxByRate: {
    rate: string;
    taxable: number;
    tax: number;
  }[];
}

interface TaxLiabilityMatrixProps {
  data: TaxLiabilityData;
  onRemove?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export function TaxLiabilityMatrix({ data, onRemove }: TaxLiabilityMatrixProps) {
  const chartData = [
    { name: 'CGST (Central)', amount: data.cgst, fill: '#3b82f6' },
    { name: 'SGST (State)', amount: data.sgst, fill: '#10b981' },
    { name: 'IGST (Inter-state)', amount: data.igst, fill: '#8b5cf6' },
  ];

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Landmark className="h-4.5 w-4.5 text-primary" />
              GST Tax Liability Matrix
            </CardTitle>
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Tax Compliant
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground/80">
            Output tax breakdown, CGST/SGST/IGST liability and taxable turnover
          </CardDescription>
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
            title="Remove widget from dashboard"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-border/40 bg-muted/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Taxable Turnover</span>
            <span className="text-base font-extrabold text-foreground block mt-1">{formatCurrency(data.taxableAmount)}</span>
          </div>
          <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">CGST Collected</span>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 block mt-1">{formatCurrency(data.cgst)}</span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">SGST Collected</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">{formatCurrency(data.sgst)}</span>
          </div>
          <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">IGST Collected</span>
            <span className="text-base font-extrabold text-purple-600 dark:text-purple-400 block mt-1">{formatCurrency(data.igst)}</span>
          </div>
        </div>

        {/* Total Net GST Liability Callout */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Total Output GST Due to Govt</p>
              <p className="text-[10px] text-muted-foreground">Cumulative tax collected on sales across all rate tiers</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold text-primary">{formatCurrency(data.totalTax)}</span>
          </div>
        </div>

        {/* GST Slab Rate Breakdown Table */}
        {data.taxByRate.length > 0 && (
          <div className="rounded-xl border border-border/40 overflow-hidden text-xs">
            <div className="bg-muted/40 px-3 py-2 font-bold text-muted-foreground grid grid-cols-3 text-center border-b border-border/40">
              <span className="text-left">Tax Slab</span>
              <span>Taxable Value</span>
              <span className="text-right">Tax Collected</span>
            </div>
            <div className="divide-y divide-border/30 bg-card">
              {data.taxByRate.map((slab, i) => (
                <div key={slab.rate} className="px-3 py-2 grid grid-cols-3 items-center text-center hover:bg-muted/15 transition-colors">
                  <div className="text-left flex items-center gap-1.5 font-bold text-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {slab.rate}
                  </div>
                  <span className="text-muted-foreground font-mono">{formatCurrency(slab.taxable)}</span>
                  <span className="text-right font-bold font-mono text-foreground">{formatCurrency(slab.tax)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
