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
import { Users, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

const emptyCustomer: Partial<Customer> = {
  name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', gstin: '', pan: '',
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>(emptyCustomer);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

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
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{customer.name}</p>
                      {customer.gstin && <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">{customer.gstin}</span>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(customer)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirmId(customer.id!)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {customer.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{customer.phone}</div>}
                  {customer.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" />{customer.email}</div>}
                  {(customer.city || customer.state) && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" />{[customer.city, customer.state].filter(Boolean).join(', ')}</div>}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>GSTIN</Label><Input value={formData.gstin || ''} onChange={e => updateForm({ gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" /></div>
              <div className="space-y-2"><Label>PAN</Label><Input value={formData.pan || ''} onChange={e => updateForm({ pan: e.target.value.toUpperCase() })} placeholder="AAAAA0000A" /></div>
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
    </div>
  );
}
