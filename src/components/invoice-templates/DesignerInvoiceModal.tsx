'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Check, Palette, FileText, Stamp, QrCode } from 'lucide-react';
import { PdfDocumentIcon } from '@/components/shared/PdfDocumentIcon';
import { pdf } from '@react-pdf/renderer';
import { PDFTemplateSelector } from './PDFTemplates';
import { toast } from 'sonner';
import type { Invoice, AppSettings } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DesignerInvoiceModalProps {
  invoice: Invoice;
  settings: AppSettings;
  qrCodeDataUrl?: string;
  trigger?: React.ReactNode;
}

const COLOR_THEMES = [
  { id: 'blue', name: 'Sapphire Modern', hex: '#2563eb', bg: 'bg-blue-600' },
  { id: 'emerald', name: 'Emerald Corporate', hex: '#059669', bg: 'bg-emerald-600' },
  { id: 'slate', name: 'Monochrome Slate', hex: '#0f172a', bg: 'bg-slate-900' },
  { id: 'purple', name: 'Royal Violet', hex: '#7c3aed', bg: 'bg-purple-600' },
  { id: 'crimson', name: 'Executive Crimson', hex: '#dc2626', bg: 'bg-red-600' },
];

const TITLES = [
  'TAX INVOICE',
  'ORIGINAL FOR RECIPIENT',
  'DUPLICATE FOR TRANSPORTER',
  'COMMERCIAL INVOICE',
  'BILL OF SUPPLY',
];

export function DesignerInvoiceModal({
  invoice,
  settings,
  qrCodeDataUrl,
  trigger,
}: DesignerInvoiceModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLOR_THEMES[0]);
  const [documentTitle, setDocumentTitle] = useState(TITLES[0]);
  const [selectedTemplate, setSelectedTemplate] = useState('premium');
  const [generating, setGenerating] = useState(false);

  const handleDownloadDesignerPDF = async () => {
    if (generating) return;
    setGenerating(true);
    const toastId = toast.loading('Compiling Designer PDF Invoice...');

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
      const fileName = `${documentTitle.replace(/\s+/g, '_')}_${invoice.invoiceNumber}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success('Designer Invoice PDF downloaded successfully!');
      setOpen(false);
    } catch (err) {
      console.error('Failed to generate designer invoice PDF:', err);
      toast.dismiss(toastId);
      toast.error('Failed to generate PDF invoice');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold h-10 border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 text-primary gap-2 shrink-0 shadow-xs"
          >
            <PdfDocumentIcon className="h-4.5 w-4.5 text-primary shrink-0" />
            <span>Export Designer PDF</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <PdfDocumentIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Export Designer Invoice PDF
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                High-fidelity vector PDF with customized typography and formatting
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Document Header Copy */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Document Header Title
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocumentTitle(t)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    documentTitle === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Template Design */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              PDF Layout Architecture
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'premium', label: 'Premium Modern' },
                { id: 'tata', label: 'Tata Industrial' },
                { id: 'amazon', label: 'Amazon Clean' },
                { id: 'ltim', label: 'Enterprise Blue' },
                { id: 'unilever', label: 'Unilever Boxed' },
                { id: 'itc', label: 'ITC Logistics' },
                { id: 'bigbazaar', label: 'Retail Supermarket' },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`text-left p-2 rounded-xl border text-xs font-semibold transition-all ${
                    selectedTemplate === tmpl.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-foreground'
                      : 'border-border/50 text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  <p className="font-bold text-foreground">{tmpl.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Features preview */}
          <div className="p-3 rounded-xl border border-border/40 bg-muted/15 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Invoice No:</span>
              <span className="font-bold font-mono text-foreground">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Billed Amount:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                INR {Number(invoice.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">UPI QR & Bank Info:</span>
              <span className="font-bold text-primary">Included</span>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadDesignerPDF}
            disabled={generating}
            className="gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md"
          >
            <Download className="h-4 w-4" />
            {generating ? 'Compiling PDF...' : 'Download Designer PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
