'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Expense } from '@/types';
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Wallet, Plus, Search, Edit3, Trash2, Calendar, FileText, Upload, Camera, Eye, X, Download, Image as ImageIcon, CheckCircle2, RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const emptyExpense: Partial<Expense> = {
  category: 'Rent',
  amount: 0,
  description: '',
  paymentMode: 'Cash',
  reference: '',
  receiptImage: undefined,
  receiptName: undefined,
  receiptType: undefined,
};

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>(emptyExpense);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Auto-open Add Expense modal when arriving from shortcut links
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'add') {
        setFormData({ ...emptyExpense });
        setIsEditing(false);
        setDialogOpen(true);
      }
    }
  }, []);

  // File & Camera Proof states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Expense | null>(null);

  // Live Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? [];

  // Filter & Search
  const filteredExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => b.date - a.date)
      .filter(ex => {
        const matchesSearch = !search ||
          (ex.description?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (ex.reference?.toLowerCase().includes(search.toLowerCase()) ?? false);
        const matchesCategory = categoryFilter === 'all' || ex.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
  }, [expenses, search, categoryFilter]);

  const totalExpenseSum = useMemo(() => {
    return filteredExpenses.reduce((acc, ex) => acc + ex.amount, 0);
  }, [filteredExpenses]);

  // Clean up camera on unmount or dialog close
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback to native camera input on mobile/unsupported browsers
        cameraInputRef.current?.click();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Webcam stream error, falling back to camera input:', err);
      cameraInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setFormData(prev => ({
        ...prev,
        receiptImage: dataUrl,
        receiptName: `Bill-Scan-${Date.now().toString().slice(-6)}.jpg`,
        receiptType: 'image/jpeg',
      }));
      toast.success('Bill photo captured successfully!');
    }
    stopCamera();
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('File size exceeds 8MB limit. Please upload a smaller photo or PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData(prev => ({
        ...prev,
        receiptImage: result,
        receiptName: file.name,
        receiptType: file.type,
      }));
      toast.success(`Attached bill: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setFormData(prev => ({
      ...prev,
      receiptImage: undefined,
      receiptName: undefined,
      receiptType: undefined,
    }));
  };

  // Import Excel Handlers
  const handleImportExpenses = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
        const now = Date.now();

        const findField = (row: Record<string, unknown>, patterns: string[], defaultValue: any) => {
          const keys = Object.keys(row);
          for (const pattern of patterns) {
            const matchedKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pattern.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (matchedKey !== undefined && row[matchedKey] !== null && row[matchedKey] !== '') {
              return row[matchedKey];
            }
          }
          return defaultValue;
        };

        const parseNum = (val: any): number => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          const clean = String(val).replace(/[^0-9.-]/g, '');
          return parseFloat(clean) || 0;
        };

        const parseExcelDate = (val: any): number => {
          if (!val) return Date.now();
          if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000);
            return date.getTime();
          }
          const timestamp = Date.parse(String(val));
          return isNaN(timestamp) ? Date.now() : timestamp;
        };

        let importedCount = 0;
        for (const item of data) {
          const rawAmount = parseNum(findField(item, ['amount', 'cost', 'value', 'price', 'spent'], 0));
          if (rawAmount <= 0) continue;

          const rawCat = String(findField(item, ['category', 'type', 'expensecategory'], 'Rent'));
          const matchedCat = EXPENSE_CATEGORIES.find(c => c.toLowerCase() === rawCat.toLowerCase()) || 'Rent';

          const rawMode = String(findField(item, ['paymentmode', 'mode', 'method', 'paymentmethod'], 'Cash'));
          const matchedMode = PAYMENT_MODES.find(m => m.toLowerCase() === rawMode.toLowerCase()) || 'Cash';

          const rawDesc = String(findField(item, ['description', 'desc', 'remarks', 'notes', 'particulars'], 'Imported Expense'));
          const rawRef = String(findField(item, ['reference', 'ref', 'txnid', 'transactionid', 'chequeno'], ''));
          const rawDate = parseExcelDate(findField(item, ['date', 'time', 'timestamp', 'createdat'], Date.now()));

          await db.expenses.add({
            category: matchedCat as any,
            amount: rawAmount,
            description: rawDesc,
            paymentMode: matchedMode as any,
            reference: rawRef,
            date: rawDate,
            createdAt: now,
          });
          importedCount++;
        }

        toast.success(`Successfully imported ${importedCount} expenses!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsBinaryString(file);
  };

  const updateForm = (updates: Partial<Expense>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Form Handlers
  const openAdd = () => {
    setFormData({ ...emptyExpense, date: Date.now() });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setFormData({ ...expense });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Expense amount must be greater than 0');
      return;
    }

    try {
      const payload: Expense = {
        category: formData.category || 'Miscellaneous',
        amount: Number(formData.amount),
        description: formData.description || '',
        paymentMode: formData.paymentMode || 'Cash',
        reference: formData.reference || '',
        date: formData.date ? new Date(formData.date).getTime() : Date.now(),
        receiptImage: formData.receiptImage,
        receiptName: formData.receiptName,
        receiptType: formData.receiptType,
        createdAt: Date.now(),
      };

      if (isEditing && formData.id) {
        await db.expenses.update(formData.id, payload);
        toast.success('Expense updated with bill proof');
      } else {
        await db.expenses.add(payload);
        toast.success('Expense recorded with bill proof');
      }
      setDialogOpen(false);
      stopCamera();
    } catch {
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await db.expenses.delete(id);
      toast.success('Expense record deleted');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Failed to delete expense record');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-300">
      {/* Hidden File Inputs for Bill Upload & Direct Camera Snap */}
      <input
        type="file"
        ref={receiptFileRef}
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleReceiptFileChange}
      />
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleReceiptFileChange}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Expenses & Bill Proofs</h2>
          <p className="text-muted-foreground text-sm">
            Total {filteredExpenses.length} records · Spent {formatCurrency(totalExpenseSum)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportExpenses} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5">
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Button size="sm" onClick={openAdd} className="flex items-center gap-1.5 font-bold">
            <Plus className="h-4 w-4" /> Record Expense
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <Card className="border border-border/60">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtered Expenses Total</p>
            <h3 className="text-2xl font-black font-mono text-destructive mt-0.5">{formatCurrency(totalExpenseSum)}</h3>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table with Bill Proof Column */}
      <Card className="border border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-center py-3 px-4">Bill Proof</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Payment Mode</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Reference</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No expenses logged</p>
                      <p className="text-sm text-muted-foreground mt-1">Log office bills, rent, or utilities with receipt photos</p>
                      <Button size="sm" className="mt-4" onClick={openAdd}>
                        <Plus className="h-4 w-4 mr-1.5" /> Log Expense
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((ex) => (
                    <tr key={ex.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="py-3 px-4 text-sm font-medium font-mono text-foreground">
                        {formatDate(ex.date)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {ex.category}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {ex.description || 'No description'}
                      </td>
                      {/* Bill Proof Column */}
                      <td className="py-3 px-4 text-center">
                        {ex.receiptImage ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReceipt(ex)}
                            className="h-8 gap-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg px-2.5"
                            title="Click to view full bill proof"
                          >
                            <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                            <span>View Bill</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50 font-medium">
                            No proof
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm hidden md:table-cell text-muted-foreground">
                        {ex.paymentMode}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono hidden md:table-cell text-muted-foreground">
                        {ex.reference || '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-black font-mono text-destructive">
                        {formatCurrency(ex.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => openEdit(ex)} title="Edit Expense">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmId(ex.id!)} title="Delete Expense">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record / Edit Expense Dialog with Proof Attachment */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) stopCamera();
          setDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Expense Record' : 'Record Business Expense'}</DialogTitle>
            <DialogDescription>
              Log business expenditure details and attach bill or receipt proof.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date ? new Date(formData.date).toISOString().slice(0, 10) : ''}
                  onChange={e => updateForm({ date: new Date(e.target.value).getTime() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category || 'Rent'} onValueChange={v => updateForm({ category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input id="amount" type="number" step="0.01" value={formData.amount || ''} onChange={e => updateForm({ amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={formData.paymentMode || 'Cash'} onValueChange={v => updateForm({ paymentMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map(mode => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ref">Reference Code (Optional)</Label>
              <Input id="ref" value={formData.reference || ''} onChange={e => updateForm({ reference: e.target.value })} placeholder="UPI Ref, Cheque No, Invoice Number" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description / Remarks</Label>
              <Textarea id="desc" value={formData.description || ''} onChange={e => updateForm({ description: e.target.value })} placeholder="Vendor name, bill particulars, items purchased..." className="h-16 text-xs" />
            </div>

            {/* Bill Attachment / Photo Scan Section */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Bill / Receipt Proof</span>
                {formData.receiptImage && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px] normal-case">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Proof Attached
                  </span>
                )}
              </Label>

              {/* Live Web Camera Viewfinder */}
              {isCameraActive ? (
                <div className="p-3 rounded-xl border border-primary/40 bg-muted/50 space-y-3">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={stopCamera}>
                      Cancel Camera
                    </Button>
                    <Button type="button" size="sm" onClick={capturePhoto} className="gap-2 bg-primary font-bold">
                      <Camera className="h-4 w-4" /> Snap Bill Photo
                    </Button>
                  </div>
                </div>
              ) : formData.receiptImage ? (
                /* Attached Receipt Preview Card */
                <div className="p-3 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {formData.receiptType?.includes('image') || formData.receiptImage.startsWith('data:image') ? (
                      <img
                        src={formData.receiptImage}
                        alt="Bill Thumbnail"
                        className="h-12 w-12 rounded-lg object-cover border border-border/60 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}
                    <div className="overflow-hidden min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{formData.receiptName || 'Attached-Receipt.jpg'}</p>
                      <p className="text-[10px] text-muted-foreground">Proof recorded for audit</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={removeReceipt}
                      title="Remove bill proof"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Attachment Launchers: Upload vs Camera Photo */
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 text-xs font-semibold h-11 border-dashed border-border/80 hover:bg-muted"
                    onClick={() => receiptFileRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 text-primary" />
                    Upload Bill File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 text-xs font-semibold h-11 border-dashed border-border/80 hover:bg-muted"
                    onClick={startCamera}
                  >
                    <Camera className="h-4 w-4 text-emerald-600" />
                    Photo from Camera
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { stopCamera(); setDialogOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="font-bold">
              {isEditing ? 'Save Changes' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen High-Res Receipt Viewer Dialog */}
      <Dialog open={selectedReceipt !== null} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Bill Proof: {selectedReceipt?.description || selectedReceipt?.category}
            </DialogTitle>
            <DialogDescription>
              {selectedReceipt && (
                <span>
                  Date: {formatDate(selectedReceipt.date)} · Amount: {formatCurrency(selectedReceipt.amount)} · Mode: {selectedReceipt.paymentMode}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center">
            {selectedReceipt?.receiptImage && (
              selectedReceipt.receiptType?.includes('image') || selectedReceipt.receiptImage.startsWith('data:image') ? (
                <div className="rounded-xl overflow-hidden border border-border/70 max-h-[60vh] bg-black/5 flex items-center justify-center p-2">
                  <img
                    src={selectedReceipt.receiptImage}
                    alt="Receipt Proof"
                    className="max-h-[55vh] w-auto object-contain rounded-lg shadow-sm"
                  />
                </div>
              ) : (
                <div className="p-8 text-center space-y-3 bg-muted/30 rounded-xl border border-border/60 w-full">
                  <FileText className="h-16 w-16 text-primary mx-auto" />
                  <p className="text-sm font-bold text-foreground">{selectedReceipt.receiptName || 'PDF Document'}</p>
                  <Button asChild size="sm" className="gap-2">
                    <a href={selectedReceipt.receiptImage} download={selectedReceipt.receiptName || 'expense-bill.pdf'}>
                      <Download className="h-4 w-4" /> Download PDF Bill
                    </a>
                  </Button>
                </div>
              )
            )}
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            {selectedReceipt?.receiptImage && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={selectedReceipt.receiptImage} download={selectedReceipt.receiptName || 'expense-proof.jpg'}>
                  <Download className="h-4 w-4" /> Download Proof
                </a>
              </Button>
            )}
            <Button onClick={() => setSelectedReceipt(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense Record?</DialogTitle>
            <DialogDescription>This will permanently delete this logged expense and attached receipt proof.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
