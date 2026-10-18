'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { AppSettings } from '@/types';
import { INDIAN_STATES } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Store, CreditCard, Receipt, Database, Upload, Download, Save, Image as ImageIcon, CheckCircle, RefreshCcw,
  Sparkles, ShoppingBag, Briefcase, Layers, Truck, Factory, Maximize2, Eye, ZoomIn, ZoomOut, Check, FileText,
  Palette, Moon, Sun, Monitor, Shield, Key, Lock, Unlock, CheckCircle2, Award, Coins, FileJson, AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { InvoiceTemplateSelector } from '@/components/invoice-templates/InvoiceTemplates';
import type { Invoice } from '@/types';
import { toast } from 'sonner';
import { ImageCropper } from '@/components/ImageCropper';
import { useAppStore } from '@/store/useAppStore';
import { InvoiceProMark } from '@/components/layout/Logo';
import { BrandTemplateLogo } from '@/components/layout/BrandLogos';

const INVOICE_TEMPLATES = [
  {
    id: 'premium',
    name: 'Template 1: Premium Executive',
    subtitle: 'Contemporary Modern',
    category: 'Corporate & Services',
    badge: 'Popular',
    icon: Sparkles,
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    description: 'Executive aesthetic with elegant address cards, rounded headers, and high-visibility net payable totals.',
  },
  {
    id: 'tata',
    name: 'Template 2: Tata-Style Structured',
    subtitle: 'Industrial Standard',
    category: 'Manufacturing & B2B GST',
    badge: 'Enterprise GST',
    icon: Factory,
    badgeColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    description: 'The classic Indian heavy engineering invoice: 4-quadrant header, HSN tax breakdown matrix, consignee block, and full continuous borders.',
  },
  {
    id: 'amazon',
    name: 'Template 3: Amazon-Style',
    subtitle: 'E-Commerce Standard',
    category: 'Online & Retail Sales',
    badge: 'Clean B2C',
    icon: ShoppingBag,
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    description: 'Clean modern layout with dual shipping/billing address cards, itemized tax rates, and UPI payment block.',
  },
  {
    id: 'ltim',
    name: 'Template 4: LTIMindtree-Style',
    subtitle: 'Enterprise Blue',
    category: 'IT Consulting & Tech',
    badge: 'Professional',
    icon: Briefcase,
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    description: 'Corporate tech invoice with structured metadata, invoice headers, and corporate navy blue accents.',
  },
  {
    id: 'unilever',
    name: 'Template 5: Unilever-Style',
    subtitle: 'Boxed Grid Architecture',
    category: 'FMCG & Distribution',
    badge: 'High Density',
    icon: Layers,
    badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    description: 'Dense grid architecture with full-width enclosing borders and comprehensive GST tax tables for high volume lines.',
  },
  {
    id: 'itc',
    name: 'Template 6: ITC-Style',
    subtitle: 'Logistics & Agro Supply',
    category: 'Supply Chain & Heavy Trade',
    badge: 'Logistics',
    icon: Truck,
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    description: 'Structured enterprise billing featuring logistics metadata, transporter details, and solid framing.',
  },
  {
    id: 'bigbazaar',
    name: 'Template 7: Big Bazaar-Style',
    subtitle: 'Retail Supermarket POS',
    category: 'Grocery & Counter POS',
    badge: 'POS Receipt',
    icon: Store,
    badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    description: 'Retail supermarket receipt format with dashed line dividers, itemized savings, and payment counters.',
  },
];

