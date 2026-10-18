'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import JsBarcode from 'jsbarcode';
import { db } from '@/db';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Barcode,
  Printer,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Settings2,
  Layers,
  Store,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

// Helper Barcode SVG component using JsBarcode
function BarcodeSVG({
  value,
  width = 1.3,
  height = 30,
  fontSize = 9,
  displayValue = true,
}: {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin: 2,
          font: 'monospace',
          textMargin: 1,
          lineColor: '#000000',
          background: 'transparent',
        });
      } catch {
        // Fallback or retry
      }
    }
  }, [value, width, height, fontSize, displayValue]);

  return <svg ref={svgRef} className="max-w-full mx-auto" />;
}

type TemplateType = 'a4-24' | 'a4-40' | 'thermal-roll';

export default function BarcodeStickerGeneratorPage() {
  const products = useLiveQuery(() => db.products.where('isActive').equals(1).toArray()) || [];
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [template, setTemplate] = useState<TemplateType>('a4-24');

  // Quantity to print for each product (productId -> quantity)
  const [labelQuantities, setLabelQuantities] = useState<Record<number, number>>({});

  // Label display customization options
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showTaxText, setShowTaxText] = useState(true);
  const [customStoreTitle, setCustomStoreTitle] = useState('');

  // Initial populate with default 2 stickers for all products if empty
  useEffect(() => {
    if (products.length > 0 && Object.keys(labelQuantities).length === 0) {
      const initial: Record<number, number> = {};
      products.forEach(p => {
        if (p.id) initial[p.id] = 2;
      });
      setLabelQuantities(initial);
    }
  }, [products]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.hsnCode?.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  // Total labels to print
  const totalLabelsCount = useMemo(() => {
    return Object.values(labelQuantities).reduce((acc, q) => acc + (q > 0 ? q : 0), 0);
  }, [labelQuantities]);

  // Flattened array of label items to render
  const labelItemsToPrint = useMemo(() => {
    const list: Array<{ product: Product; code: string; index: number }> = [];
    let counter = 0;
    products.forEach(p => {
      if (p.id && labelQuantities[p.id] && labelQuantities[p.id] > 0) {
        const qty = labelQuantities[p.id];
        const code = p.sku?.trim() || `PRD${p.id.toString().padStart(6, '0')}`;
        for (let i = 0; i < qty; i++) {
          list.push({ product: p, code, index: counter++ });
        }
      }
    });
    return list;
  }, [products, labelQuantities]);

  const updateQuantity = (productId: number, delta: number) => {
    setLabelQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  };

  const setAllQuantities = (qty: number) => {
    const updated: Record<number, number> = {};
    products.forEach(p => {
      if (p.id) updated[p.id] = qty;
    });
    setLabelQuantities(updated);
    toast.success(`Set quantity to ${qty} for all items`);
  };

  const setQuantitiesToStock = () => {
    const updated: Record<number, number> = {};
    products.forEach(p => {
      if (p.id) updated[p.id] = Math.max(1, p.currentStock || 1);
    });
    setLabelQuantities(updated);
    toast.success('Quantities matched to current inventory stock');
  };

  const handlePrint = () => {
    if (labelItemsToPrint.length === 0) {
      toast.error('No labels selected to print. Increase quantity for at least one item.');
      return;
    }
    window.print();
  };

  const effectiveStoreName = customStoreTitle.trim() || settings?.companyName || 'RETAIL STORE';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Print Styles for zero-waste exact sticker dimensions */}
      <style jsx global>{`
        @media print {
          /* Hide non-printable UI */
          body * {
            visibility: hidden;
          }
          #barcode-print-canvas,
          #barcode-print-canvas * {
            visibility: visible;
          }
          #barcode-print-canvas {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }

          /* Template Specific Page Settings */
          ${template === 'a4-24'
            ? `
            @page {
              size: A4 portrait;
              margin: 8mm 6mm;
            }
            .sticker-sheet-grid {
              display: grid !important;
              grid-template-columns: repeat(3, 70mm) !important;
              grid-auto-rows: 37mm !important;
              gap: 2mm !important;
              page-break-after: always;
            }
            .sticker-label-card {
              width: 70mm !important;
              height: 37mm !important;
              padding: 2mm !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              border: 0.5px dashed #cccccc !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              overflow: hidden !important;
            }
          `
            : ''}

          ${template === 'a4-40'
            ? `
            @page {
              size: A4 portrait;
              margin: 7mm 5mm;
            }
            .sticker-sheet-grid {
              display: grid !important;
              grid-template-columns: repeat(4, 48.5mm) !important;
              grid-auto-rows: 25.4mm !important;
              gap: 1.5mm !important;
              page-break-after: always;
            }
            .sticker-label-card {
              width: 48.5mm !important;
              height: 25.4mm !important;
              padding: 1.5mm !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              border: 0.5px dashed #cccccc !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              overflow: hidden !important;
            }
          `
            : ''}

          ${template === 'thermal-roll'
            ? `
            @page {
              size: 50mm 25mm;
              margin: 0mm;
            }
            .sticker-sheet-grid {
              display: block !important;
            }
            .sticker-label-card {
              width: 50mm !important;
              height: 25mm !important;
              padding: 1.5mm !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              border: none !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              overflow: hidden !important;
            }
          `
            : ''}
        }
      `}</style>

      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Barcode & Price Sticker Generator</h1>
              <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">
                Code128 Ready
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Print batch barcode and price tags for A4 sheets or continuous thermal rolls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-xl h-10 px-4"
          >
            <Printer className="h-4 w-4" />
            <span>Print {totalLabelsCount} Labels</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Product Selector & Quantity Steppers */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" /> Select Products to Print
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose items and set the number of stickers needed
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {totalLabelsCount} stickers queued
                </Badge>
              </div>

              {/* Fast Bulk Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllQuantities(1)}
                  className="h-7 text-[11px] font-medium"
                >
                  1 Each
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllQuantities(5)}
                  className="h-7 text-[11px] font-medium"
                >
                  5 Each
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setQuantitiesToStock}
                  className="h-7 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                >
                  Match Stock Qty
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAllQuantities(0)}
                  className="h-7 text-[11px] font-medium text-muted-foreground hover:text-destructive ml-auto"
                >
                  Clear All
                </Button>
              </div>

              {/* Filter inputs */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search product, SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-[520px] overflow-y-auto divide-y divide-border/60">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No active products match your search.
                </div>
              ) : (
                filteredProducts.map(p => {
                  const qty = (p.id && labelQuantities[p.id]) || 0;
                  const isSelected = qty > 0;

                  return (
                    <div
                      key={p.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs text-foreground truncate">{p.name}</p>
                          {isSelected && (
                            <Badge className="h-4 px-1 text-[9px] font-mono bg-primary text-primary-foreground">
                              {qty}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                          <span>SKU: {p.sku || `PRD${p.id}`}</span>
                          <span>•</span>
                          <span className="font-bold text-foreground">{formatCurrency(p.sellingPrice)}</span>
                          <span>•</span>
                          <span>Stock: {p.currentStock}</span>
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-1 shrink-0 bg-background border rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => p.id && updateQuantity(p.id, -1)}
                          disabled={qty <= 0}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            if (p.id) {
                              setLabelQuantities(prev => ({ ...prev, [p.id!]: val }));
                            }
                          }}
                          className="w-10 text-center font-bold font-mono text-xs bg-transparent border-none outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => p.id && updateQuantity(p.id, 1)}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (7 Cols): Sticker Layout, Settings & Live Sheet Preview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Controls Bar */}
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold">Sticker Sheet Format & Design</CardTitle>
                </div>

                {/* Template Selector */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                  <Button
                    type="button"
                    size="sm"
                    variant={template === 'a4-24' ? 'default' : 'ghost'}
                    onClick={() => setTemplate('a4-24')}
                    className="h-7 text-xs font-bold rounded-lg"
                  >
                    A4 24-Up (3×8)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={template === 'a4-40' ? 'default' : 'ghost'}
                    onClick={() => setTemplate('a4-40')}
                    className="h-7 text-xs font-bold rounded-lg"
                  >
                    A4 40-Up (4×10)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={template === 'thermal-roll' ? 'default' : 'ghost'}
                    onClick={() => setTemplate('thermal-roll')}
                    className="h-7 text-xs font-bold rounded-lg"
                  >
                    Thermal 50×25mm
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-3">
              {/* Optional Store Name Override */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1">
                  <Label className="text-xs font-medium text-muted-foreground">Header Store Name</Label>
                  <Input
                    placeholder={settings?.companyName || 'Store Name'}
                    value={customStoreTitle}
                    onChange={e => setCustomStoreTitle(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 border-t text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showStoreName} onCheckedChange={setShowStoreName} />
                  <span>Show Store Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showProductName} onCheckedChange={setShowProductName} />
                  <span>Show Product Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showBarcodeText} onCheckedChange={setShowBarcodeText} />
                  <span>Show Barcode Code</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                  <span>Show Selling Price</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showMrp} onCheckedChange={setShowMrp} />
                  <span>Show MRP Cross</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={showTaxText} onCheckedChange={setShowTaxText} />
                  <span>"Incl. all taxes"</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Live Print Sheet Preview */}
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden bg-muted/20">
            <CardHeader className="p-3 border-b bg-card flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Live Preview: {template === 'a4-24' ? 'A4 24-Up (70×37mm)' : template === 'a4-40' ? 'A4 40-Up (48.5×25.4mm)' : 'Thermal Roll (50×25mm)'}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Showing {labelItemsToPrint.length} labels
              </span>
            </CardHeader>

            <CardContent className="p-4 max-h-[640px] overflow-y-auto">
              {labelItemsToPrint.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Barcode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold text-foreground">No Labels Selected</p>
                  <p className="text-xs mt-1">
                    Increase product quantities on the left panel to preview printable stickers.
                  </p>
                </div>
              ) : (
                <div id="barcode-print-canvas" className="bg-white text-black p-4 rounded-xl shadow-md border mx-auto">
                  <div
                    className={
                      template === 'a4-24'
                        ? 'sticker-sheet-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'
                        : template === 'a4-40'
                        ? 'sticker-sheet-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'
                        : 'sticker-sheet-grid space-y-3'
                    }
                  >
                    {labelItemsToPrint.map((item, idx) => {
                      const p = item.product;
                      const hasMrp = p.purchasePrice && p.purchasePrice > p.sellingPrice;
                      const mrpValue = hasMrp ? p.purchasePrice : Math.round(p.sellingPrice * 1.15);

                      return (
                        <div
                          key={idx}
                          className="sticker-label-card bg-white text-black border border-dashed border-gray-300 rounded-lg p-2 flex flex-col items-center justify-between text-center select-none overflow-hidden"
                          style={{
                            minHeight: template === 'a4-24' ? '140px' : template === 'a4-40' ? '105px' : '100px',
                          }}
                        >
                          {/* Store Name */}
                          {showStoreName && (
                            <div className="w-full text-[9px] font-bold uppercase tracking-wider text-gray-700 truncate border-b border-gray-200 pb-0.5">
                              {effectiveStoreName}
                            </div>
                          )}

                          {/* Product Name */}
                          {showProductName && (
                            <div className="w-full text-[11px] font-black leading-tight text-gray-900 line-clamp-1 mt-0.5 px-0.5">
                              {p.name}
                            </div>
                          )}

                          {/* Barcode Vector Graphic */}
                          <div className="my-0.5 w-full flex items-center justify-center overflow-hidden">
                            <BarcodeSVG
                              value={item.code}
                              width={template === 'a4-40' ? 1.0 : 1.25}
                              height={template === 'a4-40' ? 22 : 28}
                              fontSize={showBarcodeText ? 9 : 0}
                              displayValue={showBarcodeText}
                            />
                          </div>

                          {/* Price & MRP Block */}
                          <div className="w-full flex items-center justify-center gap-2 pt-0.5 border-t border-gray-200">
                            {showMrp && (
                              <span className="text-[10px] text-gray-500 line-through">
                                MRP ₹{mrpValue}
                              </span>
                            )}
                            {showPrice && (
                              <span className="text-xs font-black text-black">
                                ₹{p.sellingPrice.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Tax Note */}
                          {showTaxText && (
                            <div className="text-[7.5px] text-gray-500 leading-none">
                              (Incl. of all taxes)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
