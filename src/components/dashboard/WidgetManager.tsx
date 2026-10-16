'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  LayoutGrid,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Sparkles,
  PieChart,
  Landmark,
  CreditCard,
  Award,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface WidgetConfig {
  id: string;
  name: string;
  category: 'financial' | 'sales' | 'operations' | 'general';
  description?: string;
  visible: boolean;
}

export const ALL_AVAILABLE_WIDGETS: WidgetConfig[] = [
  {
    id: 'welcome',
    name: 'Welcome Banner',
    category: 'general',
    description: 'Header greeting with current financial year and today\'s quick summary',
    visible: true,
  },
  {
    id: 'kpis',
    name: 'KPI Statistics Grid',
    category: 'financial',
    description: 'Executive overview cards with sparklines and period growth trends',
    visible: true,
  },
  {
    id: 'profitMatrix',
    name: 'Profitability & Margin Matrix',
    category: 'financial',
    description: 'Gross Profit, COGS, Net Profit %, AOV, and revenue flow analysis',
    visible: true,
  },
  {
    id: 'taxMatrix',
    name: 'GST Tax Liability Matrix',
    category: 'sales',
    description: 'CGST, SGST, IGST tax breakdown and taxable turnover by slab',
    visible: true,
  },
  {
    id: 'paymentModes',
    name: 'Payment Modes & Collections',
    category: 'financial',
    description: 'Donut breakdown of Cash, UPI, and Bank collections with recovery %',
    visible: true,
  },
  {
    id: 'todayEmi',
    name: "Today's EMI & Loan Dues",
    category: 'financial',
    description: "Real-time loan installments due today & overdue with 1-click WhatsApp reminders and lifecycle actions",
    visible: true,
  },
  {
    id: 'salesTrend',
    name: 'Sales Trend Chart',
    category: 'sales',
    description: 'Interactive periodic sales velocity and order volume curve',
    visible: true,
  },
  {
    id: 'cashFlowTrend',
    name: 'Cash Flow (Inflow vs Outflow)',
    category: 'financial',
    description: 'Dual area chart comparing revenue receipts against business expenses',
    visible: true,
  },
  {
    id: 'revenueVsExpenses',
    name: 'Revenue vs Expenses',
    category: 'financial',
    description: 'Monthly comparison of gross revenue versus operating disbursements',
    visible: true,
  },
  {
    id: 'topProducts',
    name: 'Top Selling Products Matrix',
    category: 'sales',
    description: 'Ranked list of top revenue-driving products and sales units',
    visible: true,
  },
  {
    id: 'customerAging',
    name: 'Receivables Aging Matrix',
    category: 'operations',
    description: 'Customer credit aging breakdown: 0-15d, 16-30d, 31-60d, 60d+',
    visible: true,
  },
  {
    id: 'categories',
    name: 'Product Categories Spread',
    category: 'operations',
    description: 'Inventory distribution across categories and department tags',
    visible: true,
  },
  {
    id: 'recentInvoices',
    name: 'Recent Invoices Table',
    category: 'sales',
    description: 'Latest bills generated with status pills and customer details',
    visible: true,
  },
  {
    id: 'pendingPayments',
    name: 'Pending Collections List',
    category: 'operations',
    description: 'Quick debtor overview of unsettled invoices needing payment follow-up',
    visible: true,
  },
  {
    id: 'lowStock',
    name: 'Low Stock Inventory Alerts',
    category: 'operations',
    description: 'Real-time alert indicators for catalog items reaching reorder limits',
    visible: true,
  },
  {
    id: 'timeline',
    name: 'Operations Activity Timeline',
    category: 'operations',
    description: 'Audit trail of recent transactions, stock updates, and logged expenses',
    visible: true,
  },
  {
    id: 'quickActions',
    name: 'Quick Tools & Shortcuts',
    category: 'general',
    description: 'One-click launchpads for new invoice, expense, or product entries',
    visible: true,
  },
];

interface WidgetManagerProps {
  widgets: WidgetConfig[];
  setWidgets: (widgets: WidgetConfig[]) => void;
  onResetDefaults?: () => void;
}

export function WidgetManager({ widgets, setWidgets, onResetDefaults }: WidgetManagerProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [open, setOpen] = useState(false);

  // Active count
  const activeCount = widgets.filter((w) => w.visible).length;

  const toggleVisibility = (id: string) => {
    const exists = widgets.find((w) => w.id === id);
    if (exists) {
      const updated = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
      setWidgets(updated);
    } else {
      const template = ALL_AVAILABLE_WIDGETS.find((w) => w.id === id);
      if (template) {
        setWidgets([...widgets, { ...template, visible: true }]);
      }
    }
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === widgets.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setWidgets(updated);
  };

  const handleReset = () => {
    if (onResetDefaults) {
      onResetDefaults();
    } else {
      setWidgets(ALL_AVAILABLE_WIDGETS);
    }
  };

  const categories = [
    { id: 'all', label: 'All Widgets' },
    { id: 'financial', label: 'Financial & Profit' },
    { id: 'sales', label: 'Sales & Tax' },
    { id: 'operations', label: 'Operations & Stock' },
  ];

  const filteredCatalog = ALL_AVAILABLE_WIDGETS.filter((w) =>
    filterCategory === 'all' ? true : w.category === filterCategory
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl font-bold h-10 border-border/50 hover:bg-muted/40 gap-2 shrink-0 shadow-xs"
        >
          <LayoutGrid className="h-4 w-4 text-primary" />
          <span>Customize Widgets</span>
          <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
            {activeCount}/{ALL_AVAILABLE_WIDGETS.length}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Customize Dashboard & KPI Widgets
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Add, remove, or rearrange financial matrices, graphs, and operational feeds
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground gap-1 h-8"
              title="Reset dashboard to default widget arrangement"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </DialogHeader>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 pt-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                filterCategory === c.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/40 hover:bg-muted/30 text-muted-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Widgets Catalog with Add/Remove Toggle & Ordering */}
        <div className="py-2 space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredCatalog.map((widget) => {
            const activeWidget = widgets.find((w) => w.id === widget.id);
            const isVisible = activeWidget ? activeWidget.visible : false;
            const currentIdx = widgets.findIndex((w) => w.id === widget.id);

            return (
              <div
                key={widget.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isVisible
                    ? 'border-border/60 bg-card hover:bg-muted/15'
                    : 'border-dashed border-border/40 bg-muted/10 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Up / Down Controls for active widgets */}
                  {isVisible && currentIdx !== -1 && (
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4.5 w-4.5 rounded-md hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
                        onClick={() => moveWidget(currentIdx, 'up')}
                        disabled={currentIdx === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4.5 w-4.5 rounded-md hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
                        onClick={() => moveWidget(currentIdx, 'down')}
                        disabled={currentIdx === widgets.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate">{widget.name}</span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                          widget.category === 'financial'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : widget.category === 'sales'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        {widget.category}
                      </span>
                    </div>
                    {widget.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {widget.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={isVisible}
                    onCheckedChange={() => toggleVisibility(widget.id)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 sm:justify-between items-center text-xs text-muted-foreground">
          <span>{activeCount} widgets currently active on your dashboard</span>
          <Button size="sm" onClick={() => setOpen(false)} className="rounded-xl font-bold">
            Done Customizing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
