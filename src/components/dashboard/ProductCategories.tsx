'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Package, Tag, ShoppingBag, FolderOpen, Percent } from 'lucide-react';
import { PieChart as RPieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface CategoryData {
  name: string;
  value: number; // Count of items
}

interface ProductCategoriesProps {
  data: CategoryData[];
}

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const ICONS = [Tag, ShoppingBag, FolderOpen, Package];

export function ProductCategories({ data }: ProductCategoriesProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCount = data.reduce((sum, item) => sum + item.value, 0);

  // Group and sort data
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <PieChart className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Product Categories</CardTitle>
            <p className="text-[11px] text-muted-foreground/80 font-medium">Category inventory spread</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-xs font-semibold">No category metrics available</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Pie Chart */}
            <div className="w-35 h-35 shrink-0 flex items-center justify-center">
              {mounted ? (
                <RPieChart width={140} height={140}>
                  <Pie
                    data={sortedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sortedData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#09090b',
                    }}
                    formatter={(val) => [`${val} items`]}
                  />
                </RPieChart>
              ) : (
                <div className="w-35 h-35 rounded-full bg-muted/10" />
              )}
            </div>

            {/* List details */}
            <div className="flex-1 w-full space-y-2.5 max-h-42.5 overflow-y-auto pr-1">
              {sortedData.slice(0, 4).map((item, index) => {
                const Icon = ICONS[index % ICONS.length];
                const pct = totalCount > 0 ? (item.value / totalCount) * 100 : 0;
                const dotColor = CHART_COLORS[index % CHART_COLORS.length];

                return (
                  <div key={`cat-${index}`} className="flex items-center justify-between gap-4 p-2 rounded-xl bg-muted/15 border border-border/20 hover:border-border transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <Icon className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">{item.name || 'General'}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground/90 font-semibold">{item.value} items</span>
                      <span className="text-[10px] font-extrabold text-foreground px-1.5 py-0.5 rounded bg-muted/30 border border-border/30">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
