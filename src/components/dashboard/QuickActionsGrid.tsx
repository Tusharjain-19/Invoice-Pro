'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Package, 
  FileSpreadsheet, 
  Wallet, 
  UserPlus, 
  BarChart3,
  ArrowRight,
  Zap
} from 'lucide-react';

interface QuickActionItem {
  title: string;
  desc: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bg: string;
}

const actions: QuickActionItem[] = [
  {
    title: 'New Invoice',
    desc: 'Generate tax or retail invoice',
    icon: FileText,
    href: '/invoices/create',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10 border-indigo-500/20'
  },
  {
    title: 'Add Product',
    desc: 'Add stock item with GST details',
    icon: Package,
    href: '/products?action=add',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/20'
  },
  {
    title: 'Import Excel',
    desc: 'Bulk upload stock & contacts',
    icon: FileSpreadsheet,
    href: '/settings?tab=backup',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10 border-cyan-500/20'
  },
  {
    title: 'Record Expense',
    desc: 'Log business & salary payouts',
    icon: Wallet,
    href: '/expenses?action=add',
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500/20'
  },
  {
    title: 'Create Customer',
    desc: 'Register recurring GST profiles',
    icon: UserPlus,
    href: '/customers?action=add',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/20'
  },
  {
    title: 'Generate Report',
    desc: 'Export tax summaries & ledgers',
    icon: BarChart3,
    href: '/reports',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20'
  }
];

export function QuickActionsGrid() {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Quick Tools</CardTitle>
            <p className="text-[11px] text-muted-foreground/80 font-medium">Frequent operations shortcuts</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Link 
                key={act.title} 
                href={act.href}
                className="group flex flex-col justify-between p-4.5 rounded-2xl bg-muted/10 border border-border/30 hover:border-primary/30 dark:hover:border-primary/40 hover:bg-muted/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="pointer-events-none absolute top-0 right-0 w-24 h-24 bg-linear-to-br from-primary/5 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className={`p-2.5 rounded-xl border ${act.bg} ${act.color}`}>
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="space-y-0.5 relative z-10">
                  <h4 className="text-xs font-bold text-foreground">{act.title}</h4>
                  <p className="text-[10px] text-muted-foreground leading-normal font-medium">{act.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
