'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { InvoiceTemplateSelector } from '@/components/invoice-templates/InvoiceTemplates';
import { PDFTemplateSelector } from '@/components/invoice-templates/PDFTemplates';
import { DesignerInvoiceModal } from '@/components/invoice-templates/DesignerInvoiceModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  ArrowLeft, Printer, Download, Share2, Mail, Send, ChevronRight, Edit3, Settings2, FileText, Check, Ban, AlertTriangle, Loader2, FileCode, PackageCheck, Building2
} from 'lucide-react';
import { PdfDocumentIcon } from '@/components/shared/PdfDocumentIcon';
import { toast } from 'sonner';
import type { Invoice, AppSettings } from '@/types';
import { generateEWayBillJSON, generateEInvoiceJSON, downloadJsonFile } from '@/lib/gstCompliance';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InvoiceDetailPage({ params }: PageProps) {
  const router = useRouter();
  
  // Resolve params using React.use()
  const resolvedParams = use(params);
  const invoiceId = parseInt(resolvedParams.id, 10);

  const invoice = useLiveQuery(() => db.invoices.get(invoiceId), [invoiceId]);
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  const [selectedTemplate, setSelectedTemplate] = useState<string>('premium');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [sharing, setSharing] = useState<boolean>(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Customer cancelled order / Returned goods');
  const [customReasonNotes, setCustomReasonNotes] = useState<string>('');
  const [autoDownloadOnCancel, setAutoDownloadOnCancel] = useState<boolean>(true);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Auto-print when navigated with ?print=true
  useEffect(() => {
    if (invoice && settings && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('print') === 'true') {
        const timer = setTimeout(() => {
          window.print();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [invoice, settings]);

  // Set default template from app settings when loaded
  useEffect(() => {
    if (settings?.defaultTemplate) {
      setSelectedTemplate(settings.defaultTemplate);
    }
  }, [settings]);

  // Convert QRCode canvas to data URL for react-pdf renderer
  useEffect(() => {
    if (!invoice || !settings) return;

    // Timeout to ensure canvas draws before reading
    const timer = setTimeout(() => {
      const canvas = document.getElementById('hidden-upi-qr') as HTMLCanvasElement;
      if (canvas) {
        try {
          const url = canvas.toDataURL('image/png');
          setQrCodeDataUrl(url);
        } catch (err) {
          console.error('Failed to convert QR code canvas to data URL:', err);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [invoice, settings]);

  if (!invoice || !settings) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-3">
        <FileText className="h-10 w-10 text-muted-foreground animate-pulse" />
        <p className="text-muted-foreground font-medium">Loading Invoice Details...</p>
      </div>
    );
  }

  const upiString = settings.upiId
    ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.companyName)}&am=${invoice.totalAmount}&cu=INR`
    : '';

  // Share PDF logic
  const sharePDF = async (method: 'whatsapp' | 'email') => {
    if (sharing) return;
    setSharing(true);
    const toastId = toast.loading('Compiling PDF invoice...');

    try {
      const doc = (
        <PDFTemplateSelector
          templateName={selectedTemplate}
          invoice={invoice}
          settings={settings}
          qrCodeDataUrl={qrCodeDataUrl}
        />
      );

      const blob = await pdf(doc).toBlob();
      const fileName = `Invoice_${invoice.invoiceNumber}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // Check if Web Share API with files is supported (e.g., mobile Safari / Chrome)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        toast.dismiss(toastId);
        await navigator.share({
          files: [file],
          title: `Invoice ${invoice.invoiceNumber} - ${settings.companyName}`,
          text: `Hello, please find the attached PDF invoice ${invoice.invoiceNumber} from ${settings.companyName}.`
        });
        toast.success('Invoice shared successfully!');
        setSharing(false);
        return;
      }

      // Fallback: download PDF and redirect to messaging URL
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.dismiss(toastId);
      toast.success('Invoice downloaded automatically. Directing to share page...');

      if (method === 'whatsapp') {
        const message = `Hello, please find details for Invoice ${invoice.invoiceNumber} from ${settings.companyName}.\nTotal Amount: ${formatCurrency(invoice.totalAmount)}.\nBalance Due: ${formatCurrency(invoice.balanceDue)}.\n\nNote: The PDF bill has been downloaded to your device. Please attach it here.`;
        const rawDigits = (invoice.customerPhone || '').replace(/\D/g, '');
        const targetPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
        const waUrl = targetPhone
          ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
          : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
      } else {
        const emailTo = invoice.customerEmail || '';
        const subject = `Invoice ${invoice.invoiceNumber} - ${settings.companyName}`;
        const body = `Hello ${invoice.customerName},\n\nPlease find the billing details for Invoice ${invoice.invoiceNumber}.\n\nTotal Amount: ${formatCurrency(invoice.totalAmount)}\nBalance Due: ${formatCurrency(invoice.balanceDue)}\nPayment Mode: ${invoice.paymentMode}\n\nNote: The PDF bill has been downloaded to your device. Please attach the file to this email.\n\nThank you for your business!\n\nBest regards,\n${settings.companyName}`;
        window.location.href = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    } catch (err) {
      console.error('Failed to share PDF:', err);
      toast.dismiss(toastId);
      toast.error('Failed to generate or share PDF invoice');
    } finally {
      setSharing(false);
    }
  };

  // Browser Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Confirm Cancellation with Audit Reason and Auto-Download
  const handleConfirmCancellation = async () => {
    if (!invoice || !invoice.id) return;
    setIsCancelling(true);

    const finalReason = cancelReason === 'Other custom reason'
      ? (customReasonNotes.trim() || 'Voided by user')
      : (customReasonNotes.trim() ? `${cancelReason} - ${customReasonNotes.trim()}` : cancelReason);

    const cancelledInvoice: Invoice = {
      ...invoice,
      status: 'cancelled',
      cancellationReason: finalReason,
      cancelledAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (autoDownloadOnCancel) {
        toast.loading('Generating & auto-downloading archived invoice...', { id: 'cancel-op' });
        const doc = (
          <PDFTemplateSelector
            templateName={selectedTemplate}
            invoice={cancelledInvoice}
            settings={settings}
            qrCodeDataUrl={qrCodeDataUrl}
          />
        );
        const blob = await pdf(doc).toBlob();
        const fileName = `CANCELLED_Invoice_${invoice.invoiceNumber}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      await db.invoices.update(invoice.id, {
        status: 'cancelled',
        cancellationReason: finalReason,
        cancelledAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
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
                reference: `Cancelled ${invoice.invoiceNumber}`,
                referenceType: 'invoice',
                date: Date.now(),
              });
            }
          }
        }
      }

      toast.success(
        autoDownloadOnCancel
          ? `Invoice ${invoice.invoiceNumber} cancelled & archived PDF downloaded`
          : `Invoice ${invoice.invoiceNumber} marked as cancelled`,
        { id: 'cancel-op' }
      );
      setShowCancelModal(false);
    } catch (err) {
      console.error('Cancellation failed:', err);
      toast.error('Failed to cancel invoice', { id: 'cancel-op' });
    } finally {
      setIsCancelling(false);
    }
  };

  // Convert PO directly to Purchase Invoice & Stock Up
  const handleConvertToPurchaseInvoice = async () => {
    if (!invoice) return;
    try {
      const now = Date.now();
      await db.invoices.update(invoice.id!, {
        invoiceType: 'purchase_invoice',
        notes: (invoice.notes ? invoice.notes + ' | ' : '') + `Converted from PO on ${new Date(now).toLocaleDateString()}`,
        updatedAt: now,
      });

      let stockedCount = 0;
      for (const item of invoice.items || []) {
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
            reference: invoice.invoiceNumber,
            referenceType: 'purchase_invoice',
            date: now,
          });
          stockedCount++;
        }
      }

      toast.success(
        `Purchase Order converted to Purchase Invoice! ${stockedCount} product items stocked up into inventory.`
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert Purchase Order to stock');
    }
  };

  // Export official E-Way Bill JSON
  const handleExportEWayBill = () => {
    if (!invoice) return;
    try {
      const payload = generateEWayBillJSON(invoice, settings);
      downloadJsonFile(payload, `EWayBill_${invoice.invoiceNumber}.json`);
      toast.success('Official E-Way Bill JSON downloaded ready for ewaybillgst.gov.in');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate E-Way Bill JSON');
    }
  };

  // Export official E-Invoice IRN JSON
  const handleExportEInvoice = () => {
    if (!invoice) return;
    try {
      const payload = generateEInvoiceJSON(invoice, settings);
      downloadJsonFile(payload, `EInvoice_IRN_${invoice.invoiceNumber}.json`);
      toast.success('Official E-Invoice (IRN) JSON downloaded ready for einvoice1.gst.gov.in');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate E-Invoice JSON');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-300">
      {/* Hidden QR Code canvas for generating PNG for PDF generator */}
      <div style={{ display: 'none' }} ref={qrRef}>
        {upiString && (
          <QRCodeCanvas
            id="hidden-upi-qr"
            value={upiString}
            size={120}
            level="M"
          />
        )}
      </div>

      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3 no-print">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/invoices" className="hover:underline">Invoices</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-mono font-semibold">{invoice.invoiceNumber}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight mt-0.5">View Invoice Details</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Hand Options Panel */}
        <div className="lg:col-span-4 space-y-4 no-print">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-bold text-sm tracking-tight mb-3 flex items-center gap-1.5 text-slate-800 dark:text-slate-200 border-b pb-2">
                  <Settings2 className="h-4 w-4 text-primary" /> Invoice Configuration
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Select Invoice Design</label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amazon">Template 1: Amazon-Like</SelectItem>
                        <SelectItem value="ltim">Template 2: LTIMindtree-Like</SelectItem>
                        <SelectItem value="unilever">Template 3: Unilever-Like</SelectItem>
                        <SelectItem value="itc">Template 4: ITC-Like</SelectItem>
                        <SelectItem value="bigbazaar">Template 5: Big Bazaar-Like</SelectItem>
                        <SelectItem value="premium">Template 6: Premium Default</SelectItem>
                        <SelectItem value="tata">Template 7: Tata-Like Structured</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Main action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="w-full flex items-center gap-1.5" onClick={handlePrint}>
                  <Printer className="h-4 w-4" /> Print
                </Button>

                {/* React-PDF download link */}
                <PDFDownloadLink
                  document={
                    <PDFTemplateSelector
                      templateName={selectedTemplate}
                      invoice={invoice}
                      settings={settings}
                      qrCodeDataUrl={qrCodeDataUrl}
                    />
                  }
                  fileName={`Invoice_${invoice.invoiceNumber}.pdf`}
                >
                  {/* @ts-ignore */}
                  {({ loading }) => (
                    <Button disabled={loading} className="w-full flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                      <Download className="h-4 w-4" /> {loading ? 'Compiling...' : 'Quick PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>

              {/* Designer PDF Button */}
              <div className="pt-1">
                <DesignerInvoiceModal
                  invoice={invoice}
                  settings={settings}
                  qrCodeDataUrl={qrCodeDataUrl}
                  trigger={
                    <Button className="w-full flex items-center justify-center gap-2 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                      <PdfDocumentIcon className="h-4.5 w-4.5" />
                      Export Designer PDF
                    </Button>
                  }
                />
              </div>

              {/* Purchase Order (PO) to Stock Conversion Shortcut */}
              {invoice.invoiceType === 'purchase_order' && (
                <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <PackageCheck className="h-4 w-4" /> Purchase Order (PO)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    When supplier goods arrive, convert this PO directly to a Purchase Invoice to increment inventory stock.
                  </p>
                  <Button
                    onClick={handleConvertToPurchaseInvoice}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-9 rounded-xl shadow-xs"
                  >
                    <PackageCheck className="h-4 w-4" /> Convert to Purchase Bill & Stock Up
                  </Button>
                </div>
              )}

              {/* Government Compliance: Official E-Way Bill & E-Invoice JSON */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Govt GST Compliance
                  </h4>
                  {invoice.totalAmount >= 50000 && (
                    <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                      Mandatory &gt; ₹50k
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    onClick={handleExportEWayBill}
                    className="w-full flex items-center justify-between text-xs font-semibold h-8 border-primary/30 text-primary hover:bg-primary/5 rounded-lg px-2.5"
                    title="Official JSON export for ewaybillgst.gov.in"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5" /> Export E-Way Bill JSON
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground font-bold">NIC Portal</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportEInvoice}
                    className="w-full flex items-center justify-between text-xs font-semibold h-8 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 rounded-lg px-2.5"
                    title="Official JSON export for einvoice1.gst.gov.in"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5" /> Export E-Invoice (IRN) JSON
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground font-bold">B2B Portal</span>
                  </Button>
                </div>
              </div>

              {/* Cancellation Action or Banner */}
              <div className="pt-2 border-t">
                {invoice.status === 'cancelled' ? (
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
                      <Ban className="h-4 w-4" /> Cancelled &amp; Voided
                    </div>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">
                      This bill was cancelled on {invoice.cancelledAt ? formatDate(invoice.cancelledAt) : 'audit date'}.
                    </p>
                    {invoice.cancellationReason && (
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded border border-rose-200 font-mono text-[11px]">
                        <span className="font-semibold text-rose-700">Audit Reason:</span> {invoice.cancellationReason}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold"
                  >
                    <Ban className="h-3.5 w-3.5" /> Cancel / Void Invoice
                  </Button>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Share Transaction</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button disabled={sharing} variant="outline" size="sm" className="w-full flex items-center gap-1.5 text-emerald-600 hover:bg-emerald-50" onClick={() => sharePDF('whatsapp')}>
                    <Send className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                  <Button disabled={sharing} variant="outline" size="sm" className="w-full flex items-center gap-1.5 text-indigo-600 hover:bg-indigo-50" onClick={() => sharePDF('email')}>
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Quick Ledger</h4>
              <table className="w-full text-xs text-slate-600 dark:text-slate-400">
                <tbody>
                  <tr className="border-b py-1.5 flex justify-between">
                    <td>Customer Name</td>
                    <td className="font-semibold text-slate-900 dark:text-slate-100">{invoice.customerName}</td>
                  </tr>
                  <tr className="border-b py-1.5 flex justify-between">
                    <td>Date Raised</td>
                    <td>{formatDate(invoice.date)}</td>
                  </tr>
                  <tr className="border-b py-1.5 flex justify-between">
                    <td>Net Amount</td>
                    <td className="font-bold text-primary">{formatCurrency(invoice.totalAmount)}</td>
                  </tr>
                  <tr className="border-b py-1.5 flex justify-between">
                    <td>Collected Paid</td>
                    <td className="text-emerald-600 font-semibold">{formatCurrency(invoice.paidAmount)}</td>
                  </tr>
                  <tr className="py-1.5 flex justify-between font-bold text-rose-500">
                    <td>Balance Due</td>
                    <td>{formatCurrency(invoice.balanceDue)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Right Hand Live Preview sheet */}
        <div className="lg:col-span-8 flex justify-center bg-muted/20 dark:bg-slate-900/40 p-4 rounded-xl border no-print-margin">
          <div className="w-full max-w-full overflow-x-auto print-full-width">
            <InvoiceTemplateSelector
              templateName={selectedTemplate}
              invoice={invoice}
              settings={settings}
            />
          </div>
        </div>
      </div>

      {/* Cancellation Dialog */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/50">
                <Ban className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Cancel &amp; Archive Invoice #{invoice?.invoiceNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Cancelling marks this invoice as voided in your books and automatically downloads the archived copy for GST tax records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Cancellation Reason</Label>
              <div className="space-y-1.5">
                {[
                  'Customer cancelled order / Returned goods',
                  'Data entry mistake / Duplicate invoice',
                  'Incorrect pricing or GST tax rate applied',
                  'Invoice amended / New revised bill re-issued',
                  'Other custom reason',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      cancelReason === reason
                        ? 'border-rose-400 bg-rose-50/70 text-rose-900 font-semibold dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-800'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReasonDetail"
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                      className="text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Audit Notes / Remarks (Optional)
              </Label>
              <Textarea
                placeholder="Remarks on why this invoice is being cancelled..."
                value={customReasonNotes}
                onChange={(e) => setCustomReasonNotes(e.target.value)}
                className="text-xs min-h-15 resize-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="autoDownloadDetail"
                checked={autoDownloadOnCancel}
                onChange={(e) => setAutoDownloadOnCancel(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="autoDownloadDetail" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-blue-900 dark:text-blue-200 block">
                  Automatically download archived PDF copy
                </span>
                <span className="text-blue-700/80 dark:text-blue-300/80 text-[11px] block mt-0.5">
                  Downloads an archived &apos;CANCELLED&apos; PDF invoice directly to your device.
                </span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCancelling}
              onClick={() => setShowCancelModal(false)}
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
              className="text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Confirm &amp; Download Bill
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
