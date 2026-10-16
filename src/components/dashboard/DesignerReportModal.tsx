'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, ShieldCheck, Printer, CheckCircle2, TrendingUp, Calculator, Receipt, BarChart3, Wallet, Layers } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { DesignerReportPDFDocument, DesignerReportData } from './DesignerReportPDF';
import { toast } from 'sonner';
import { PdfDocumentIcon } from '@/components/shared/PdfDocumentIcon';

interface DesignerReportModalProps {
  reportData: DesignerReportData;
}

export function DesignerReportModal({ reportData }: DesignerReportModalProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (generating) return;
    setGenerating(true);
    const toastId = toast.loading('Compiling multi-page Auditor Financial Report...');

    try {
      const customizedData: DesignerReportData = {
        ...reportData,
        themeColor: '#0f172a', // Enforce Charcoal Minimal / Professional Slate
      };

      const doc = <DesignerReportPDFDocument data={customizedData} />;
      const blob = await pdf(doc).toBlob();

      const fileName = `Auditor_Financial_Report_${reportData.periodLabel.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success('Auditor Financial Report downloaded successfully!');
      setOpen(false);
    } catch (err) {
      console.error('Failed to generate auditor PDF report:', err);
      toast.dismiss(toastId);
      toast.error('Failed to render PDF report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl font-bold h-10 border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 text-primary gap-2 shrink-0 shadow-xs"
        >
          <PdfDocumentIcon className="h-4.5 w-4.5 text-primary shrink-0" />
          <span>Export Auditor PDF</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-border/40 shadow-xs">
              <PdfDocumentIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Export Professional Auditor Report
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Multi-page statutory financial audit with vector graphs, unit economics &amp; reconciliation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Format Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-slate-900 dark:bg-slate-100" />
              <span className="font-bold text-slate-800 dark:text-slate-200">Format: Statutory Audit Model</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">
              Minimal Charcoal Palette
            </span>
          </div>

          {/* Report Inclusions Checklist Preview */}
          <div className="p-3.5 rounded-xl border border-border/40 bg-muted/15 space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              10-Page Statutory Audit Document Sections
            </span>
            <div className="space-y-1.5 text-xs text-foreground max-h-56 overflow-y-auto pr-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Page 1: Executive Auditor Summary &amp; Scorecard</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-medium">Page 2: Multi-Period Growth Matrix (MoM &amp; YoY)</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span className="font-medium">Page 3: Visual Performance Graphs &amp; Trajectories</span>
              </div>
              <div className="flex items-center gap-2">
                <Calculator className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="font-medium">Page 4: Unit Economics &amp; ₹100 Revenue Absorption Ribbon</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                <span className="font-medium">Page 5: Unit Economics Deep-Dive &amp; Product Margins</span>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="font-medium">Page 6: Itemized Sales Register &amp; Ledger (Tranche 1)</span>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="font-medium">Page 7: Sales Register Tranche 2 &amp; Reconciliation</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span className="font-medium">Page 8: GST Statutory Tax Audit (0-28% Slabs) &amp; Settlements</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span className="font-medium">Page 9: Operating Expense Schedule by Cost Center</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                <span className="font-medium">Page 10: Receivables Aging &amp; Statutory Attestation</span>
              </div>
            </div>
          </div>

          {/* Period Details */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 border-t pt-3">
            <span>Target Period: <strong className="text-foreground">{reportData.periodLabel}</strong></span>
            <span>Entity: <strong className="text-foreground">{reportData.settings.companyName || 'My Business'}</strong></span>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={generating}
            className="gap-2 font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 rounded-xl shadow-md"
          >
            <Download className="h-4 w-4" />
            {generating ? 'Compiling Multi-Page PDF...' : 'Download Auditor Report (PDF)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
