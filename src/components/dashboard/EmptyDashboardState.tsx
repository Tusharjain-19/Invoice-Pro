'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Play, Database, ShieldAlert, Receipt } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/db';
import { toast } from 'sonner';

export function EmptyDashboardState() {
  return (
    <Card className="border border-border/50 rounded-lg bg-card/40 backdrop-blur-lg overflow-hidden py-16 px-6 text-center max-w-2xl mx-auto shadow-lg animate-in fade-in-50 zoom-in-95 duration-500 mt-8">
      <CardContent className="space-y-8 flex flex-col items-center">
        {/* Animated Illustration */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-inner group">
          <Receipt className="h-12 w-12 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white border-2 border-background">
            <Database className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Welcome to InvoicePro</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your secure local accounting sandbox is active and empty. Let's get started by creating your first record entries.
          </p>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-md">
          <Link
            href="/invoices/create"
            className="inline-flex items-center justify-center rounded-xl font-bold h-12 bg-primary hover:bg-primary/95 text-white gap-2 shadow-sm transition-colors cursor-pointer select-none"
          >
            <FileText className="h-4.5 w-4.5 shrink-0" />
            <span>Create First Invoice</span>
          </Link>
          
          <Link
            href="/settings?tab=backup"
            className="inline-flex items-center justify-center rounded-xl font-bold h-12 border border-border bg-background hover:bg-muted/40 text-foreground gap-2 transition-colors cursor-pointer select-none"
          >
            <Upload className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
            <span>Import Products</span>
          </Link>

          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-xl font-bold h-12 border border-border bg-background hover:bg-muted/40 text-foreground gap-2 transition-colors cursor-pointer select-none sm:col-span-2"
          >
            <Play className="h-4.5 w-4.5 text-rose-500 shrink-0" />
            <span>Configure Business Settings</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
