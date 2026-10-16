'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConfirmDialog() {
  const { confirmDialog, hideConfirm } = useAppStore();

  if (!confirmDialog) return null;

  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'primary',
    onConfirm,
    onCancel,
  } = confirmDialog;

  const handleConfirm = () => {
    onConfirm();
    hideConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    hideConfirm();
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      default:
        return <Info className="h-6 w-6 text-primary" />;
    }
  };

  const getConfirmButtonStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white font-bold';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 text-white font-bold';
      default:
        return 'bg-primary hover:bg-primary/90 focus:ring-primary text-white font-bold';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleCancel}
    >
      <div 
        className="w-full max-w-sm bg-card border border-border/50 rounded-2xl p-6 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-2xl shrink-0",
            variant === 'danger' && "bg-red-500/10",
            variant === 'warning' && "bg-amber-500/10",
            variant === 'primary' && "bg-primary/10"
          )}>
            {getIcon()}
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
            <p className="text-xs text-muted-foreground/90 leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-9.5 text-xs font-bold border-border/50 hover:bg-muted/40"
            onClick={handleCancel}
          >
            {cancelLabel}
          </Button>
          <Button 
            size="sm" 
            className={cn("rounded-xl h-9.5 text-xs", getConfirmButtonStyles())}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
