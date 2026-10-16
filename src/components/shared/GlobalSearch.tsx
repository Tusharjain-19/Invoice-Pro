'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/db';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  Search,
  Plus,
} from 'lucide-react';

interface SearchResult {
  type: 'page' | 'product' | 'customer' | 'supplier' | 'invoice';
  label: string;
  description?: string;
  href: string;
  icon: React.ElementType;
}

const PAGES: SearchResult[] = [
  { type: 'page', label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { type: 'page', label: 'Products', href: '/products', icon: Package },
  { type: 'page', label: 'Customers', href: '/customers', icon: Users },
  { type: 'page', label: 'Suppliers', href: '/suppliers', icon: Truck },
  { type: 'page', label: 'Invoices', href: '/invoices', icon: FileText },
  { type: 'page', label: 'Create Invoice', href: '/invoices/create', icon: Plus },
  { type: 'page', label: 'Expenses', href: '/expenses', icon: Wallet },
  { type: 'page', label: 'Reports', href: '/reports', icon: BarChart3 },
  { type: 'page', label: 'Settings', href: '/settings', icon: Settings },
];

export function GlobalSearch() {
  const router = useRouter();
  const { globalSearchOpen, setGlobalSearchOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>(PAGES);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const search = useCallback(async (term: string) => {
    const items: SearchResult[] = [];

    // Pages
    const matchingPages = PAGES.filter(p =>
      p.label.toLowerCase().includes(term.toLowerCase())
    );
    items.push(...matchingPages);

    if (term.length >= 2) {
      // Products
      try {
        const products = await db.products
          .filter(p => (p.name?.toLowerCase().includes(term.toLowerCase()) ?? false) || (p.sku?.toLowerCase().includes(term.toLowerCase()) ?? false))
          .limit(5)
          .toArray();
        items.push(...products.map(p => ({
          type: 'product' as const,
          label: p.name,
          description: `SKU: ${p.sku} · ₹${p.sellingPrice}`,
          href: `/products?search=${encodeURIComponent(p.name)}`,
          icon: Package,
        })));
      } catch { /* empty */ }

      // Customers
      try {
        const customers = await db.customers
          .filter(c => (c.name?.toLowerCase().includes(term.toLowerCase()) ?? false) || Boolean(c.phone?.includes(term)))
          .limit(5)
          .toArray();
        items.push(...customers.map(c => ({
          type: 'customer' as const,
          label: c.name,
          description: c.phone || c.email,
          href: `/customers?search=${encodeURIComponent(c.name)}`,
          icon: Users,
        })));
      } catch { /* empty */ }

      // Suppliers
      try {
        const suppliers = await db.suppliers
          .filter(s => (s.name?.toLowerCase().includes(term.toLowerCase()) ?? false))
          .limit(5)
          .toArray();
        items.push(...suppliers.map(s => ({
          type: 'supplier' as const,
          label: s.name,
          description: s.gstNumber || s.phone,
          href: `/suppliers?search=${encodeURIComponent(s.name)}`,
          icon: Truck,
        })));
      } catch { /* empty */ }

      // Invoices
      try {
        const invoices = await db.invoices
          .filter(i => (i.invoiceNumber?.toLowerCase().includes(term.toLowerCase()) ?? false) || (i.customerName?.toLowerCase().includes(term.toLowerCase()) ?? false))
          .limit(5)
          .toArray();
        items.push(...invoices.map(i => ({
          type: 'invoice' as const,
          label: i.invoiceNumber,
          description: `${i.customerName} · ₹${i.totalAmount}`,
          href: `/invoices/${i.id}`,
          icon: FileText,
        })));
      } catch { /* empty */ }
    }

    setResults(items);
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    if (globalSearchOpen) {
      setQuery('');
      setResults(PAGES);
      setSelectedIndex(0);
    }
  }, [globalSearchOpen]);

  useEffect(() => {
    if (query) {
      const timer = setTimeout(() => search(query), 150);
      return () => clearTimeout(timer);
    } else {
      setResults(PAGES);
      setSelectedIndex(0);
    }
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setGlobalSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setGlobalSearchOpen(false);
    }
  };

  if (!globalSearchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setGlobalSearchOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, customers, invoices..."
            className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <button
                key={`${result.type}-${result.href}-${index}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer text-left ${
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/50'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{result.label}</span>
                  {result.description && (
                    <span className="text-xs text-muted-foreground truncate">{result.description}</span>
                  )}
                </div>
                <span className="ml-auto text-[10px] font-medium text-muted-foreground uppercase">
                  {result.type}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
