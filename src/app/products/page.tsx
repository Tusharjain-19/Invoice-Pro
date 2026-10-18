'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { db } from '@/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Product } from '@/types';
import { GST_RATES, UNITS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Package, Plus, Search, Upload, Download, Edit, Trash2, AlertTriangle, Filter, X, MoreHorizontal, Barcode,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const emptyProduct: Partial<Product> = {
  name: '', sku: '', category: 'General', brand: 'Unbranded', unit: 'PCS',
  hsnCode: '', gstPercentage: 18, purchasePrice: 0, sellingPrice: 0,
  currentStock: 0, minimumStock: 5, batchNumber: '', expiryDate: null,
  isActive: true,
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>(emptyProduct);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-open Add Product modal when arriving from shortcut links
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'add') {
        setFormData({ ...emptyProduct });
        setIsEditing(false);
        setDialogOpen(true);
      }
    }
  }, []);

  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const brands = useLiveQuery(() => db.brands.toArray()) ?? [];

  // Filter and search
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !search ||
        (p.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (p.hsnCode?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      
      let matchesStock = true;
      if (stockFilter === 'in-stock') {
        matchesStock = p.currentStock > 0;
      } else if (stockFilter === 'out-of-stock') {
        matchesStock = p.currentStock === 0;
      } else if (stockFilter === 'low-stock') {
        matchesStock = p.currentStock <= p.minimumStock;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, filterCategory, stockFilter]);

  const lowStockCount = products.filter(p => p.currentStock <= p.minimumStock && p.isActive).length;

  // Form handlers
  const openAdd = () => {
    setFormData({ ...emptyProduct });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setFormData({ ...product });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Product name is required');
      return;
    }

    try {
      const now = Date.now();
      if (isEditing && formData.id) {
        await db.products.update(formData.id, { ...formData, updatedAt: now });
        toast.success('Product updated successfully');
      } else {
        await db.products.add({
          ...formData,
          sku: formData.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
          createdAt: now,
          updatedAt: now,
        } as Product);
        toast.success('Product added successfully');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error('Failed to save product');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await db.products.delete(id);
      toast.success('Product deleted');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Failed to delete product');
    }
  };

  // Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        const parseNum = (val: any, defaultVal = 0): number => {
          if (val === undefined || val === null || val === '') return defaultVal;
          if (typeof val === 'number') return val;
          const cleanStr = String(val).replace(/[^\d.-]/g, '');
          const num = parseFloat(cleanStr);
          return isNaN(num) ? defaultVal : num;
        };

        const productsToAdd: Product[] = data.map(item => {
          const rawName = String(findField(item, ['name', 'productname', 'itemname', 'item', 'particulars', 'description'], 'Unnamed'));
          const rawSku = String(findField(item, ['sku', 'barcode', 'code', 'productcode', 'itemcode'], ''));
          const rawCategory = String(findField(item, ['category', 'group', 'type'], 'General'));
          const rawBrand = String(findField(item, ['brand', 'make', 'manufacturer'], 'Unbranded'));
          const rawUnit = String(findField(item, ['unit', 'uom', 'measure'], 'PCS'));
          const rawHsn = String(findField(item, ['hsn', 'hsncode', 'sac', 'hsn/sac', 'saccode'], ''));
          const rawGst = parseNum(findField(item, ['gst', 'gstpercentage', 'tax', 'taxrate', 'gstrate'], 18));
          const rawPurchase = parseNum(findField(item, ['purchaseprice', 'purchase', 'cost', 'costprice'], 0));
          const rawSelling = parseNum(findField(item, ['sellingprice', 'price', 'rate', 'amount', 'mrp', 'salesprice', 'saleprice', 'sellingrate'], 0));
          const rawStock = parseNum(findField(item, ['stock', 'currentstock', 'qty', 'quantity', 'availablestock', 'openingstock'], 0));
          const rawMin = parseNum(findField(item, ['minstock', 'minimumstock', 'alertstock', 'reorderlevel'], 5));
          const rawBatch = String(findField(item, ['batch', 'batchnumber', 'batchno'], ''));

          return {
            name: rawName,
            sku: rawSku || `SKU-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`,
            category: rawCategory,
            brand: rawBrand,
            unit: rawUnit,
            hsnCode: rawHsn,
            gstPercentage: rawGst,
            purchasePrice: rawPurchase,
            sellingPrice: rawSelling,
            currentStock: rawStock,
            minimumStock: rawMin,
            batchNumber: rawBatch,
            expiryDate: null,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };
        });

        await db.products.bulkAdd(productsToAdd);
        toast.success(`${productsToAdd.length} products imported successfully`);
      } catch (err) {
        toast.error('Import failed. Please check the file format.');
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  // Export
  const handleExport = (filenamePrefix = 'Products') => {
    const data = products.map(p => ({
      Name: p.name,
      SKU: p.sku,
      Category: p.category,
      Brand: p.brand,
      Unit: p.unit,
      HSN: p.hsnCode,
      GST: p.gstPercentage,
      PurchasePrice: p.purchasePrice,
      SellingPrice: p.sellingPrice,
      Stock: p.currentStock,
      MinStock: p.minimumStock,
      Batch: p.batchNumber,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Products exported successfully');
  };

  // Delete All
  const handleDeleteAll = async () => {
    try {
      if (products.length === 0) {
        toast.error('No products to delete');
        setDeleteAllDialogOpen(false);
        return;
      }
      // Export backup first
      handleExport('Products_Backup_Before_Delete');
      // Clear database products table
      await db.products.clear();
      toast.success('Backup downloaded. All products deleted successfully.');
      setDeleteAllDialogOpen(false);
    } catch (err) {
      toast.error('Failed to delete all products');
    }
  };

  const updateForm = (updates: Partial<Product>) => setFormData(prev => ({ ...prev, ...updates }));

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground text-sm">{products.length} products · {lowStockCount > 0 && <span className="text-destructive font-medium">{lowStockCount} low stock</span>}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/products/barcodes">
            <Button variant="outline" size="sm" className="font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
              <Barcode className="h-4 w-4" /> Barcode Stickers
            </Button>
          </Link>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport()}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteAllDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete All
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Product
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or HSN code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <AlertTriangle className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-[#f1f5f9] dark:bg-muted/30">
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Product</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden md:table-cell">SKU</th>
                  <th className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden lg:table-cell">Category</th>
                  <th className="text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden sm:table-cell">Purchase</th>
                  <th className="text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Selling</th>
                  <th className="text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Stock</th>
                  <th className="text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4 hidden md:table-cell">GST</th>
                  <th className="text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No products found</p>
                      <p className="text-sm text-muted-foreground mt-1">Add your first product to get started</p>
                      <Button size="sm" className="mt-4" onClick={openAdd}>
                        <Plus className="h-4 w-4 mr-1.5" /> Add Product
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isLowStock = product.currentStock <= product.minimumStock;
                    return (
                      <tr key={product.id} className="border-b last:border-0 hover:bg-[#f8f9ff]/80 dark:hover:bg-muted/20 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{product.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground font-mono">{product.sku}</span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{product.category}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm hidden sm:table-cell font-mono">{formatCurrency(product.purchasePrice)}</td>
                        <td className="py-3 px-4 text-right text-sm font-semibold font-mono">{formatCurrency(product.sellingPrice)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-semibold font-mono ${isLowStock ? 'text-destructive' : ''}`}>
                            {product.currentStock}
                          </span>
                          {isLowStock && <AlertTriangle className="inline h-3 w-3 ml-1 text-destructive" />}
                        </td>
                        <td className="py-3 px-4 text-center text-sm hidden md:table-cell font-mono">{product.gstPercentage}%</td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(product)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirmId(product.id!)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the product details below.' : 'Fill in the details to add a new product.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Row 1: Name, SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" value={formData.name || ''} onChange={e => updateForm({ name: e.target.value })} placeholder="Enter product name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Barcode</Label>
                <Input id="sku" value={formData.sku || ''} onChange={e => updateForm({ sku: e.target.value })} placeholder="Auto-generated if empty" />
              </div>
            </div>

            {/* Row 2: Category, Brand, Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category || 'General'} onValueChange={v => updateForm({ category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={formData.brand || 'Unbranded'} onValueChange={v => updateForm({ brand: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {brands.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formData.unit || 'PCS'} onValueChange={v => updateForm({ unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: HSN, GST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hsn">HSN Code</Label>
                <Input id="hsn" value={formData.hsnCode || ''} onChange={e => updateForm({ hsnCode: e.target.value })} placeholder="e.g., 8471" />
              </div>
              <div className="space-y-2">
                <Label>GST Rate</Label>
                <Select value={String(formData.gstPercentage ?? 18)} onValueChange={v => updateForm({ gstPercentage: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Row 4: Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase">Purchase Price (₹)</Label>
                <Input id="purchase" type="number" step="0.01" value={formData.purchasePrice || ''} onChange={e => updateForm({ purchasePrice: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling">Selling Price (₹) *</Label>
                <Input id="selling" type="number" step="0.01" value={formData.sellingPrice || ''} onChange={e => updateForm({ sellingPrice: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Row 5: Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Current Stock</Label>
                <Input id="stock" type="number" value={formData.currentStock || ''} onChange={e => updateForm({ currentStock: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Minimum Stock Alert</Label>
                <Input id="minStock" type="number" value={formData.minimumStock || ''} onChange={e => updateForm({ minimumStock: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">Batch Number</Label>
                <Input id="batch" value={formData.batchNumber || ''} onChange={e => updateForm({ batchNumber: e.target.value })} />
              </div>
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input id="expiry" type="date" value={formData.expiryDate || ''} onChange={e => updateForm({ expiryDate: e.target.value || null })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? 'Update Product' : 'Add Product'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
            <DialogDescription>This action cannot be undone. This will permanently delete the product.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Backup & Delete All Products?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>This will permanently delete <strong>all {products.length} products</strong> and their stock levels from the database.</p>
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg border">
                <strong>Security Measure:</strong> A backup Excel file containing all products and details will be generated and downloaded to your computer automatically before deletion.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteAllDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAll}>
              Export & Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
