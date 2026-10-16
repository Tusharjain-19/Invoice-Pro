'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number;
  isCount?: boolean;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend: number; // e.g. 12.5 (positive) or -3.2 (negative)
  comparisonText?: string;
  sparklineData?: number[];
}

export function KpiCard({
  label,
  value,
  isCount = false,
  icon: Icon,
  color,
  bg,
  trend,
  comparisonText = "vs previous month",
  sparklineData = [10, 15, 8, 12, 20, 18, 25],
}: KpiCardProps) {
  const isPositive = trend >= 0;

  // Generate SVG path for sparkline
  const generateSparklinePath = (data: number[]) => {
    if (!data || data.length < 2) return '';
    const width = 80;
    const height = 24;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min === 0 ? 1 : max - min;
    
    return data.map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  return (
    <Card className="h-full bg-card border border-border rounded-lg group overflow-hidden transition-colors">
      <CardContent className="p-5 flex flex-col justify-between h-full relative">
        {/* Glow effect on hover */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground/80 tracking-normal block">{label}</span>
            <span className="text-2xl font-bold tracking-tight text-foreground block">
              {isCount ? value : formatCurrency(value, 0)}
            </span>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg} ${color} shadow-sm`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Sparkline and stats */}
        <div className="flex items-end justify-between mt-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Badge 
                variant={isPositive ? "success" : "destructive"} 
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                  isPositive 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                }`}
              >
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </Badge>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground/70 block whitespace-nowrap">
              {comparisonText}
            </span>
          </div>

          {/* SVG Sparkline */}
          <div className="w-20 h-6 opacity-80 group-hover:opacity-100 transition-opacity">
            <svg width="80" height="24" className="overflow-visible">
              <path
                d={generateSparklinePath(sparklineData)}
                fill="none"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
