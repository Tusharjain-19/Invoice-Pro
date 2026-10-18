'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAppStore } from '@/store/useAppStore';
import { seedDefaults } from '@/db';
import { Toaster } from 'sonner';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore();
  const { setGlobalSearchOpen } = useAppStore();

  // Initialize theme on mount and settings changes
  useEffect(() => {
    const root = document.documentElement;
    const theme = settings.theme || 'light';

    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);
      root.classList.remove('theme-midnight');
    } else if (theme === 'midnight') {
      root.classList.add('dark', 'theme-midnight');
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('theme-midnight');
    } else {
      root.classList.remove('dark', 'theme-midnight');
    }
  }, [settings.theme]);

  // Seed database defaults
  useEffect(() => {
    seedDefaults();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K = Global Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setGlobalSearchOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-360 p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      <GlobalSearch />
      <ConfirmDialog />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          className: 'font-sans',
        }}
      />
    </div>
  );
}
