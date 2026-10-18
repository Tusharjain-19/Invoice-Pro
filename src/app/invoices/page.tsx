'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { db } from '@/db';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FileText, Plus, Search, Filter, Eye, Trash2, CheckCircle2, AlertTriangle, Clock, X,
  Printer, Loader2, Ban, Download, Check, Sparkles, MessageCircle, PackageCheck, FileCode,
  Lock, Key, Shield
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { PDFTemplateSelector } from '@/components/invoice-templates/PDFTemplates';
import { WhatsAppDueReminderModal } from '@/components/payments/WhatsAppDueReminderModal';
import { generateEWayBillJSON, downloadJsonFile } from '@/lib/gstCompliance';
import { toast } from 'sonner';
import type { Invoice, InvoiceStatus, AppSettings } from '@/types';
import { INVOICE_TYPE_LABELS } from '@/types';

const CANCELLATION_REASONS = [
  'Customer cancelled order / Returned goods',
  'Data entry mistake / Duplicate invoice',
  'Incorrect pricing or GST tax rate applied',
  'Invoice amended / New revised bill re-issued',
  'Customer rejected delivery / Void transaction',
  'Other custom reason',
];

export default function InvoicesListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { showConfirm } = useAppStore();

  // Cancellation modal states
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customReasonNotes, setCustomReasonNotes] = useState<string>('');
  const [autoDownloadPDF, setAutoDownloadPDF] = useState<boolean>(true);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Single PDF download state
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // WhatsApp due reminder modal state
  const [reminderInvoice, setReminderInvoice] = useState<Invoice | null>(null);

  // Cashier PIN Protection for Invoice Cancellation & Purging
  const [cashierPinPromptOpen, setCashierPinPromptOpen] = useState<boolean>(false);
  const [cashierEnteredPin, setCashierEnteredPin] = useState<string>('');
  const [pendingRestrictedAction, setPendingRestrictedAction] = useState<(() => void) | null>(null);

  const executeWithCashierProtection = (action: () => void) => {
    if (settings?.isCashierLockEnabled) {
      setPendingRestrictedAction(() => action);
      setCashierEnteredPin('');
      setCashierPinPromptOpen(true);
    } else {
      action();
    }
  };

  const handleVerifyCashierPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPin = settings?.staffPin || '1234';
    if (cashierEnteredPin.trim() === correctPin.trim()) {
      setCashierPinPromptOpen(false);
      setCashierEnteredPin('');
      if (pendingRestrictedAction) {
        const actionToRun = pendingRestrictedAction;
        setPendingRestrictedAction(null);
        actionToRun();
      }
      toast.success('Owner PIN Verified');
    } else {
      toast.error('Incorrect PIN. Only Admin/Owner can cancel or delete invoices.');
    }
  };

  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter(inv => {
        const matchesSearch = !search ||
          (inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (inv.customerName?.toLowerCase().includes(search.toLowerCase()) ?? false);
        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        const matchesType = typeFilter === 'all' || inv.invoiceType === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      });
  }, [invoices, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    // Exclude cancelled invoices from active total sales & pending balances
    const activeInvoices = invoices.filter(inv => inv.status !== 'cancelled');
    const cancelledCount = invoices.filter(inv => inv.status === 'cancelled').length;
    const totalSales = activeInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const pendingAmount = activeInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0);
    const paidAmount = activeInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    const count = invoices.length;
    return { totalSales, pendingAmount, paidAmount, count, cancelledCount };
  }, [invoices]);

  // Helper to trigger fast PDF generation and download
  const generateAndDownloadPDF = async (inv: Invoice, isCancelledCopy = false) => {
    const currentSettings = settings || (await db.settings.toCollection().first()) || {
      companyName: 'InvoicePro Business',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
      companyGstin: '',
      companyState: '',
      defaultTemplate: 'premium',
      termsAndConditions: '',
      notes: '',
      currencySymbol: '₹',
      invoicePrefix: 'INV',
    };

    const doc = (
      <PDFTemplateSelector
        templateName={currentSettings.defaultTemplate || 'premium'}
        invoice={inv}
        settings={currentSettings as AppSettings}
      />
    );

    const blob = await pdf(doc).toBlob();
    const fileName = isCancelledCopy || inv.status === 'cancelled'
      ? `CANCELLED_Invoice_${inv.invoiceNumber}.pdf`
      : `Invoice_${inv.invoiceNumber}.pdf`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1-Click PDF download handler from table row
  const handleDownloadSinglePDF = async (inv: Invoice) => {
    if (!inv.id) return;
    setDownloadingId(inv.id);
    const toastId = toast.loading(`Generating PDF for ${inv.invoiceNumber}...`);
    try {
      await generateAndDownloadPDF(inv, inv.status === 'cancelled');
      toast.success(`Downloaded ${inv.invoiceNumber} PDF`, { id: toastId });
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  // Instant print handler
  const handlePrintInvoice = (inv: Invoice) => {
    window.open(`/invoices/${inv.id}?print=true`, '_blank');
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (inv: Invoice) => {
    setInvoiceToCancel(inv);
    setSelectedReason(CANCELLATION_REASONS[0]);
    setCustomReasonNotes('');
    setAutoDownloadPDF(true);
  };

  // Confirm Cancellation with Audit Reason and Auto-Download
  const handleConfirmCancellation = async () => {
    if (!invoiceToCancel || !invoiceToCancel.id) return;
    setIsCancelling(true);

    const finalReason = selectedReason === 'Other custom reason'
      ? (customReasonNotes.trim() || 'Voided by user')
      : (customReasonNotes.trim() ? `${selectedReason} - ${customReasonNotes.trim()}` : selectedReason);

    const cancelledInvoice: Invoice = {
      ...invoiceToCancel,
      status: 'cancelled',
      cancellationReason: finalReason,
      cancelledAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      // 1. Auto download archived PDF if enabled
      if (autoDownloadPDF) {
        toast.loading('Generating & auto-downloading archived invoice...', { id: 'cancel-op' });
        await generateAndDownloadPDF(cancelledInvoice, true);
      }

      // 2. Mark invoice as cancelled in database with audit reasons
      await db.invoices.update(invoiceToCancel.id, {
        status: 'cancelled',
        cancellationReason: finalReason,
        cancelledAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 3. Revert stock for inventory products
      if (invoiceToCancel.items && invoiceToCancel.items.length > 0) {
        for (const item of invoiceToCancel.items) {
          if (item.productId) {
            const prod = await db.products.get(item.productId);
            if (prod) {
              const previousStock = prod.currentStock;
              const newStock = previousStock + item.quantity;
              await db.products.update(item.productId, { currentStock: newStock });
              await db.stockLogs.add({
                productId: item.productId,
                productName: prod.name,
                type: 'in',
                quantity: item.quantity,
                previousStock,
                newStock,
                reference: `Cancelled ${invoiceToCancel.invoiceNumber}`,
                referenceType: 'invoice',
                date: Date.now(),
              });
            }
          }
        }
      }

      toast.success(
        autoDownloadPDF
          ? `Invoice ${invoiceToCancel.invoiceNumber} cancelled & archived PDF downloaded`
          : `Invoice ${invoiceToCancel.invoiceNumber} marked as cancelled`,
        { id: 'cancel-op' }
      );

      setInvoiceToCancel(null);
    } catch (err) {
      console.error('Cancellation failed:', err);
      toast.error('Failed to cancel invoice', { id: 'cancel-op' });
    } finally {
      setIsCancelling(false);
    }
  };

  // Permanent Delete for already-cancelled invoices
  const handlePermanentDelete = (id: number, invoiceNumber: string) => {
    showConfirm({
      title: 'Purge Cancelled Invoice Record',
      message: `Permanently delete invoice ${invoiceNumber} from the database? This cannot be undone.`,
      confirmLabel: 'Purge Record',
      cancelLabel: 'Keep Archived',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await db.invoices.delete(id);
          toast.success(`Invoice ${invoiceNumber} permanently removed`);
        } catch {
          toast.error('Failed to delete invoice');
        }
      }
    });
  };

  const handleConvertToPurchaseInvoice = async (poInvoice: Invoice) => {
    try {
      const now = Date.now();
      await db.invoices.update(poInvoice.id!, {
        invoiceType: 'purchase_invoice',
        notes: (poInvoice.notes ? poInvoice.notes + ' | ' : '') + `Converted from PO on ${new Date(now).toLocaleDateString()}`,
        updatedAt: now,
      });

      let stockedCount = 0;
      for (const item of poInvoice.items || []) {
        let prod = null;
        if (item.productId) {
          prod = await db.products.get(item.productId);
        }
        if (!prod && item.description) {
          prod = await db.products.where('name').equals(item.description).first();
        }

        if (prod && prod.id) {
          const prevStock = prod.currentStock;
          const newStock = prevStock + (item.quantity || 1);
          await db.products.update(prod.id, {
            currentStock: newStock,
            updatedAt: now,
          });
          await db.stockLogs.add({
            productId: prod.id,
            productName: prod.name,
            type: 'in',
            quantity: item.quantity || 1,
            previousStock: prevStock,
            newStock,
            reference: poInvoice.invoiceNumber,
            referenceType: 'purchase_invoice',
            date: now,
          });
          stockedCount++;
        }
      }

      toast.success(`PO ${poInvoice.invoiceNumber} converted to Purchase Invoice! ${stockedCount} products stocked up.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert purchase order');
    }
  };

  const getStatusBadge = (inv: Invoice) => {
    if (inv.status === 'cancelled') {
      return (
        <span 
          title={inv.cancellationReason ? `Reason: ${inv.cancellationReason}` : 'Cancelled bill'}
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider text-rose-500 bg-rose-50 border border-rose-200 uppercase shadow-2xs"
        >
          CANCELLED
        </span>
      );
    }

    switch (inv.status) {
      case 'paid':
        return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'partial':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Partial</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Overdue</Badge>;
      default:
        return <Badge variant="outline"><FileText className="h-3 w-3 mr-1" /> Draft</Badge>;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground text-sm">
            Total {stats.count} invoices · {formatCurrency(stats.pendingAmount)} pending
            {stats.cancelledCount > 0 && (
              <span className="text-rose-500 font-medium ml-1.5">
                ({stats.cancelledCount} cancelled)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/invoices/create" passHref>
            <Button
              size="sm"
              className="h-9 rounded-xl gap-2 font-bold text-xs bg-linear-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-white px-4 shadow-sm shadow-primary/25 border border-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Sales Invoiced</p>
              <h3 className="text-xl font-bold mt-1 font-mono text-primary dark:text-foreground">{formatCurrency(stats.totalSales)}</h3>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-md">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Collected Amount</p>
              <h3 className="text-xl font-bold mt-1 font-mono text-secondary">{formatCurrency(stats.paidAmount)}</h3>
            </div>
            <div className="p-2.5 bg-secondary/10 text-secondary rounded-md">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Pending Balance Due</p>
              <h3 className="text-xl font-bold mt-1 font-mono text-destructive">{formatCurrency(stats.pendingAmount)}</h3>
            </div>
            <div className="p-2.5 bg-destructive/10 text-destructive rounded-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(INVOICE_TYPE_LABELS).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoices Table Card */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-[#f1f5f9] dark:bg-muted/30">
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Invoice No</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Date</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Customer</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden md:table-cell">Type</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Total Amount</th>
                  <th className="text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Balance Due</th>
                  <th className="text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No invoices found</p>
                      <p className="text-sm text-muted-foreground mt-1">Create your first invoice to begin billing customers</p>
                      <Link href="/invoices/create" passHref>
                        <Button size="sm" className="mt-4">
                          <Plus className="h-4 w-4 mr-1.5" /> Create Invoice
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isCancelled = inv.status === 'cancelled';
                    return (
                      <tr 
                        key={inv.id} 
                        className={
                          isCancelled
                            ? "border-b border-rose-200/60 bg-rose-50/70 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 transition-colors"
                            : "border-b last:border-0 hover:bg-[#f8f9ff]/80 dark:hover:bg-muted/20 transition-colors group"
                        }
                      >
                        <td className="py-3 px-4">
                          <Link 
                            href={`/invoices/${inv.id}`} 
                            className={`font-mono text-sm font-semibold hover:underline ${
                              isCancelled 
                                ? 'text-rose-700/80 line-through dark:text-rose-400' 
                                : 'text-primary dark:text-primary-fixed-dim'
                            }`}
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                          {formatDate(inv.date)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className={`font-semibold ${isCancelled ? 'text-slate-600 line-through decoration-rose-300 dark:text-slate-300' : 'text-slate-800 dark:text-slate-100'}`}>
                            {inv.customerName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {inv.customerGstin || 'No GSTIN'}
                          </div>
                          {isCancelled && inv.cancellationReason && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium italic mt-0.5 max-w-xs truncate" title={inv.cancellationReason}>
                              Reason: {inv.cancellationReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm hidden md:table-cell">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {INVOICE_TYPE_LABELS[inv.invoiceType]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(inv)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-semibold font-mono">
                          <span className={isCancelled ? 'text-slate-500 line-through decoration-rose-400' : ''}>
                            {formatCurrency(inv.totalAmount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-mono hidden sm:table-cell text-muted-foreground">
                          {isCancelled ? (
                            <span className="text-slate-400 line-through">₹0.00</span>
                          ) : (
                            <span className={inv.balanceDue > 0 ? 'text-destructive font-semibold' : ''}>
                              {formatCurrency(inv.balanceDue)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. View Button (Eye) */}
                            <Link href={`/invoices/${inv.id}`}>
                              <button 
                                className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shadow-2xs"
                                title="View invoice details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>

                            {/* 2. Print Button (Printer) */}
                            <button
                              onClick={() => handlePrintInvoice(inv)}
                              className="h-8 w-8 rounded-md border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors shadow-2xs"
                              title="Print invoice"
                            >
                              <Printer className="h-4 w-4" />
                            </button>

                            {/* 3. Download PDF Button (FileText) */}
                            <button
                              onClick={() => handleDownloadSinglePDF(inv)}
                              disabled={downloadingId === inv.id}
                              className="h-8 w-8 rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 flex items-center justify-center text-rose-500 dark:text-rose-400 transition-colors shadow-2xs disabled:opacity-50"
                              title="Download PDF copy"
                            >
                              {downloadingId === inv.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </button>

                            {/* 4. WhatsApp Due Reminder Button (for pending dues) */}
                            {inv.balanceDue > 0 && !isCancelled && (
                              <button
                                onClick={() => setReminderInvoice(inv)}
                                className="h-8 w-8 rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-colors shadow-2xs"
                                title="Send WhatsApp payment reminder with UPI link"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            )}

                            {/* 4b. Purchase Order Stock-Up Shortcut */}
                            {inv.invoiceType === 'purchase_order' && !isCancelled && (
                              <button
                                onClick={() => handleConvertToPurchaseInvoice(inv)}
                                className="h-8 px-2 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1 text-[11px] font-bold shadow-2xs hover:bg-emerald-100 transition-colors"
                                title="Convert PO to Purchase Invoice & Stock Up"
                              >
                                <PackageCheck className="h-3.5 w-3.5" /> Stock Up
                              </button>
                            )}

                            {/* 4c. E-Way Bill JSON Button (Invoices >= ₹50,000) */}
                            {inv.totalAmount >= 50000 && !isCancelled && (
                              <button
                                onClick={() => {
                                  const payload = generateEWayBillJSON(inv, settings);
                                  downloadJsonFile(payload, `EWayBill_${inv.invoiceNumber}.json`);
                                  toast.success(`E-Way Bill JSON generated for ${inv.invoiceNumber}`);
                                }}
                                className="h-8 w-8 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center shadow-2xs hover:bg-amber-100 transition-colors"
                                title="Download E-Way Bill JSON for ewaybillgst.gov.in"
                              >
                                <FileCode className="h-4 w-4" />
                              </button>
                            )}

                            {/* 5. Delete / Cancel Button */}
                            {isCancelled ? (
                              <button
                                onClick={() => inv.id && executeWithCashierProtection(() => handlePermanentDelete(inv.id!, inv.invoiceNumber))}
                                className="h-8 w-8 rounded-md hover:bg-rose-100/60 dark:hover:bg-rose-900/40 text-rose-400 hover:text-rose-700 flex items-center justify-center transition-colors"
                                title="Purge cancelled record permanently"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => executeWithCashierProtection(() => handleOpenCancelModal(inv))}
                                className="h-8 w-8 rounded-md hover:bg-rose-100/60 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                                title="Cancel & Delete Invoice (with auto-download)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Cancellation & Audit Reason Modal */}
      <Dialog open={!!invoiceToCancel} onOpenChange={(open) => !open && setInvoiceToCancel(null)}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/50">
                <Ban className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Cancel &amp; Archive Invoice #{invoiceToCancel?.invoiceNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Under GST compliance, bills are voided with a verified cancellation reason and an archived copy is automatically downloaded.
            </DialogDescription>
          </DialogHeader>

          {invoiceToCancel && (
            <div className="space-y-4 py-2">
              {/* Invoice Summary Card */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    {invoiceToCancel.customerName}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {formatDate(invoiceToCancel.date)} · {invoiceToCancel.items?.length || 0} item(s)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Bill Total</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {formatCurrency(invoiceToCancel.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Reason Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Cancellation Reason <span className="text-rose-500">*</span>
                </Label>
                <div className="space-y-1.5">
                  {CANCELLATION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        selectedReason === reason
                          ? 'border-rose-400 bg-rose-50/70 text-rose-900 font-semibold dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-800'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Remarks Textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Additional Notes / Audit Remarks (Optional)
                </Label>
                <Textarea
                  placeholder="Explain why this invoice is being voided or deleted..."
                  value={customReasonNotes}
                  onChange={(e) => setCustomReasonNotes(e.target.value)}
                  className="text-xs min-h-15 resize-none"
                />
              </div>

              {/* Auto Download Option */}
              <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="autoDownload"
                  checked={autoDownloadPDF}
                  onChange={(e) => setAutoDownloadPDF(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="autoDownload" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-blue-900 dark:text-blue-200 block">
                    Automatically download archived PDF bill
                  </span>
                  <span className="text-blue-700/80 dark:text-blue-300/80 text-[11px] block mt-0.5">
                    Generates a marked &apos;CANCELLED&apos; PDF with timestamp &amp; audit reason for your tax files.
                  </span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCancelling}
              onClick={() => setInvoiceToCancel(null)}
              className="text-xs"
            >
              Keep Active
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isCancelling}
              onClick={handleConfirmCancellation}
              className="text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cancelling &amp; Archiving...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Confirm Cancellation &amp; Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Payment Reminder Modal */}
      <WhatsAppDueReminderModal
        open={!!reminderInvoice}
        onOpenChange={(open) => !open && setReminderInvoice(null)}
        invoice={reminderInvoice}
      />

      {/* Cashier Mode Staff Lock PIN Dialog */}
      <Dialog open={cashierPinPromptOpen} onOpenChange={setCashierPinPromptOpen}>
        <DialogContent className="max-w-xs">
          <form onSubmit={handleVerifyCashierPin}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Lock className="h-4 w-4 text-rose-500" /> Owner Authorization Required
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cashier lock mode is active. Deleting or cancelling invoices requires the Owner PIN.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <Label htmlFor="cashier-pin-input" className="text-xs font-semibold">Enter 4-Digit Owner PIN</Label>
              <Input
                id="cashier-pin-input"
                type="password"
                maxLength={6}
                value={cashierEnteredPin}
                onChange={(e) => setCashierEnteredPin(e.target.value)}
                placeholder="PIN"
                className="font-mono text-center tracking-widest text-lg"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCashierPinPromptOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-bold bg-primary text-white">
                Authorize
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
