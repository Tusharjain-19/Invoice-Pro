'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Customer } from '@/types';
import { INDIAN_STATES } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, MoreHorizontal, MessageCircle, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerKhataLedgerModal } from '@/components/customers/CustomerKhataLedgerModal';

const emptyCustomer: Partial<Customer> = {
  name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', gstin: '', pan: '', loyaltyPoints: 0,
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>(emptyCustomer);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<Customer | null>(null);
  const [khataOpen, setKhataOpen] = useState(false);

  // Auto-open Add Customer modal when arriving from shortcut links
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'add') {
        setFormData({ ...emptyCustomer });
        setIsEditing(false);
        setDialogOpen(true);
      }
    }
  }, []);

  const customers = useLiveQuery(() => db.customers.toArray()) ?? [];

  const filteredCustomers = useMemo(() =>
    customers.filter(c =>
      !search ||
      (c.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      Boolean(c.phone?.includes(search)) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.gstin?.toLowerCase().includes(search.toLowerCase()) ?? false)
    ),
    [customers, search]
  );

  const openAdd = () => { setFormData({ ...emptyCustomer }); setIsEditing(false); setDialogOpen(true); };
  const openEdit = (c: Customer) => { setFormData({ ...c }); setIsEditing(true); setDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.name?.trim()) { toast.error('Customer name is required'); return; }
    try {
      const now = Date.now();
      if (isEditing && formData.id) {
        await db.customers.update(formData.id, { ...formData, updatedAt: now });
        toast.success('Customer updated');
      } else {
        await db.customers.add({ ...formData, createdAt: now, updatedAt: now } as Customer);
        toast.success('Customer added');
      }
      setDialogOpen(false);
    } catch { toast.error('Failed to save customer'); }
  };

  const handleDelete = async (id: number) => {
    await db.customers.delete(id);
    toast.success('Customer deleted');
    setDeleteConfirmId(null);
  };

  const updateForm = (u: Partial<Customer>) => setFormData(prev => ({ ...prev, ...u }));

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground text-sm">{customers.length} customers</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1.5" /> Add Customer</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone, email, GSTIN..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No customers found</p>
            <Button size="sm" className="mt-4" onClick={openAdd}><Plus className="h-4 w-4 mr-1.5" /> Add Customer</Button>
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
                      {(customer.name?.trim()?.[0] || 'C').toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{customer.name || 'Unnamed Customer'}</p>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[10px] border border-amber-500/20" title="Loyalty Points">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>{customer.loyaltyPoints || 0} pts</span>
                        </div>
                      </div>
                      {customer.gstin && <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">{customer.gstin}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs font-medium gap-1 text-primary border-primary/30 hover:bg-primary/5"
                      onClick={() => { setSelectedKhataCustomer(customer); setKhataOpen(true); }}
                      title="Open Customer Ledger / Khata Statement"
                    >
                      <FileText className="h-3 w-3" /> Khata
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-70 hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedKhataCustomer(customer); setKhataOpen(true); }}>
                          <FileText className="h-4 w-4 mr-2 text-primary" /> Khata Statement
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(customer)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirmId(customer.id!)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {customer.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                      <a
                        href={`https://wa.me/${customer.phone.replace(/\D/g, '').length === 10 ? '91' + customer.phone.replace(/\D/g, '') : customer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/40 transition-colors"
                        title="Chat on WhatsApp"
                        onClick={e => e.stopPropagation()}
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <a href={`mailto:${customer.email}`} className="truncate hover:underline hover:text-foreground">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {(customer.address || customer.city || customer.state) && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                      <span className="line-clamp-2">
                        {[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {(customer.pan || customer.gstin) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50">
                      {customer.pan && (
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                          PAN: {customer.pan}
                        </Badge>
                      )}
                      {customer.gstin && (
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 text-primary border-primary/30">
                          GSTIN: {customer.gstin}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            <DialogDescription>Enter customer details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={formData.name || ''} onChange={e => updateForm({ name: e.target.value })} placeholder="Customer name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone || ''} onChange={e => updateForm({ phone: e.target.value })} placeholder="+91 XXXXX XXXXX" /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={formData.email || ''} onChange={e => updateForm({ email: e.target.value })} placeholder="email@example.com" /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={formData.address || ''} onChange={e => updateForm({ address: e.target.value })} /></div>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>GSTIN</Label><Input value={formData.gstin || ''} onChange={e => updateForm({ gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" /></div>
              <div className="space-y-2"><Label>PAN</Label><Input value={formData.pan || ''} onChange={e => updateForm({ pan: e.target.value.toUpperCase() })} placeholder="AAAAA0000A" /></div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Loyalty Points
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.loyaltyPoints ?? 0}
                  onChange={e => updateForm({ loyaltyPoints: Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? 'Update' : 'Add Customer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Customer?</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Khata Ledger Modal */}
      <CustomerKhataLedgerModal
        open={khataOpen}
        onOpenChange={setKhataOpen}
        customer={selectedKhataCustomer}
      />
    </div>
  );
}