const sampleInvoiceForPreview: Invoice = {
  id: 99999,
  invoiceNumber: 'INV-2026-0842',
  date: Date.now(),
  dueDate: Date.now() + 15 * 86400000,
  invoiceType: 'tax_invoice',
  customerId: 1,
  customerName: 'AeroTech Electronics & Systems Pvt Ltd',
  customerAddress: 'Plot 42, Tech Innovation Corridor, Phase II, Jaipur, Rajasthan - 302022',
  customerGstin: '08AABCA1234F1Z5',
  customerPhone: '+91 98765 43210',
  customerState: 'Rajasthan',
  supplierId: null,
  supplierName: '',
  supplierAddress: '',
  supplierGstin: '',
  paymentMode: 'Bank Transfer',
  status: 'paid',
  isReverseCharge: false,
  isTaxInclusive: false,
  items: [
    {
      productId: 101,
      description: 'Industrial Smart Controller X100 Pro',
      modelNumber: 'SC-X100-PRO',
      imeiOrSerialNo: 'SN: 8849201948201',
      hsnCode: '8537',
      quantity: 2,
      unit: 'NOS',
      rate: 18500,
      discount: 1000,
      discountType: 'amount',
      taxableAmount: 36000,
      gstRate: 18,
      cgst: 3240,
      sgst: 3240,
      igst: 0,
      total: 42480,
    },
    {
      productId: 102,
      description: 'Gigabit Optic Switch 24-Port Managed',
      modelNumber: 'FSW-24G-M',
      imeiOrSerialNo: 'SN: 9920184710293',
      hsnCode: '8517',
      quantity: 1,
      unit: 'NOS',
      rate: 8500,
      discount: 0,
      discountType: 'amount',
      taxableAmount: 8500,
      gstRate: 18,
      cgst: 765,
      sgst: 765,
      igst: 0,
      total: 10030,
    },
  ],
  subtotal: 44500,
  discount: 0,
  discountType: 'amount',
  taxableAmount: 44500,
  totalTax: 8010,
  cgst: 4005,
  sgst: 4005,
  igst: 0,
  roundOff: 0,
  totalAmount: 52510,
  paidAmount: 52510,
  balanceDue: 0,
  termsAndConditions: '1. Goods once sold will not be taken back.\n2. Warranty covers manufacturing defects only.',
  notes: 'Consignment packaged with tamper-evident industrial holographic security seals.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export default function SettingsPage() {
  const currentSettings = useLiveQuery(() => db.settings.toCollection().first());
  const latestInvoices = useLiveQuery(() => db.invoices.reverse().limit(1).toArray());
  const latestInvoice = latestInvoices?.[0];

  const { setSettings: setStoreSettings } = useSettingsStore();
  const { showConfirm } = useAppStore();

  const [activeTab, setActiveTab] = useState('company');
  const [formData, setFormData] = useState<Partial<AppSettings>>({});
  const [useRealData, setUseRealData] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(0.62);
  const [fullscreenModalOpen, setFullscreenModalOpen] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Check URL tab query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'backup' || tabParam === 'database') {
        setActiveTab('database');
      } else if (tabParam === 'template' || tabParam === 'invoice' || tabParam === 'templates') {
        setActiveTab('invoice');
      } else if (tabParam === 'appearance' || tabParam === 'theme') {
        setActiveTab('appearance');
      } else if (tabParam === 'bank' || tabParam === 'company') {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Crop modal state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');
  const [cropperField, setCropperField] = useState<'companyLogo' | 'companySignature'>('companyLogo');

  useEffect(() => {
    if (currentSettings) {
      setFormData(currentSettings);
    }
  }, [currentSettings]);

  const updateForm = (updates: Partial<AppSettings>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    try {
      const now = Date.now();
      const payload = {
        ...formData,
        companyName: formData.companyName || 'My Business',
      } as AppSettings;

      if (currentSettings?.id) {
        await db.settings.update(currentSettings.id, payload);
      } else {
        await db.settings.add(payload);
      }
      
      // Sync store state
      setStoreSettings(payload);
      toast.success('Settings saved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    }
  };

  // Image upload helpers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'companyLogo' | 'companySignature') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Support up to 5MB (5,242,880 bytes)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Upload an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setCropperSrc(reader.result);
        setCropperField(field);
        setCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // State for Import Restore Dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSnapshot, setImportSnapshot] = useState<any>(null);
  const [restoreMode, setRestoreMode] = useState<'clean' | 'merge'>('clean');
  const [isRestoring, setIsRestoring] = useState(false);

  // Database Backup (Full 13-Table Snapshot)
  const handleExportDB = async () => {
    try {
      const invoices = await db.invoices.toArray();
      const products = await db.products.toArray();
      const customers = await db.customers.toArray();
      const suppliers = await db.suppliers.toArray();
      const settingsData = await db.settings.toArray();
      const expenses = await db.expenses.toArray();
      const loans = await db.loans.toArray();
      const loanInstallments = await db.loanInstallments.toArray();
      const loanPayments = await db.loanPayments.toArray();
      const stockLogs = await db.stockLogs.toArray();
      const categories = await db.categories.toArray();
      const brands = await db.brands.toArray();
      const coupons = await db.coupons.toArray();

      const counts = {
        invoices: invoices.length,
        products: products.length,
        customers: customers.length,
        suppliers: suppliers.length,
        expenses: expenses.length,
        loans: loans.length,
        loanInstallments: loanInstallments.length,
        loanPayments: loanPayments.length,
        stockLogs: stockLogs.length,
        categories: categories.length,
        brands: brands.length,
        coupons: coupons.length,
      };

      const backupObj = {
        app: 'InvoicePro',
        version: 3,
        exportedAt: new Date().toISOString(),
        counts,
        data: {
          invoices,
          products,
          customers,
          suppliers,
          settings: settingsData,
          expenses,
          loans,
          loanInstallments,
          loanPayments,
          stockLogs,
          categories,
          brands,
          coupons,
        },
      };

      const str = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([str], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `InvoicePro_Complete_Backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await db.backupLogs.add({
        type: 'export',
        date: Date.now(),
        size: blob.size,
        status: 'success',
        notes: `Full snapshot exported (${invoices.length} inv, ${products.length} prod, ${customers.length} cust, ${loans.length} loans)`,
      });

      toast.success(`Complete snapshot exported successfully (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export backup');
    }
  };

  // Database Import File Handler with Preview Modal
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rawJson = JSON.parse(evt.target?.result as string);
        const data = rawJson.data || rawJson;

        const counts = {
          invoices: data.invoices?.length || 0,
          products: data.products?.length || 0,
          customers: data.customers?.length || 0,
          suppliers: data.suppliers?.length || 0,
          expenses: data.expenses?.length || 0,
          loans: data.loans?.length || 0,
          loanInstallments: data.loanInstallments?.length || 0,
          loanPayments: data.loanPayments?.length || 0,
          stockLogs: data.stockLogs?.length || 0,
          coupons: data.coupons?.length || 0,
          categories: data.categories?.length || 0,
          brands: data.brands?.length || 0,
        };

        setImportSnapshot({
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          exportedAt: rawJson.exportedAt || null,
          counts,
          data,
        });
        setImportDialogOpen(true);
      } catch {
        toast.error('Invalid backup file. Please provide a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = async () => {
    if (!importSnapshot || !importSnapshot.data) return;
    setIsRestoring(true);

    try {
      const data = importSnapshot.data;

      if (restoreMode === 'clean') {
        await db.invoices.clear();
        await db.products.clear();
        await db.customers.clear();
        await db.suppliers.clear();
        await db.expenses.clear();
        await db.loans.clear();
        await db.loanInstallments.clear();
        await db.loanPayments.clear();
        await db.stockLogs.clear();
        await db.categories.clear();
        await db.brands.clear();
        await db.coupons.clear();

        if (data.products?.length) await db.products.bulkAdd(data.products);
        if (data.customers?.length) await db.customers.bulkAdd(data.customers);
        if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);
        if (data.invoices?.length) await db.invoices.bulkAdd(data.invoices);
        if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);
        if (data.loans?.length) await db.loans.bulkAdd(data.loans);
        if (data.loanInstallments?.length) await db.loanInstallments.bulkAdd(data.loanInstallments);
        if (data.loanPayments?.length) await db.loanPayments.bulkAdd(data.loanPayments);
        if (data.stockLogs?.length) await db.stockLogs.bulkAdd(data.stockLogs);
        if (data.categories?.length) await db.categories.bulkAdd(data.categories);
        if (data.brands?.length) await db.brands.bulkAdd(data.brands);
        if (data.coupons?.length) await db.coupons.bulkAdd(data.coupons);
        if (data.settings?.length) {
          await db.settings.clear();
          await db.settings.bulkAdd(data.settings);
        }
      } else {
        if (data.products?.length) await db.products.bulkAdd(data.products.map((p: any) => { const copy = { ...p }; delete copy.id; return copy; }));
        if (data.customers?.length) await db.customers.bulkAdd(data.customers.map((c: any) => { const copy = { ...c }; delete copy.id; return copy; }));
        if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers.map((s: any) => { const copy = { ...s }; delete copy.id; return copy; }));
        if (data.invoices?.length) await db.invoices.bulkAdd(data.invoices.map((i: any) => { const copy = { ...i }; delete copy.id; return copy; }));
        if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses.map((e: any) => { const copy = { ...e }; delete copy.id; return copy; }));
        if (data.loans?.length) await db.loans.bulkAdd(data.loans.map((l: any) => { const copy = { ...l }; delete copy.id; return copy; }));
        if (data.coupons?.length) await db.coupons.bulkAdd(data.coupons.map((cp: any) => { const copy = { ...cp }; delete copy.id; return copy; }));
      }

      await db.backupLogs.add({
        type: 'import',
        date: Date.now(),
        size: 0,
        status: 'success',
        notes: `Restored snapshot (${restoreMode}) - ${importSnapshot.fileName}`,
      });

      toast.success('Database restored successfully! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete restore');
      setIsRestoring(false);
    }
  };

  const handleReset = () => {
    showConfirm({
      title: 'Wipe Database',
      message: 'Are you absolutely sure? This will wipe the database and reset the application.',
      confirmLabel: 'Wipe Everything',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        await db.delete();
        localStorage.clear();
        toast.success('Database deleted. Page reloading...');
        setTimeout(() => window.location.reload(), 1500);
      }
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-300">
      {/* Header with Official Vector Mark */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-card border border-border/60 flex items-center justify-center shrink-0 shadow-xs">
            {formData.companyLogo ? (
              <img src={formData.companyLogo} alt="Logo" className="h-7 w-7 object-contain" />
            ) : (
              <InvoiceProMark size={30} />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground text-sm">Configure store profile, brand identity, bank transfers, and backups</p>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} className="flex items-center gap-1.5 font-bold shadow-xs">
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="company" className="flex items-center gap-1.5"><Store className="h-4 w-4" /> Store Info</TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Bank & UPI</TabsTrigger>
          <TabsTrigger value="invoice" className="flex items-center gap-1.5"><Receipt className="h-4 w-4" /> Templates</TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-1.5"><Palette className="h-4 w-4" /> Themes & Dark Mode</TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Security & Loyalty</TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-1.5"><Database className="h-4 w-4" /> System & Backup</TabsTrigger>
        </TabsList>

        {/* Tab 1: Company Info */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>Fill in your business details exactly as they should appear on invoice headers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Registered Business Name *</Label>
                  <Input id="company-name" value={formData.companyName || ''} onChange={e => updateForm({ companyName: e.target.value })} placeholder="e.g., Acme Technologies" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-gstin">GSTIN Number</Label>
                  <Input id="company-gstin" value={formData.companyGstin || ''} onChange={e => updateForm({ companyGstin: e.target.value.toUpperCase() })} placeholder="15-digit GSTIN" className="font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="company-addr">Business Address</Label>
                  <Input id="company-addr" value={formData.companyAddress || ''} onChange={e => updateForm({ companyAddress: e.target.value })} placeholder="Street details" />
                </div>
                <div className="space-y-2">
                  <Label>Place of Business (State)</Label>
                  <Select value={formData.companyState || 'Rajasthan'} onValueChange={v => updateForm({ companyState: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-city">City</Label>
                  <Input id="company-city" value={formData.companyCity || ''} onChange={e => updateForm({ companyCity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-pin">Pincode</Label>
                  <Input id="company-pin" value={formData.companyPincode || ''} onChange={e => updateForm({ companyPincode: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone Number</Label>
                  <Input id="company-phone" value={formData.companyPhone || ''} onChange={e => updateForm({ companyPhone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email Address</Label>
                  <Input id="company-email" type="email" value={formData.companyEmail || ''} onChange={e => updateForm({ companyEmail: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-xs">Company Brand Logo (under 5MB)</Label>
                    <span className="text-[11px] text-muted-foreground">Printed on invoices & statements</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'companyLogo')} />
                    <Button variant="outline" type="button" onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1.5 font-bold text-xs h-9 rounded-xl">
                      <Upload className="h-4 w-4 text-primary" /> Upload Custom Logo
                    </Button>
                    {formData.companyLogo ? (
                      <div className="relative border border-border/80 p-1.5 rounded-xl bg-card shadow-xs flex items-center gap-2">
                        <img src={formData.companyLogo} alt="Logo" className="h-10 max-w-36 object-contain rounded-md" />
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white p-0" onClick={() => updateForm({ companyLogo: '' })} title="Remove custom logo">
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 p-1.5 px-3 rounded-xl border border-primary/20 bg-primary/5 text-foreground text-xs">
                        <InvoiceProMark size={24} />
                        <div>
                          <span className="font-bold block text-[11px] text-primary">Default InvoicePro Vector Active</span>
                          <span className="text-[10px] text-muted-foreground">Used on bills until custom logo uploaded</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {formData.companyLogo && (
                    <div className="space-y-3 pt-2 border-t mt-2 max-w-xs">
                      <div className="flex items-center justify-between text-xs">
                        <Label className="text-muted-foreground">Logo Sizing Width (px)</Label>
                        <span className="font-semibold text-xs">{formData.logoWidth || 120}px</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="300"
                        step="5"
                        value={formData.logoWidth || 120}
                        onChange={e => updateForm({ logoWidth: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Logo Alignment</Label>
                        <Select 
                          value={formData.logoAlign || 'left'} 
                          onValueChange={v => updateForm({ logoAlign: v as 'left' | 'center' | 'right' })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left Align</SelectItem>
                            <SelectItem value="center">Center Align</SelectItem>
                            <SelectItem value="right">Right Align</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="show-logo"
                          checked={formData.showLogo !== false}
                          onChange={e => updateForm({ showLogo: e.target.checked })}
                          className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <Label htmlFor="show-logo" className="text-xs cursor-pointer">Show Logo on Bills</Label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Signature Upload */}
                <div className="space-y-2">
                  <Label>Authorized Official Signature (under 5MB)</Label>
                  <div className="flex items-center gap-4">
                    <input type="file" ref={sigInputRef} className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'companySignature')} />
                    <Button variant="outline" type="button" onClick={() => sigInputRef.current?.click()} className="flex items-center gap-1.5">
                      <Upload className="h-4 w-4" /> Choose Sign
                    </Button>
                    {formData.companySignature ? (
                      <div className="relative border p-1 rounded bg-slate-50 dark:bg-slate-900">
                        <img src={formData.companySignature} alt="Signature" className="h-10 max-w-30 object-contain" />
                        <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white p-0.5" onClick={() => updateForm({ companySignature: '' })}>
                          ×
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="h-4 w-4" /> No signature uploaded</span>
                    )}
                  </div>

                  {formData.companySignature && (
                    <div className="space-y-3 pt-2 border-t mt-2 max-w-xs">
                      <div className="flex items-center justify-between text-xs">
                        <Label className="text-muted-foreground">Signature Sizing Width (px)</Label>
                        <span className="font-semibold text-xs">{formData.sigWidth || 120}px</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="300"
                        step="5"
                        value={formData.sigWidth || 120}
                        onChange={e => updateForm({ sigWidth: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="show-signature"
                          checked={formData.showSignature !== false}
                          onChange={e => updateForm({ showSignature: e.target.checked })}
                          className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <Label htmlFor="show-signature" className="text-xs cursor-pointer">Show Signature on Bills</Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Bank & UPI details */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Bank Details & UPI Payment QR</CardTitle>
              <CardDescription>Configure bank account details and UPI ID. These will automatically render UPI QR codes on bills.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input id="bank-name" value={formData.bankName || ''} onChange={e => updateForm({ bankName: e.target.value })} placeholder="e.g., State Bank of India" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-acc-name">Account Holder Name</Label>
                  <Input id="bank-acc-name" value={formData.bankAccountName || ''} onChange={e => updateForm({ bankAccountName: e.target.value })} placeholder="Business Name or Individual" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-acc-no">Bank Account Number</Label>
                  <Input id="bank-acc-no" value={formData.bankAccountNumber || ''} onChange={e => updateForm({ bankAccountNumber: e.target.value })} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-ifsc">IFSC Code</Label>
                  <Input id="bank-ifsc" value={formData.bankIfsc || ''} onChange={e => updateForm({ bankIfsc: e.target.value.toUpperCase() })} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-branch">Branch Location</Label>
                  <Input id="bank-branch" value={formData.bankBranch || ''} onChange={e => updateForm({ bankBranch: e.target.value })} />
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="upi-id">UPI ID (VPA) for QR Code payments</Label>
                  <Input id="upi-id" value={formData.upiId || ''} onChange={e => updateForm({ upiId: e.target.value })} placeholder="e.g., merchant@okaxis" className="font-mono w-full sm:w-1/2" />
                  <p className="text-[10px] text-muted-foreground">Renders a dynamic payment QR code with invoice values at the bottom of bills.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Invoice settings with Live Right-Side Preview */}
        <TabsContent value="invoice" className="space-y-6">
          {(() => {
            const selectedTemplateId = formData.defaultTemplate || 'premium';
            const selectedTemplateObj = INVOICE_TEMPLATES.find(t => t.id === selectedTemplateId) || INVOICE_TEMPLATES[0];

            const activePreviewInvoice: Invoice = useRealData && latestInvoice ? {
              ...latestInvoice,
              termsAndConditions: formData.termsAndConditions || latestInvoice.termsAndConditions,
              notes: formData.invoiceFooterNotes || latestInvoice.notes,
            } : {
              ...sampleInvoiceForPreview,
              termsAndConditions: formData.termsAndConditions || sampleInvoiceForPreview.termsAndConditions,
              notes: formData.invoiceFooterNotes || sampleInvoiceForPreview.notes,
            };

            const activePreviewSettings: AppSettings = {
              id: currentSettings?.id || 1,
              companyName: formData.companyName || 'My Business Enterprise',
              companyAddress: formData.companyAddress || '101 Commercial Complex, Industrial Area',
              companyCity: formData.companyCity || 'Jaipur',
              companyState: formData.companyState || 'Rajasthan',
              companyPincode: formData.companyPincode || '302001',
              companyPhone: formData.companyPhone || '+91 98290 12345',
              companyEmail: formData.companyEmail || 'billing@myenterprise.in',
              companyWebsite: formData.companyWebsite || 'www.myenterprise.in',
              companyGstin: formData.companyGstin || '08AABCB9999P1Z2',
              companyPan: formData.companyPan || 'AABCB9999P',
              companyLogo: formData.companyLogo || '',
              companySignature: formData.companySignature || '',
              bankAccountName: formData.bankAccountName || formData.companyName || 'My Business Enterprise',
              bankAccountNumber: formData.bankAccountNumber || '50200012345678',
              bankIfsc: formData.bankIfsc || 'HDFC0001234',
              bankName: formData.bankName || 'HDFC Bank Ltd',
              bankBranch: formData.bankBranch || 'Industrial Finance Branch',
              upiId: formData.upiId || 'myenterprise@hdfcbank',
              invoicePrefix: formData.invoicePrefix || { tax_invoice: 'INV' } as any,
              financialYearStart: formData.financialYearStart ?? 3,
              currency: formData.currency || 'INR',
              currencySymbol: formData.currencySymbol || '₹',
              decimalPlaces: formData.decimalPlaces ?? 2,
              defaultTaxInclusive: formData.defaultTaxInclusive ?? false,
              defaultTemplate: selectedTemplateId,
              termsAndConditions: formData.termsAndConditions || '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.',
              invoiceFooterNotes: formData.invoiceFooterNotes || 'Thank you for your business!',
              logoWidth: formData.logoWidth || 120,
              logoAlign: formData.logoAlign || 'left',
              sigWidth: formData.sigWidth || 120,
              showLogo: formData.showLogo ?? true,
              showSignature: formData.showSignature ?? true,
              theme: formData.theme || 'light',
            };

            return (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Left Column: Template Library & Customization */}
                <div className="xl:col-span-5 space-y-5">
                  <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-extrabold text-foreground">
                            Invoice Template Library
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Select default visual design. Click any card to preview instantly.
                          </CardDescription>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {INVOICE_TEMPLATES.length} Styles
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 space-y-2.5">
                      {INVOICE_TEMPLATES.map((tmpl) => {
                        const isSelected = selectedTemplateId === tmpl.id;
                        const Icon = tmpl.icon;
                        return (
                          <div
                            key={tmpl.id}
                            onClick={() => updateForm({ defaultTemplate: tmpl.id })}
                            className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                                : 'border-border/60 hover:border-primary/40 hover:bg-muted/30 bg-card'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <div className="px-2 py-1.5 rounded-xl border shrink-0 mt-0.5 bg-background shadow-xs border-border/80 flex items-center justify-center min-w-17.5 h-9">
                                  <BrandTemplateLogo templateId={tmpl.id} className="h-5 w-auto max-w-21.25" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-xs text-foreground">{tmpl.name}</h4>
                                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${tmpl.badgeColor}`}>
                                      {tmpl.badge}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-medium">{tmpl.category}</p>
                                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-0.5 line-clamp-2">
                                    {tmpl.description}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected 
                                    ? 'bg-primary border-primary text-primary-foreground' 
                                    : 'border-border group-hover:border-primary/50'
                                }`}>
                                  {isSelected && <Check className="h-3 w-3 stroke-3" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Terms & Footnotes Box */}
                  <Card className="border border-border/70 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                      <CardTitle className="text-sm font-bold text-foreground">Terms & Footer Notes</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Custom fine print and notes rendered across all invoice printouts.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="terms-cond" className="text-xs font-bold text-foreground">
                          Default Terms & Conditions
                        </Label>
                        <Textarea
                          id="terms-cond"
                          value={formData.termsAndConditions || ''}
                          onChange={(e) => updateForm({ termsAndConditions: e.target.value })}
                          placeholder="1. Goods once sold will not be taken back&#10;2. Warranty covers manufacturing defects only."
                          className="h-20 text-xs font-mono resize-y"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="footer-notes" className="text-xs font-bold text-foreground">
                          Invoice Footer Notes
                        </Label>
                        <Textarea
                          id="footer-notes"
                          value={formData.invoiceFooterNotes || ''}
                          onChange={(e) => updateForm({ invoiceFooterNotes: e.target.value })}
                          placeholder="Thank you for your business!"
                          className="h-16 text-xs font-mono resize-y"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        className="w-full gap-2 font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm rounded-xl h-9"
                      >
                        <Save className="h-4 w-4" /> Save Template & Settings
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Live Interactive Preview */}
                <div className="xl:col-span-7 sticky top-6 space-y-3">
                  <div className="bg-card border border-border/80 rounded-2xl shadow-md overflow-hidden">
                    {/* Preview Header & Controls */}
                    <div className="p-3.5 border-b border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <Eye className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-foreground">
                              {selectedTemplateObj.name}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Preview
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            Scales dynamically • Real-time preview with store profile & GST data
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {latestInvoice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUseRealData(!useRealData)}
                            className="h-7.5 px-2.5 text-[11px] font-bold rounded-lg border-border/60 hover:bg-muted"
                            title="Toggle between sample data and your latest real invoice"
                          >
                            <FileText className="h-3 w-3 mr-1 text-primary" />
                            {useRealData ? 'Using Real Bill' : 'Demo Data'}
                          </Button>
                        )}

                        {/* Zoom Controls */}
                        <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-background shadow-xs">
                          <button
                            type="button"
                            onClick={() => setPreviewZoom(0.55)}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${previewZoom === 0.55 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            title="Fit page"
                          >
                            Fit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewZoom(0.68)}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${previewZoom === 0.68 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            title="Medium zoom"
                          >
                            70%
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewZoom(0.9)}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${previewZoom === 0.9 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            title="Full scale"
                          >
                            90%
                          </button>
                        </div>

                        {/* Fullscreen Button */}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setFullscreenModalOpen(true)}
                          className="h-7.5 w-7.5 rounded-lg border-border/60 hover:bg-muted"
                          title="Open Fullscreen Preview"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Preview Viewport */}
                    <div className="p-4 bg-muted/40 dark:bg-slate-950/70 overflow-hidden flex flex-col items-center">
                      <div className="w-full max-h-175 overflow-y-auto overflow-x-hidden flex justify-center py-2 rounded-xl">
                        <div
                          style={{
                            width: '800px',
                            transform: `scale(${previewZoom})`,
                            transformOrigin: 'top center',
                            marginBottom: `${(previewZoom - 1) * 1150}px`,
                          }}
                          className="shadow-2xl rounded-lg bg-white shrink-0 pointer-events-none select-none transition-transform duration-200 border border-slate-200"
                        >
                          <InvoiceTemplateSelector
                            templateName={selectedTemplateId}
                            invoice={activePreviewInvoice}
                            settings={activePreviewSettings}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Info bar */}
                    <div className="px-4 py-2 border-t border-border/50 bg-card text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>Standard A4 Output • 300 DPI Vector PDF Compatible</span>
                      <span className="font-semibold text-primary">
                        Default Style: {selectedTemplateObj.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fullscreen Modal Preview */}
                <Dialog open={fullscreenModalOpen} onOpenChange={setFullscreenModalOpen}>
                  <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 bg-muted/30">
                    <DialogHeader className="pb-3 border-b border-border/40">
                      <DialogTitle className="text-base font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Eye className="h-4.5 w-4.5 text-primary" />
                          Full Scale Invoice Preview • {selectedTemplateObj.name}
                        </span>
                        <span className="text-xs font-mono font-medium text-muted-foreground mr-6">
                          100% Native Render
                        </span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                      <div className="shadow-2xl bg-white border border-slate-300 rounded-lg max-w-200 w-full overflow-hidden">
                        <InvoiceTemplateSelector
                          templateName={selectedTemplateId}
                          invoice={activePreviewInvoice}
                          settings={activePreviewSettings}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            );
          })()}
        </TabsContent>

        {/* Tab: Appearance & Themes */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Themes & Dark Mode Appearance
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Choose your preferred workspace aesthetic. Select <strong>Pure Black (OLED)</strong> for a 100% true pitch-black background (#000000) with crisp inverted text, or choose Clean Light or Midnight Navy.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex py-1 px-3 border-primary/30 text-primary font-bold text-xs">
                  Active: {formData.theme === 'dark' ? 'Pure Black' : formData.theme === 'light' ? 'Clean Light' : formData.theme === 'midnight' ? 'Midnight Navy' : 'System'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Pure Black (OLED) */}
                <div
                  onClick={() => {
                    updateForm({ theme: 'dark' });
                    setStoreSettings({ theme: 'dark' });
                    const root = document.documentElement;
                    root.classList.add('dark');
                    root.classList.remove('theme-midnight');
                    toast.success('Pure Black (OLED) theme enabled!');
                  }}
                  className={`group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden ${
                    formData.theme === 'dark'
                      ? 'border-primary ring-2 ring-primary/20 bg-muted/40 shadow-md'
                      : 'border-border/60 hover:border-primary/50 hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-black border border-zinc-800 text-white shadow-xs">
                        <Moon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                          Pure Black (OLED)
                          {formData.theme === 'dark' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Check className="h-2.5 w-2.5" /> Selected
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">True #000000 Pitch Black</span>
                      </div>
                    </div>
                    <Badge className="text-[10px] bg-primary text-white font-bold">
                      Recommended Dark
                    </Badge>
                  </div>

                  {/* Visual Miniature UI Mockup */}
                  <div className="rounded-xl border border-zinc-800 bg-black p-3 space-y-2 shadow-inner font-sans">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                        <span className="text-[10px] font-mono font-bold text-zinc-400 ml-1">InvoicePro</span>
                      </div>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">OLED BLACK</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-[#09090b] border border-zinc-800">
                        <div className="text-[9px] text-zinc-400">Total Sales</div>
                        <div className="text-xs font-black text-white font-mono mt-0.5">₹1,84,200</div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#09090b] border border-zinc-800">
                        <div className="text-[9px] text-zinc-400">Received</div>
                        <div className="text-xs font-black text-emerald-400 font-mono mt-0.5">₹1,50,000</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Zero blue tint. 100% deep neutral black background with crisp inverted typography and high-contrast charcoal cards. Saves power on AMOLED displays.
                  </p>
                </div>

                {/* 2. Clean Light */}
                <div
                  onClick={() => {
                    updateForm({ theme: 'light' });
                    setStoreSettings({ theme: 'light' });
                    const root = document.documentElement;
                    root.classList.remove('dark', 'theme-midnight');
                    toast.success('Clean Light theme enabled!');
                  }}
                  className={`group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden ${
                    formData.theme === 'light'
                      ? 'border-primary ring-2 ring-primary/20 bg-muted/40 shadow-md'
                      : 'border-border/60 hover:border-primary/50 hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-xs">
                        <Sun className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                          Clean Light
                          {formData.theme === 'light' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Check className="h-2.5 w-2.5" /> Selected
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">High Contrast Daylight</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      Daylight
                    </Badge>
                  </div>

                  {/* Visual Miniature UI Mockup */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 shadow-inner font-sans">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <span className="text-[10px] font-mono font-bold text-slate-700 ml-1">InvoicePro</span>
                      </div>
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">LIGHT</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <div className="text-[9px] text-slate-500">Total Sales</div>
                        <div className="text-xs font-black text-slate-900 font-mono mt-0.5">₹1,84,200</div>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <div className="text-[9px] text-slate-500">Received</div>
                        <div className="text-xs font-black text-emerald-600 font-mono mt-0.5">₹1,50,000</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Classic high-legibility daylight mode with crisp cards, subtle borders, and soft sapphire brand accents. Optimal for bright daylight environments.
                  </p>
                </div>

                {/* 3. Midnight Navy */}
                <div
                  onClick={() => {
                    updateForm({ theme: 'midnight' });
                    setStoreSettings({ theme: 'midnight' });
                    const root = document.documentElement;
                    root.classList.add('dark', 'theme-midnight');
                    toast.success('Midnight Navy theme enabled!');
                  }}
                  className={`group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden ${
                    formData.theme === 'midnight'
                      ? 'border-primary ring-2 ring-primary/20 bg-muted/40 shadow-md'
                      : 'border-border/60 hover:border-primary/50 hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#0b1c30] border border-blue-900/40 text-blue-300 shadow-xs">
                        <Palette className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                          Midnight Navy
                          {formData.theme === 'midnight' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Check className="h-2.5 w-2.5" /> Selected
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">Deep Navy Blue Dark</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-blue-500/30 text-blue-400">
                      Navy Slate
                    </Badge>
                  </div>

                  {/* Visual Miniature UI Mockup */}
                  <div className="rounded-xl border border-blue-900/60 bg-[#0b1c30] p-3 space-y-2 shadow-inner font-sans">
                    <div className="flex items-center justify-between border-b border-blue-900/60 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-400/60" />
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-400/60" />
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-400/60" />
                        <span className="text-[10px] font-mono font-bold text-blue-300 ml-1">InvoicePro</span>
                      </div>
                      <span className="text-[9px] font-bold text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/40">NAVY</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-[#152438] border border-blue-900/50">
                        <div className="text-[9px] text-blue-300/80">Total Sales</div>
                        <div className="text-xs font-black text-blue-100 font-mono mt-0.5">₹1,84,200</div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#152438] border border-blue-900/50">
                        <div className="text-[9px] text-blue-300/80">Received</div>
                        <div className="text-xs font-black text-emerald-400 font-mono mt-0.5">₹1,50,000</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Rich dark navy slate tones (#0b1c30) for users who prefer dark blue ambient workspace illumination.
                  </p>
                </div>

                {/* 4. System Automatic */}
                <div
                  onClick={() => {
                    updateForm({ theme: 'system' });
                    setStoreSettings({ theme: 'system' });
                    const root = document.documentElement;
                    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    root.classList.toggle('dark', systemDark);
                    root.classList.remove('theme-midnight');
                    toast.success('System Default theme enabled!');
                  }}
                  className={`group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden ${
                    formData.theme === 'system'
                      ? 'border-primary ring-2 ring-primary/20 bg-muted/40 shadow-md'
                      : 'border-border/60 hover:border-primary/50 hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 shadow-xs">
                        <Monitor className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                          System Automatic
                          {formData.theme === 'system' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Check className="h-2.5 w-2.5" /> Selected
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">Sync with OS Preference</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-purple-500/30 text-purple-500">
                      Auto
                    </Badge>
                  </div>

                  {/* Visual Miniature UI Mockup */}
                  <div className="rounded-xl border border-border bg-linear-to-r from-slate-100 to-black p-3 space-y-2 shadow-inner font-sans">
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-[10px] font-bold text-slate-800">Light OS</span>
                      <span className="text-[10px] font-bold text-white">Dark OS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <div className="text-[9px] text-slate-500">Daylight</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">Light UI</div>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                        <div className="text-[9px] text-zinc-400">Night</div>
                        <div className="text-xs font-bold text-white mt-0.5">Black UI</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Automatically switches between Clean Light and Pure Black when your operating system changes between daylight and night mode.
                  </p>
                </div>
              </div>

              {/* Information Alert Box */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-start gap-3">
                <InvoiceProMark size={28} className="shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h5 className="font-bold text-foreground">Instant Live Preview</h5>
                  <p className="text-muted-foreground leading-relaxed">
                    Clicking any theme card above applies it immediately across the app in real time. Remember to click <strong>Save Settings</strong> at the top right to make your choice the permanent default across restarts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Security & Loyalty */}
        <TabsContent value="security">
          <div className="space-y-6">
            {/* Card 1: Cashier Mode & PIN Lock */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-indigo-500" />
                      Role-Based Access: Staff Cashier vs Admin Owner
                    </CardTitle>
                    <CardDescription>
                      Lock sensitive business metrics, profit margins, and critical invoice actions behind an Owner PIN.
                    </CardDescription>
                  </div>
                  <Switch
                    checked={formData.isCashierLockEnabled || false}
                    onCheckedChange={(val) => updateForm({ isCashierLockEnabled: val })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                    <Key className="h-4 w-4" />
                    <span>Owner / Admin Security PIN</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="password"
                      maxLength={6}
                      value={formData.staffPin || ''}
                      onChange={(e) => updateForm({ staffPin: e.target.value })}
                      placeholder="e.g. 1234"
                      className="font-mono text-center tracking-widest text-lg max-w-[180px]"
                    />
                    <span className="text-xs text-muted-foreground">
                      Default: <strong>1234</strong>. 4-6 digits recommended.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-foreground">
                      <Lock className="h-3.5 w-3.5 text-rose-500" /> What Cashiers CANNOT Do
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      <li>Cannot view Gross & Net Profit Margins on Reports</li>
                      <li>Cannot cancel or permanently delete existing bills</li>
                      <li>Cannot alter company GSTIN, bank details, or settings</li>
                      <li>Cannot wipe local database records</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-foreground">
                      <Unlock className="h-3.5 w-3.5 text-emerald-500" /> What Cashiers CAN Do
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      <li>Fast retail billing via ⚡ POS Express Counter Mode</li>
                      <li>Plug-and-play barcode scanning with instant cart +1</li>
                      <li>Print 58mm/80mm thermal receipts with dynamic UPI QR</li>
                      <li>Accept Cash, UPI, Card payments and hold/recall bills</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Customer Loyalty Program */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-500" />
                      Customer Loyalty Points & Wallet Program
                    </CardTitle>
                    <CardDescription>
                      Incentivize repeat customer visits by awarding wallet cashback points on each purchase.
                    </CardDescription>
                  </div>
                  <Switch
                    checked={formData.loyaltyProgramEnabled ?? true}
                    onCheckedChange={(val) => updateForm({ loyaltyProgramEnabled: val })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <Coins className="h-4 w-4 text-amber-500" /> Points Awarded per ₹100 Spent
                    </Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={formData.loyaltyPointsPer100 ?? 1}
                      onChange={(e) => updateForm({ loyaltyPointsPer100: parseFloat(e.target.value) || 1 })}
                      placeholder="1"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      E.g., 1 point per ₹100 means a customer spending ₹2,000 earns 20 points.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <Receipt className="h-4 w-4 text-emerald-500" /> Point Redemption Value (₹)
                    </Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={formData.loyaltyPointRedeemValue ?? 1}
                      onChange={(e) => updateForm({ loyaltyPointRedeemValue: parseFloat(e.target.value) || 1 })}
                      placeholder="1"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Value of 1 point during checkout discount (default: ₹1.00 per point).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Automated Counter & Invoice Integration:</strong> Points are automatically credited to the customer&apos;s phone/profile upon bill generation in POS Counter Mode. Cashiers can apply points with 1 click to grant an instant rupee discount.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 6: Database backups */}
        <TabsContent value="database">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  Full Database Snapshot Backup & Safe Restore
                </CardTitle>
                <CardDescription>
                  1-click automated complete snapshot containing all 13 database collections (Invoices, Customers, Products, Suppliers, Loans, EMIs, Coupons, Stock Logs, and Settings).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Export Box */}
                  <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                      <Download className="h-4 w-4" /> Complete Snapshot Backup
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Packages your entire database into an encrypted, portable JSON snapshot with zero data loss. Save to local drive, Google Drive, or pendrive.
                    </p>
                    <Button onClick={handleExportDB} className="w-full flex items-center justify-center gap-2 font-bold shadow-xs">
                      <Download className="h-4 w-4" /> Download Complete Backup (.json)
                    </Button>
                  </div>

                  {/* Import Box */}
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <Upload className="h-4 w-4" /> Safe Database Restore
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Restore from an InvoicePro backup. Preview table counts before applying and choose between Clean Replacement or Merging records.
                    </p>
                    <input
                      type="file"
                      id="db-snapshot-file"
                      className="hidden"
                      accept=".json"
                      onChange={handleImportFile}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('db-snapshot-file')?.click()}
                      className="w-full flex items-center justify-center gap-2 font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                    >
                      <Upload className="h-4 w-4" /> Select Backup File to Restore
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-rose-500 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Danger Zone
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Deleting databases is permanent and clears all local stock logs, sales registers, suppliers, and customer lists. Ensure you have exported a backup first.
                  </p>
                  <Button variant="destructive" size="sm" onClick={handleReset} className="flex items-center gap-1.5 font-bold">
                    <RefreshCcw className="h-4 w-4" /> Wipe Entire Database
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Safe Restore Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Upload className="h-5 w-5 text-emerald-500" />
              Restore Database Snapshot
            </DialogTitle>
            <DialogDescription>
              Review the records found in <strong>{importSnapshot?.fileName}</strong> before proceeding.
            </DialogDescription>
          </DialogHeader>

          {importSnapshot && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
                <span>File Size: <strong>{importSnapshot.fileSize}</strong></span>
                {importSnapshot.exportedAt && (
                  <span>Exported: <strong>{new Date(importSnapshot.exportedAt).toLocaleDateString()}</strong></span>
                )}
              </div>

              {/* Table breakdown stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl border bg-card">
                  <div className="text-lg font-bold font-mono text-foreground">{importSnapshot.counts.invoices}</div>
                  <div className="text-[11px] text-muted-foreground">Invoices</div>
                </div>
                <div className="p-2.5 rounded-xl border bg-card">
                  <div className="text-lg font-bold font-mono text-foreground">{importSnapshot.counts.products}</div>
                  <div className="text-[11px] text-muted-foreground">Products</div>
                </div>
                <div className="p-2.5 rounded-xl border bg-card">
                  <div className="text-lg font-bold font-mono text-foreground">{importSnapshot.counts.customers}</div>
                  <div className="text-[11px] text-muted-foreground">Customers</div>
                </div>
                <div className="p-2.5 rounded-xl border bg-card">
                  <div className="text-lg font-bold font-mono text-foreground">{importSnapshot.counts.loans}</div>
                  <div className="text-[11px] text-muted-foreground">Loans / EMI</div>
                </div>
              </div>

              {/* Restore Mode Selection */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose Restore Strategy</Label>
                <div className="grid grid-cols-1 gap-2">
                  <div
                    onClick={() => setRestoreMode('clean')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      restoreMode === 'clean'
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">Clean Snapshot Restore (Recommended)</span>
                      {restoreMode === 'clean' && <Check className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Overwrites existing tables with this exact backup. Guarantees 0% data corruption and identical relation mapping.
                    </p>
                  </div>

                  <div
                    onClick={() => setRestoreMode('merge')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      restoreMode === 'merge'
                        ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 ring-1 ring-blue-500'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">Merge & Append</span>
                      {restoreMode === 'merge' && <Check className="h-4 w-4 text-blue-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keeps existing current records and appends imported records as new items.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={isRestoring}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteRestore}
              disabled={isRestoring}
              className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isRestoring ? 'Restoring Database...' : 'Restore Database Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImageCropper
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={cropperSrc}
        title={cropperField === 'companyLogo' ? 'Crop Store Logo' : 'Crop Official Signature'}
        defaultAspect={cropperField === 'companyLogo' ? 2.5 : 3.0}
        onCrop={(cropped) => {
          updateForm({ [cropperField]: cropped });
          toast.success(`${cropperField === 'companyLogo' ? 'Logo' : 'Signature'} cropped and saved`);
        }}
      />
    </div>
  );
}
