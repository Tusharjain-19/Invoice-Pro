'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Award, Package, Flame, X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface TopProductItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantitySold: number;
  revenue: number;
  unit: string;
}

interface TopProductsMatrixProps {
  products: TopProductItem[];
  onRemove?: () => void;
}

export function TopProductsMatrix({ products, onRemove }: TopProductsMatrixProps) {
  const maxRevenue = products.length > 0 ? Math.max(...products.map(p => p.revenue), 1) : 1;

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Award className="h-4.5 w-4.5 text-amber-500" />
              Top Selling Products Matrix
            </CardTitle>
            <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
              Velocity
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground/80">
            Top revenue contributors and high-velocity catalog inventory
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs font-bold text-primary gap-1">
            <Link href="/products">
              Catalog <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
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
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-9 w-9 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold">No product sales recorded yet</p>
          </div>
        ) : (
          products.slice(0, 5).map((prod, idx) => {
            const revenuePct = (prod.revenue / maxRevenue) * 100;
            return (
              <div key={prod.id || idx} className="space-y-1.5 p-2 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-extrabold shrink-0 ${idx === 0 ? 'bg-amber-500 text-slate-950 font-black' : idx === 1 ? 'bg-slate-300 dark:bg-slate-700 text-foreground' : 'bg-muted text-muted-foreground'}`}>
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-foreground truncate max-w-45" title={prod.name}>
                      {prod.name}
                    </span>
                    {prod.category && (
                      <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded hidden sm:inline-block">
                        {prod.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {prod.quantitySold} {prod.unit || 'pcs'}
                    </span>
                    <span className="font-extrabold font-mono text-foreground">
                      {formatCurrency(prod.revenue)}
                    </span>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${revenuePct}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-amber-500' : 'bg-primary'}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
