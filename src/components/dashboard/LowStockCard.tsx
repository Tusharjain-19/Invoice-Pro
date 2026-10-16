'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package, AlertTriangle, Search, ArrowUpRight } from 'lucide-react';
import type { Product } from '@/types';

interface LowStockCardProps {
  products: Product[];
}

export function LowStockCard({ products }: LowStockCardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const lowStockItems = products.filter(p => p.isActive && p.currentStock <= p.minimumStock);

  const filteredProducts = lowStockItems.filter(p => 
    (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) || 
    (p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getSeverityDetails = (current: number, min: number) => {
    if (current === 0) {
      return { 
        label: 'Out of Stock', 
        color: 'text-red-500 bg-red-500/10 border-red-500/20',
        barColor: 'bg-red-500'
      };
    }
    const ratio = current / min;
    if (ratio <= 0.5) {
      return { 
        label: 'Critical', 
        color: 'text-red-500 bg-red-500/10 border-red-500/20',
        barColor: 'bg-red-500'
      };
    }
    return { 
      label: 'Low Stock', 
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      barColor: 'bg-amber-500'
    };
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-col gap-3 pb-3 border-b border-border/40">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">Low Stock Alerts</CardTitle>
              <p className="text-[11px] text-muted-foreground/80 font-medium">Products below inventory threshold</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs hover:bg-muted/50 rounded-lg" asChild>
            <Link href="/products" className="gap-1 font-bold text-primary">
              View Inventory <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Search Field */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search low stock products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-xl text-xs bg-muted/20 border-border/50 focus-visible:ring-primary placeholder:text-muted-foreground/60"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4 px-4 pb-4 space-y-3 max-h-75 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-xs font-semibold">All products well stocked</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const severity = getSeverityDetails(p.currentStock, p.minimumStock);
            const progressWidth = Math.min((p.currentStock / p.minimumStock) * 100, 100);

            return (
              <div key={p.id} className="p-3.5 rounded-xl bg-muted/10 border border-border/30 hover:border-border transition-all flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                    <Badge className={`text-[9px] font-bold rounded px-1.5 py-0.2 ${severity.color}`}>
                      {severity.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-medium mb-1">
                    <span>Stock: {p.currentStock} / {p.minimumStock} {p.unit}</span>
                    <span>{progressWidth.toFixed(0)}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-muted-foreground/10 h-1 rounded-full overflow-hidden">
                    <div className={`${severity.barColor} h-full`} style={{ width: `${progressWidth}%` }} />
                  </div>
                </div>
                
                <Link 
                  href={`/products?action=edit&id=${p.id}`}
                  className="h-8.5 px-3 rounded-lg text-xs font-bold text-primary border border-input bg-background hover:bg-primary/5 hover:text-primary shrink-0 inline-flex items-center justify-center transition-colors shadow-xs"
                >
                  Restock
                </Link>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
