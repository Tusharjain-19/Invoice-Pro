import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  globalSearchOpen: boolean;
  confirmDialog: ConfirmOptions | null;
  
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setGlobalSearchOpen: (open: boolean) => void;
  showConfirm: (options: ConfirmOptions) => void;
  hideConfirm: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  globalSearchOpen: false,
  confirmDialog: null,
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  showConfirm: (options) => set({ confirmDialog: options }),
  hideConfirm: () => set({ confirmDialog: null }),
}));
