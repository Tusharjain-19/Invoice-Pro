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
import {
  Store, CreditCard, Receipt, Database, Upload, Download, Save, Image as ImageIcon, CheckCircle, RefreshCcw,
  Sparkles, ShoppingBag, Briefcase, Layers, Truck, Factory, Maximize2, Eye, ZoomIn, ZoomOut, Check, FileText
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

  // Database Backup
  const handleExportDB = async () => {
    try {
      const invoices = await db.invoices.toArray();
      const products = await db.products.toArray();
      const customers = await db.customers.toArray();
      const suppliers = await db.suppliers.toArray();
      const settingsData = await db.settings.toArray();
      const expenses = await db.expenses.toArray();

      const backupObj = { invoices, products, customers, suppliers, settings: settingsData, expenses, date: Date.now() };
      const str = JSON.stringify(backupObj, null, 2);
      
      const blob = new Blob([str], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `InvoicePro_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast.success('Database backup exported successfully');
    } catch {
      toast.error('Failed to export backup');
    }
  };

  // Database Import
  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showConfirm({
      title: 'Import Database Backup',
      message: 'This will append imported records. Ensure the file is a valid InvoicePro JSON backup.',
      confirmLabel: 'Import Backup',
      cancelLabel: 'Cancel',
      variant: 'warning',
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = JSON.parse(evt.target?.result as string);
            
            if (data.products && data.products.length > 0) {
              await db.products.bulkAdd(data.products.map((p: any) => { delete p.id; return p; }));
            }
            if (data.customers && data.customers.length > 0) {
              await db.customers.bulkAdd(data.customers.map((c: any) => { delete c.id; return c; }));
            }
            if (data.suppliers && data.suppliers.length > 0) {
              await db.suppliers.bulkAdd(data.suppliers.map((s: any) => { delete s.id; return s; }));
            }
            if (data.invoices && data.invoices.length > 0) {
              await db.invoices.bulkAdd(data.invoices.map((i: any) => { delete i.id; return i; }));
            }
            if (data.expenses && data.expenses.length > 0) {
              await db.expenses.bulkAdd(data.expenses.map((ex: any) => { delete ex.id; return ex; }));
            }

            toast.success('Database backup restored successfully');
            window.location.reload();
          } catch (err) {
            toast.error('Failed to parse and import backup file');
          }
        };
        reader.readAsText(file);
      }
    });
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
          <TabsTrigger value="database" className="flex items-center gap-1.5"><Database className="h-4 w-4" /> System</TabsTrigger>
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

        {/* Tab 4: Database backups */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>System & Database Operations</CardTitle>
              <CardDescription>Export backups to protect your data offline, import past JSON configurations, or wipe application state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleExportDB} className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" /> Export DB Backup (.json)
                </Button>

                <div className="relative">
                  <input type="file" id="db-import-file" className="hidden" accept=".json" onChange={handleImportDB} />
                  <Button variant="outline" onClick={() => document.getElementById('db-import-file')?.click()} className="flex items-center gap-1.5">
                    <Upload className="h-4 w-4" /> Import DB Backup (.json)
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-rose-500 mb-2">Danger Zone</h4>
                <p className="text-xs text-muted-foreground mb-3">Deleting databases is permanent and clears all local stock logs, sales registers, suppliers, and customer lists.</p>
                <Button variant="destructive" size="sm" onClick={handleReset} className="flex items-center gap-1.5">
                  <RefreshCcw className="h-4 w-4" /> Wipe Entire Database
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
