'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/ui/button';
import { Logo, InvoiceProMark } from './Logo';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Percent,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Loans & EMI', href: '/loans', icon: Percent },
  { label: 'Expenses', href: '/expenses', icon: Wallet },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebar } = useAppStore();
  const { settings, setSettings } = useSettingsStore();

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings({ theme: newTheme });
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleCloseInside = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    } else {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card text-foreground transition-all duration-200 ease-in-out h-full shrink-0 lg:static lg:translate-x-0",
          // Mobile state
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          // Desktop collapsed vs expanded width
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Top Header Section with Logo & Close / Collapse Button */}
        <div className={cn(
          "flex items-center px-4 h-16 shrink-0 border-b border-border/50 transition-all",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          {/* Logo */}
          <Logo compact={sidebarCollapsed} className="shrink-0" />

          {/* Close / Collapse button inside the sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseInside}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Close sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Close sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5" />
            ) : (
              <>
                <PanelLeftClose className="h-4.5 w-4.5 hidden lg:block" />
                <X className="h-4.5 w-4.5 lg:hidden" />
              </>
            )}
          </Button>
        </div>

        {/* Navigation List - Non-AI Human-Crafted SaaS Selection Colors */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 group",
                  sidebarCollapsed && "justify-center px-2 py-3",
                  isActive
                    ? [
                        // Non-AI, high-contrast, premium styling
                        "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-foreground font-bold shadow-xs",
                        // Crisp left accent bar
                        "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1.5 before:bg-primary before:rounded-r-md",
                      ]
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0 transition-colors",
                    isActive
                      ? "text-primary dark:text-primary-foreground"
                      : "text-muted-foreground/80 group-hover:text-foreground"
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Section */}
        <div className="mt-auto p-3 shrink-0 border-t border-border/50 space-y-2 bg-muted/20">
          {/* Version & Theme Toggle Row */}
          <div className={cn("flex items-center px-1.5", sidebarCollapsed ? "justify-center" : "justify-between")}>
            {!sidebarCollapsed && (
              <span className="text-[10px] text-muted-foreground/70 font-bold tracking-wider uppercase font-mono">
                v1.2.0 • PRO
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={toggleTheme}
              title={settings.theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            >
              {settings.theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Account & Settings Link Card */}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 p-2 rounded-xl border border-border/50 bg-card hover:bg-muted/70 transition-colors cursor-pointer group",
              sidebarCollapsed ? "justify-center" : ""
            )}
            title="Account & System Settings"
          >
            {settings.companyLogo ? (
              <img
                src={settings.companyLogo}
                alt="Logo"
                className="h-7 w-7 rounded-lg object-contain border border-border/50 shrink-0 bg-white dark:bg-slate-900 p-0.5"
              />
            ) : (
              <InvoiceProMark size={28} className="shrink-0" />
            )}
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 overflow-hidden min-w-0">
                  <span className="text-xs font-bold text-foreground truncate block leading-tight">
                    {settings.companyName || 'InvoicePro'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 block truncate">
                    Settings & Billing
                  </span>
                </div>
                <Settings className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}
