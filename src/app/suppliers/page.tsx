'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Supplier } from '@/types';
import { INDIAN_STATES } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Truck, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, MoreHorizontal, MessageSquare, Send, PhoneCall } from 'lucide-react';
import { WhatsAppIcon } from '@/components/shared/WhatsAppIcon';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/useSettingsStore';

const emptySupplier: Partial<Supplier> = {
  name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', gstNumber: '',
};

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>(emptySupplier);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // WhatsApp Dialog State
  const [whatsappSupplier, setWhatsappSupplier] = useState<Supplier | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<'order' | 'payment' | 'ledger' | 'custom'>('order');
  const [whatsappCustomMsg, setWhatsappCustomMsg] = useState('');
  const { settings } = useSettingsStore();

  const suppliers = useLiveQuery(() => db.suppliers.toArray()) ?? [];

  const filteredSuppliers = useMemo(() =>
    suppliers.filter(s =>
      !search ||
      (s.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      Boolean(s.phone?.includes(search)) ||
      (s.gstNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
    ),
    [suppliers, search]
  );

  const openAdd = () => { setFormData({ ...emptySupplier }); setIsEditing(false); setDialogOpen(true); };
  const openEdit = (s: Supplier) => { setFormData({ ...s }); setIsEditing(true); setDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.name?.trim()) { toast.error('Supplier name is required'); return; }
    try {
      const now = Date.now();
      if (isEditing && formData.id) {
        await db.suppliers.update(formData.id, { ...formData, updatedAt: now });
        toast.success('Supplier updated');
      } else {
        await db.suppliers.add({ ...formData, createdAt: now, updatedAt: now } as Supplier);
        toast.success('Supplier added');
      }
      setDialogOpen(false);
    } catch { toast.error('Failed to save supplier'); }
  };

  const handleDelete = async (id: number) => {
    await db.suppliers.delete(id);
    toast.success('Supplier deleted');
    setDeleteConfirmId(null);
  };

  const updateForm = (u: Partial<Supplier>) => setFormData(prev => ({ ...prev, ...u }));

  // WhatsApp Handlers
  const handleOpenWhatsApp = (supplier: Supplier) => {
    if (!supplier.phone?.trim()) {
      toast.error(`No phone number recorded for ${supplier.name}. Please edit supplier to add one.`);
      return;
    }
    setWhatsappSupplier(supplier);
    setWhatsappTemplate('order');
    setWhatsappCustomMsg(
      `Hello ${supplier.name}, this is ${settings.companyName || 'our store'}. We would like to inquire about product availability and place a new stock order. Please share your latest catalog/price list.`
    );
  };

  const handleTemplateChange = (template: 'order' | 'payment' | 'ledger' | 'custom') => {
    setWhatsappTemplate(template);
    if (!whatsappSupplier) return;
    const store = settings.companyName || 'our company';

    switch (template) {
      case 'order':
        setWhatsappCustomMsg(
          `Hello ${whatsappSupplier.name},\nThis is ${store}. We would like to check current stock availability and place a fresh procurement order. Kindly share your latest catalog and wholesale price list.\n\nThank you!`
        );
        break;
      case 'payment':
        setWhatsappCustomMsg(
          `Hello ${whatsappSupplier.name},\nThis is ${store}. A payment has been initiated for our account with your firm. Kindly verify your bank/UPI credits and provide us with an updated receipt.\n\nThank you!`
        );
        break;
      case 'ledger':
        setWhatsappCustomMsg(
          `Hello ${whatsappSupplier.name},\nThis is ${store}. Could you please send our current account ledger statement and outstanding balance as on date for reconciliation?\n\nRegards,\n${store}`
        );
        break;
      case 'custom':
        setWhatsappCustomMsg(`Hello ${whatsappSupplier.name},\n`);
        break;
    }
  };

  const handleSendWhatsApp = () => {
    if (!whatsappSupplier?.phone) return;
    let clean = whatsappSupplier.phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      clean = '91' + clean;
    }

    const encoded = encodeURIComponent(whatsappCustomMsg);
    const url = `https://wa.me/${clean}?text=${encoded}`;
    window.open(url, '_blank');
    toast.success(`Opening WhatsApp for ${whatsappSupplier.name}`);
    setWhatsappSupplier(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Suppliers & Vendors</h2>
          <p className="text-muted-foreground text-sm">{suppliers.length} active suppliers and partners</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1.5" /> Add Supplier</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone, or GST number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <Truck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No suppliers found</p>
            <Button size="sm" className="mt-4" onClick={openAdd}><Plus className="h-4 w-4 mr-1.5" /> Add Supplier</Button>
          </div>
        ) : (
          filteredSuppliers.map(supplier => (
            <Card key={supplier.id} className="border border-border/60 hover:border-border transition-colors group flex flex-col justify-between">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm border border-primary/20">
                      {(supplier.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{supplier.name || 'Unnamed Supplier'}</p>
                      {supplier.gstNumber && (
                        <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                          {supplier.gstNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(supplier)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirmId(supplier.id!)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-primary/70 shrink-0" />
                      <span className="font-mono">{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {(supplier.city || supplier.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{[supplier.city, supplier.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Quick 1-Click WhatsApp & Call Bar */}
                <div className="pt-2 border-t border-border/40 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenWhatsApp(supplier)}
                    className="flex-1 gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 shadow-2xs"
                  >
                    <WhatsAppIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    WhatsApp
                  </Button>
                  {supplier.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                      title={`Call ${supplier.phone}`}
                    >
                      <a href={`tel:${supplier.phone}`}>
                        <PhoneCall className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Supplier Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
            <DialogDescription>Enter vendor or supplier details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={formData.name || ''} onChange={e => updateForm({ name: e.target.value })} placeholder="Supplier / Company name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone (for WhatsApp)</Label><Input value={formData.phone || ''} onChange={e => updateForm({ phone: e.target.value })} placeholder="+91 98765 43210" /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={formData.email || ''} onChange={e => updateForm({ email: e.target.value })} placeholder="supplier@example.com" /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={formData.address || ''} onChange={e => updateForm({ address: e.target.value })} placeholder="Office or warehouse address" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={formData.city || ''} onChange={e => updateForm({ city: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={formData.state || ''} onValueChange={v => updateForm({ state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Pincode</Label><Input value={formData.pincode || ''} onChange={e => updateForm({ pincode: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>GST Number</Label><Input value={formData.gstNumber || ''} onChange={e => updateForm({ gstNumber: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? 'Update Supplier' : 'Save Supplier'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Message Composer Dialog */}
      <Dialog open={whatsappSupplier !== null} onOpenChange={(open) => !open && setWhatsappSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <WhatsAppIcon className="h-5 w-5 text-emerald-600" />
              Message Supplier on WhatsApp
            </DialogTitle>
            <DialogDescription>
              Sending to <span className="font-bold text-foreground">{whatsappSupplier?.name}</span> ({whatsappSupplier?.phone})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Message Template</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={whatsappTemplate === 'order' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => handleTemplateChange('order')}
                >
                  Order Inquiry
                </Button>
                <Button
                  type="button"
                  variant={whatsappTemplate === 'payment' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => handleTemplateChange('payment')}
                >
                  Payment Alert
                </Button>
                <Button
                  type="button"
                  variant={whatsappTemplate === 'ledger' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => handleTemplateChange('ledger')}
                >
                  Ledger Due
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Message Preview</Label>
              <Textarea
                rows={5}
                value={whatsappCustomMsg}
                onChange={(e) => {
                  setWhatsappCustomMsg(e.target.value);
                  setWhatsappTemplate('custom');
                }}
                className="text-xs font-sans leading-relaxed"
                placeholder="Type your WhatsApp message..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWhatsappSupplier(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
            >
              <WhatsAppIcon className="h-4 w-4 text-white" />
              Open in WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Supplier?</DialogTitle><DialogDescription>This will remove this supplier from your database.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
