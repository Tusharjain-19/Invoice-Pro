'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Menu,
  Bell,
  Plus,
  ChevronDown,
  Building2,
  Calendar,
  Settings as SettingsIcon,
  FileText,
  Package,
  UserPlus,
  Wallet,
  Percent,
  Truck,
  AlertTriangle,
  CalendarClock,
  ShoppingCart,
  MessageCircle,
  CheckCircle,
} from 'lucide-react';
import { InvoiceProMark } from './Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/invoices': 'Invoices',
  '/invoices/create': 'Create Invoice',
  '/loans': 'Loans & EMI',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const { setSidebarOpen, setGlobalSearchOpen } = useAppStore();
  const { settings } = useSettingsStore();

  const lowStockProducts = useLiveQuery(async () => {
    return await db.products.filter(p => Boolean(p.isActive && p.currentStock <= p.minimumStock)).toArray();
  }) ?? [];

  const nearExpiryProducts = useLiveQuery(async () => {
    const now = Date.now();
    const thirtyDays = now + 30 * 86400000;
    return await db.products.filter(p => {
      if (!p.isActive || !p.expiryDate) return false;
      const expTime = new Date(p.expiryDate).getTime();
      return !isNaN(expTime) && expTime > now && expTime <= thirtyDays;
    }).toArray();
  }) ?? [];

  const overdueInvoices = useLiveQuery(async () => {
    const now = Date.now();
    return await db.invoices.filter(inv => inv.status !== 'paid' && inv.dueDate !== null && inv.dueDate < now).toArray();
  }) ?? [];

  const suppliers = useLiveQuery(() => db.suppliers.toArray()) ?? [];

  const totalAlertsCount = lowStockProducts.length + nearExpiryProducts.length + overdueInvoices.length;

  const pageTitle = Object.entries(PAGE_TITLES).reduce((title, [path, name]) => {
    if (path === '/' && pathname === '/') return name;
    if (path !== '/' && pathname.startsWith(path)) return name;
    return title;
  }, 'InvoicePro');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = `${pageTitle} | InvoicePro`;
    }
  }, [pageTitle]);

  const getFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (month >= 3) {
      return `FY ${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `FY ${year - 1}-${year.toString().slice(-2)}`;
    }
  };

  const breadcrumbs = pathname
    .split('/')
    .filter(Boolean)
    .map((seg, idx, arr) => {
      const url = '/' + arr.slice(0, idx + 1).join('/');
      return {
        label: seg.charAt(0).toUpperCase() + seg.slice(1),
        url,
        active: idx === arr.length - 1,
      };
    });

  const unreadNotificationsCount = totalAlertsCount;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/90 backdrop-blur-md px-6">
      {/* Left: Breadcrumbs, Title & Financial Year Pill */}
      <div className="flex items-center gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 rounded-lg"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            {breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.url}>
                <span>/</span>
                <Link
                  href={crumb.url}
                  className={crumb.active ? 'text-foreground font-semibold' : 'hover:text-foreground transition-colors'}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            <InvoiceProMark size={24} className="shrink-0 drop-shadow-xs" />
            <h1 className="text-xl font-bold tracking-tight truncate text-foreground">{pageTitle}</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-medium py-0.5 px-2.5 rounded-lg">
              <Calendar className="h-3 w-3 mr-1 shrink-0" />
              {getFinancialYear()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Center: Sleek Compact Global Search */}
      <div className="hidden md:flex w-44 lg:w-52 shrink-0 relative">
        <Button
          variant="outline"
          className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground bg-muted/30 border-border/40 hover:bg-muted/50 rounded-full px-3 h-8.5 font-normal transition-all"
          onClick={() => setGlobalSearchOpen(true)}
        >
          <div className="flex items-center gap-1.5">
            <Search className="h-3 w-3 text-muted-foreground/80" />
            <span className="text-xs">Search...</span>
          </div>
          <kbd className="pointer-events-none hidden h-4 select-none items-center gap-0.5 rounded border bg-muted/80 px-1 font-mono text-[9px] font-semibold text-muted-foreground/70 sm:flex">
            <span>⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Right: Company Switcher, Quick Create, Notifications, Avatar */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Company switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 hover:bg-muted/50 rounded-xl px-3 h-9 font-bold border border-border/40 text-xs">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-28 truncate">{settings.companyName || 'My Business'}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-xl border border-border/50 bg-card">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Select Company</DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 border-border/40" />
            <DropdownMenuItem className="flex items-center gap-2 rounded-lg cursor-pointer">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs truncate">{settings.companyName || 'My Business'}</span>
                <span className="text-[9px] text-muted-foreground">Primary Branch</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 border-border/40" />
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/settings" className="flex items-center gap-2 w-full text-xs">
                <SettingsIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Manage Companies</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick create - Refined Premium Gradient Button & Rich Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="h-9 rounded-xl gap-2 font-bold text-xs bg-linear-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-white px-3.5 shadow-sm shadow-primary/25 border border-primary/30 transition-colors"
            >
              <div className="h-4 w-4 rounded-md bg-white/20 flex items-center justify-center">
                <Plus className="h-3 w-3 stroke-3" />
              </div>
              <span className="hidden sm:inline font-bold">Quick Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2 shadow-2xl border border-border/70 bg-popover/95 backdrop-blur-xl">
            <div className="px-3 py-2 border-b border-border/40 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Quick Actions</span>
              <span className="text-[11px] text-muted-foreground/80">Add records & transactions in 1-click</span>
            </div>
            
            <DropdownMenuItem asChild className="p-2 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors group">
              <Link href="/invoices/create" className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">New Tax Invoice</span>
                    <kbd className="text-[9px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border/40">⌘I</kbd>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">GST B2B, B2C & Retail Bill</span>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="p-2 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors group">
              <Link href="/products?action=add" className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Package className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">Add Product & Stock</span>
                    <kbd className="text-[9px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border/40">⌘P</kbd>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">Inventory item, HSN & GST rate</span>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="p-2 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors group">
              <Link href="/customers?action=add" className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">Register Customer</span>
                    <kbd className="text-[9px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border/40">⌘C</kbd>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">Buyer ledger, KYC & GSTIN</span>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="p-2 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors group">
              <Link href="/expenses?action=add" className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">Record Expense</span>
                    <kbd className="text-[9px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border/40">⌘E</kbd>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">Expenditure with bill proof scan</span>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="p-2 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors group">
              <Link href="/loans" className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Percent className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">Disburse EMI / Loan</span>
                    <kbd className="text-[9px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border/40">⌘L</kbd>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">Customer loan & installment khata</span>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="p-2 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors group">
              <Link href="/suppliers" className="flex items-center gap-3 w-full">
                <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Truck className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">Add Vendor / Supplier</span>
                    <kbd className="text-[9px] font-mono text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border/40">⌘S</kbd>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">Supplier ledger & WhatsApp sync</span>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl relative hover:bg-muted/50 border border-border/40">
              <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-88 rounded-2xl p-2.5 shadow-2xl border border-border/60 bg-popover/95 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Alerts & Re-orders</span>
              </div>
              {unreadNotificationsCount > 0 && (
                <Badge variant="destructive" className="text-[10px] font-bold px-1.5 py-0">
                  {unreadNotificationsCount} Active
                </Badge>
              )}
            </div>

            {totalAlertsCount === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="font-semibold text-foreground">All Systems Healthy</p>
                <p className="text-[11px] mt-0.5">No low stock items, expiring batches, or overdue bills.</p>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {/* Low Stock Alerts */}
                {lowStockProducts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-rose-500">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Low Stock ({lowStockProducts.length})
                      </span>
                      <Link href="/products?filter=low-stock" className="hover:underline text-[9px] lowercase font-normal text-muted-foreground">
                        view all
                      </Link>
                    </div>

                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {lowStockProducts.slice(0, 5).map(prod => {
                        const defaultSupplier = suppliers[0];
                        const supplierPhone = defaultSupplier?.phone?.replace(/\D/g, '') || '';
                        const waMsg = encodeURIComponent(
                          `Hello ${defaultSupplier?.name || 'Vendor'}, please send fresh stock for:\nProduct: ${prod.name} (SKU: ${prod.sku || 'N/A'})\nRe-order Qty: ${Math.max(10, (prod.minimumStock || 5) * 2)}\nStore: ${settings.companyName || 'InvoicePro'}`
                        );

                        return (
                          <div
                            key={prod.id}
                            className="p-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 flex items-center justify-between gap-2 text-xs transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground text-xs truncate">{prod.name}</p>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-0.5">
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  {prod.currentStock} {prod.unit || 'pcs'} left
                                </span>
                                <span>(Min: {prod.minimumStock})</span>
                              </div>
                            </div>

                            {/* 1-Click Re-order Shortcut */}
                            {supplierPhone ? (
                              <a
                                href={`https://wa.me/${supplierPhone.length === 10 ? '91' + supplierPhone : supplierPhone}?text=${waMsg}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs shrink-0 transition-colors"
                                title="Re-order instantly via WhatsApp to Vendor"
                              >
                                <MessageCircle className="h-3 w-3" /> Re-order
                              </a>
                            ) : (
                              <Link
                                href={`/invoices/create?type=purchase_invoice&productId=${prod.id}&productName=${encodeURIComponent(prod.name)}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs shrink-0 transition-colors"
                                title="Create Purchase Bill"
                              >
                                <ShoppingCart className="h-3 w-3" /> Re-order
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expiry Alerts (within 30 days) */}
                {nearExpiryProducts.length > 0 && (
                  <div className="space-y-1.5 border-t border-border/40 pt-2">
                    <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-amber-500">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> Expiry Warning ({nearExpiryProducts.length})
                      </span>
                    </div>

                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {nearExpiryProducts.slice(0, 4).map(prod => {
                        const now = Date.now();
                        const daysLeft = prod.expiryDate ? Math.max(0, Math.ceil((new Date(prod.expiryDate).getTime() - now) / 86400000)) : 0;

                        return (
                          <div
                            key={prod.id}
                            className="p-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 flex items-center justify-between gap-2 text-xs transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground text-xs truncate">{prod.name}</p>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-0.5">
                                {prod.batchNumber && <span>Batch: {prod.batchNumber}</span>}
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="border-amber-500/30 text-amber-600 text-[10px] font-bold shrink-0">
                              {daysLeft}d left
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Overdue Invoices */}
                {overdueInvoices.length > 0 && (
                  <div className="space-y-1.5 border-t border-border/40 pt-2">
                    <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-purple-500">
                      <span>Overdue Invoices ({overdueInvoices.length})</span>
                      <Link href="/invoices" className="hover:underline text-[9px] lowercase font-normal text-muted-foreground">
                        view all
                      </Link>
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {overdueInvoices.slice(0, 3).map(inv => (
                        <Link
                          key={inv.id}
                          href={`/invoices`}
                          className="p-2 rounded-xl bg-muted/40 hover:bg-muted/70 flex items-center justify-between gap-2 text-xs transition-colors block"
                        >
                          <div>
                            <p className="font-bold text-foreground text-xs">{inv.invoiceNumber}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{inv.customerName}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono text-destructive block">
                              ₹{inv.balanceDue.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-muted-foreground">Pending</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 bg-border/40 hidden sm:block" />

        {/* Brand / User Avatar */}
        <div className="h-9 w-9 rounded-xl overflow-hidden border border-border/50 shrink-0 flex items-center justify-center bg-card shadow-xs">
          {settings.companyLogo ? (
            <img src={settings.companyLogo} alt="Logo" className="h-full w-full object-contain p-1" />
          ) : (
            <InvoiceProMark size={32} />
          )}
        </div>
      </div>
    </header>
  );
}
