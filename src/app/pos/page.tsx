'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { db } from '@/db';
import type { Product, Customer, Invoice, InvoiceItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateItemGST, calculateInvoiceGST } from '@/lib/invoice/gst-calculator';
import { generateInvoiceNumber } from '@/lib/invoice/number-generator';
import { ThermalReceipt } from '@/components/pos/ThermalReceipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Zap,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  Keyboard,
  Coins,
  QrCode,
  CreditCard,
  User,
  Phone,
  Layers,
  X,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface HeldBill {
  id: string;
  timestamp: number;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  paymentMode: string;
  discount: number;
  discountType: 'percentage' | 'amount';
  totalAmount: number;
}

export default function POSPage() {
  // Live queries
  const products = useLiveQuery(() => db.products.where('isActive').equals(1).toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  // POS State
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [searchCatalog, setSearchCatalog] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Credit'>('Cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'amount'>('amount');
  const [redeemedLoyaltyPoints, setRedeemedLoyaltyPoints] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');

  // Match active customer for loyalty wallet
  const activeCustomer = useMemo(() => {
    const cleanPhone = customerPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const byPhone = customers.find(c => c.phone && c.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)));
      if (byPhone) return byPhone;
    }
    if (customerName && customerName !== 'Walk-in Customer') {
      return customers.find(c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim());
    }
    return null;
  }, [customers, customerName, customerPhone]);

  // Held Bills queue
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Completed Invoice & Thermal Receipt Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Time state
  const [currentTime, setCurrentTime] = useState<string>('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto focus barcode input on mount and whenever cart modal closes
  useEffect(() => {
    if (!isPrintModalOpen && !isHeldModalOpen && !isShortcutsOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [isPrintModalOpen, isHeldModalOpen, isShortcutsOpen]);

  // Audio synthesizer beep for barcode scanning
  const playBeep = (type: 'success' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pleasant A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // AudioContext unavailable
    }
  };

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Catalog filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch =
        !searchCatalog ||
        p.name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchCatalog.toLowerCase()) ||
        p.batchNumber?.toLowerCase().includes(searchCatalog.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchCatalog]);

  // Tax and totals calculations
  const totals = useMemo(() => {
    return calculateInvoiceGST(
      cartItems,
      false, // isTaxInclusive
      false, // isInterState (intra-state local POS)
      overallDiscount,
      overallDiscountType
    );
  }, [cartItems, overallDiscount, overallDiscountType]);

  // Auto-set tendered when total changes if Cash
  useEffect(() => {
    if (paymentMode === 'Cash' && totals.totalAmount > 0 && cashTendered < totals.totalAmount) {
      setCashTendered(totals.totalAmount);
    }
  }, [totals.totalAmount, paymentMode]);

  const changeDue = Math.max(0, cashTendered - totals.totalAmount);

  // Add product to cart (or increment qty if already present)
  const addProductToCart = (p: Product) => {
    setCartItems(prev => {
      const existingIdx = prev.findIndex(item => item.productId === p.id);
      if (existingIdx >= 0) {
        // Increment quantity
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.quantity + 1;
        const gstResult = calculateItemGST(
          {
            quantity: newQty,
            rate: existing.rate,
            discount: existing.discount,
            discountType: existing.discountType,
            gstRate: existing.gstRate,
          },
          false,
          false
        );
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          taxableAmount: gstResult.taxableAmount,
          cgst: gstResult.cgst,
          sgst: gstResult.sgst,
          igst: gstResult.igst,
          total: gstResult.total,
        };
        return updated;
      }

      // Add new item
      const gstResult = calculateItemGST(
        {
          quantity: 1,
          rate: p.sellingPrice,
          discount: 0,
          discountType: 'amount',
          gstRate: p.gstPercentage || 18,
        },
        false,
        false
      );

      const newItem: InvoiceItem = {
        productId: p.id || null,
        description: p.name,
        hsnCode: p.hsnCode || '',
        quantity: 1,
        unit: p.unit || 'PCS',
        rate: p.sellingPrice,
        discount: 0,
        discountType: 'amount',
        taxableAmount: gstResult.taxableAmount,
        gstRate: p.gstPercentage || 18,
        cgst: gstResult.cgst,
        sgst: gstResult.sgst,
        igst: gstResult.igst,
        total: gstResult.total,
        imeiOrSerialNo: '',
        modelNumber: p.sku || '',
      };
      return [...prev, newItem];
    });

    playBeep('success');
  };

  // Barcode Scan Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Search product by exact barcode, SKU, or batch, then case-insensitive name
    const found =
      products.find(p => p.sku?.toLowerCase() === query.toLowerCase()) ||
      products.find(p => p.hsnCode?.toLowerCase() === query.toLowerCase()) ||
      products.find(p => p.batchNumber?.toLowerCase() === query.toLowerCase()) ||
      products.find(p => p.name.toLowerCase() === query.toLowerCase()) ||
      products.find(p => p.name.toLowerCase().includes(query.toLowerCase()));

    if (found) {
      addProductToCart(found);
      setBarcodeInput('');
    } else {
      playBeep('error');
      toast.error(`Item not found for barcode: "${query}"`);
    }
  };

  // Quantity changer
  const updateItemQty = (idx: number, delta: number) => {
    setCartItems(prev => {
      const updated = [...prev];
      const item = updated[idx];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      const gstResult = calculateItemGST(
        {
          quantity: newQty,
          rate: item.rate,
          discount: item.discount,
          discountType: item.discountType,
          gstRate: item.gstRate,
        },
        false,
        false
      );
      updated[idx] = {
        ...item,
        quantity: newQty,
        taxableAmount: gstResult.taxableAmount,
        cgst: gstResult.cgst,
        sgst: gstResult.sgst,
        igst: gstResult.igst,
        total: gstResult.total,
      };
      return updated;
    });
  };

  const removeItem = (idx: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setOverallDiscount(0);
    setCashTendered(0);
    setRedeemedLoyaltyPoints(0);
    toast.info('Cart cleared');
  };

  // Hold current bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty. Nothing to hold.');
      return;
    }
    const newHeld: HeldBill = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      timestamp: Date.now(),
      customerName,
      customerPhone,
      items: cartItems,
      paymentMode,
      discount: overallDiscount,
      discountType: overallDiscountType,
      totalAmount: totals.totalAmount,
    };
    setHeldBills(prev => [newHeld, ...prev]);
    clearCart();
    toast.success(`Bill held (${newHeld.id}). Ready for next customer.`);
  };

  // Recall a held bill
  const handleRecallBill = (bill: HeldBill) => {
    setCartItems(bill.items);
    setCustomerName(bill.customerName);
    setCustomerPhone(bill.customerPhone);
    setPaymentMode(bill.paymentMode as any);
    setOverallDiscount(bill.discount);
    setOverallDiscountType(bill.discountType);
    setHeldBills(prev => prev.filter(b => b.id !== bill.id));
    setIsHeldModalOpen(false);
    toast.success(`Recalled bill ${bill.id}`);
  };

  // Fast Checkout & Print
  const handleCheckoutAndPrint = async () => {
    if (cartItems.length === 0) {
      toast.error('Add items to cart before checkout.');
      return;
    }

    try {
      const invNumber = await generateInvoiceNumber('retail_invoice');
      const now = Date.now();

      // Auto-save or update customer in db.customers
      let effectiveCustomerId: number | null = null;
      if (customerName && customerName !== 'Walk-in Customer') {
        const cleanPhone = customerPhone.trim();
        let existingCust = cleanPhone
          ? await db.customers.where('phone').equals(cleanPhone).first()
          : null;
        if (!existingCust) {
          existingCust = await db.customers.where('name').equals(customerName.trim()).first();
        }

        if (existingCust && existingCust.id) {
          effectiveCustomerId = existingCust.id;
          if (cleanPhone && !existingCust.phone) {
            await db.customers.update(existingCust.id, { phone: cleanPhone, updatedAt: now });
          }
        } else {
          effectiveCustomerId = (await db.customers.add({
            name: customerName.trim(),
            phone: cleanPhone,
            email: '',
            address: '',
            city: '',
            state: settings?.companyState || 'Rajasthan',
            pincode: '',
            gstin: '',
            pan: '',
            loyaltyPoints: 0,
            createdAt: now,
            updatedAt: now,
          })) as number;
        }
      }

      const invoiceData: Invoice = {
        invoiceNumber: invNumber,
        invoiceType: 'retail_invoice',
        date: now,
        dueDate: null,
        customerId: effectiveCustomerId,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        customerAddress: '',
        customerGstin: '',
        customerState: settings?.companyState || 'Rajasthan',
        supplierId: null,
        supplierName: '',
        supplierAddress: '',
        supplierGstin: '',
        items: cartItems,
        subtotal: totals.subtotal,
        discount: overallDiscount,
        discountType: overallDiscountType,
        taxableAmount: totals.taxableAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        totalTax: totals.totalTax,
        roundOff: totals.roundOff,
        totalAmount: totals.totalAmount,
        paidAmount: totals.totalAmount,
        balanceDue: 0,
        status: 'paid',
        paymentMode,
        isReverseCharge: false,
        isTaxInclusive: false,
        notes: 'POS Counter Sale',
        termsAndConditions: 'Thank you for your visit!',
        createdAt: now,
        updatedAt: now,
      };

      const newId = await db.invoices.add(invoiceData);
      invoiceData.id = newId as number;

      // Update inventory and stock logs
      for (const item of cartItems) {
        if (item.productId) {
          const prod = await db.products.get(item.productId);
          if (prod) {
            const prevStock = prod.currentStock;
            const newStock = Math.max(0, prevStock - item.quantity);
            await db.products.update(item.productId, { currentStock: newStock });
            await db.stockLogs.add({
              productId: item.productId,
              productName: prod.name,
              type: 'out',
              quantity: item.quantity,
              previousStock: prevStock,
              newStock,
              reference: invNumber,
              referenceType: 'invoice',
              date: now,
            });
          }
        }
      }

      // Update customer loyalty points (earn & redeem)
      if (effectiveCustomerId) {
        const cust = await db.customers.get(effectiveCustomerId);
        if (cust) {
          const currentPts = cust.loyaltyPoints || 0;
          const remainingPts = Math.max(0, currentPts - redeemedLoyaltyPoints);
          const ptsPer100 = settings?.loyaltyPointsPer100 || 1;
          const pointsEarned = Math.floor((totals.totalAmount / 100) * ptsPer100);
          const finalPts = remainingPts + pointsEarned;
          await db.customers.update(effectiveCustomerId, {
            loyaltyPoints: finalPts,
            updatedAt: now,
          });
          if (pointsEarned > 0) {
            toast.info(`+${pointsEarned} loyalty points awarded to customer! (Wallet: ${finalPts} pts)`);
          }
        }
      }

      setCompletedInvoice(invoiceData);
      setIsPrintModalOpen(true);
      toast.success(`Bill ${invNumber} generated!`);
    } catch (err) {
      console.error('POS Checkout Error:', err);
      toast.error('Failed to process checkout');
    }
  };

  // Keyboard shortcut handler (F2, F4, F8, F9, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when modal is open
      if (isPrintModalOpen || isHeldModalOpen || isShortcutsOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        handleCheckoutAndPrint();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setPaymentMode(prev => {
          if (prev === 'Cash') return 'UPI';
          if (prev === 'UPI') return 'Card';
          if (prev === 'Card') return 'Credit';
          return 'Cash';
        });
      } else if (e.key === 'F7') {
        e.preventDefault();
        const discStr = prompt('Enter Discount Amount (₹):', overallDiscount.toString());
        if (discStr !== null) {
          const val = parseFloat(discStr) || 0;
          setOverallDiscount(Math.max(0, val));
          setOverallDiscountType('amount');
          toast.success(`Discount ₹${val} applied`);
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F9') {
        e.preventDefault();
        setIsHeldModalOpen(true);
      } else if (e.key === 'Escape') {
        if (cartItems.length > 0) {
          e.preventDefault();
          clearCart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, isPrintModalOpen, isHeldModalOpen, isShortcutsOpen, paymentMode, totals.totalAmount]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background select-none overflow-hidden animate-in fade-in duration-200">
      {/* POS Top Command Bar */}
      <header className="h-14 px-4 border-b bg-card flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Back to Dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm leading-none text-foreground">POS Quick Billing Counter</h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">High-speed Barcode & Thermal Checkout</p>
            </div>
          </div>
        </div>

        {/* Center Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-xs font-mono font-bold text-foreground">
          <span>{currentTime}</span>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(prev => !prev)}
            className="h-8 w-8 rounded-lg text-muted-foreground"
            title={soundEnabled ? 'Mute scanner chime' : 'Enable scanner chime'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          {/* Held Bills Badge Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHeldModalOpen(true)}
            className="h-8 rounded-lg text-xs gap-1.5 font-bold relative"
          >
            <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>Held Bills</span>
            {heldBills.length > 0 && (
              <Badge className="h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-amber-500 text-white rounded-full">
                {heldBills.length}
              </Badge>
            )}
            <kbd className="hidden lg:inline text-[9px] bg-muted px-1 rounded font-mono text-muted-foreground">F9</kbd>
          </Button>

          {/* Keyboard Shortcuts Guide */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShortcutsOpen(true)}
            className="h-8 rounded-lg text-xs gap-1 font-bold text-muted-foreground"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </Button>
        </div>
      </header>

      {/* POS Workstation Split Area */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left 7 Columns: Product Scanner & Touch Catalog */}
        <div className="col-span-12 lg:col-span-7 flex flex-col border-r overflow-hidden bg-muted/10">
          {/* Active Barcode Scanning Bar */}
          <div className="p-3 bg-card border-b">
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode or type SKU / Item Name and press Enter..."
                className="pl-11 pr-24 h-11 text-sm font-medium bg-background border-primary/40 focus-visible:ring-primary shadow-xs rounded-xl"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button type="submit" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg">
                  Add Item
                </Button>
              </div>
            </form>
          </div>

          {/* Catalog Filter Tabs & Search */}
          <div className="px-3 pt-2.5 pb-2 flex items-center justify-between gap-2 border-b bg-card/60">
            {/* Category horizontal scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="h-7 text-xs px-2.5 rounded-lg shrink-0 font-bold"
              >
                All
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="h-7 text-xs px-2.5 rounded-lg shrink-0 font-medium"
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Catalog search box */}
            <div className="relative w-44 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchCatalog}
                onChange={e => setSearchCatalog(e.target.value)}
                placeholder="Filter grid..."
                className="pl-8 h-7 text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Touch-Friendly Products Grid */}
          <div className="flex-1 p-3 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <Barcode className="h-12 w-12 stroke-[1.5] mb-2 opacity-30" />
                <p className="text-sm font-bold">No products found</p>
                <p className="text-xs mt-1">Scan a barcode or add inventory in Products section</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProductToCart(p)}
                    className="p-3 text-left rounded-xl bg-card border border-border/60 hover:border-primary hover:shadow-md transition-all flex flex-col justify-between active:scale-98 group"
                  >
                    <div>
                      <p className="font-bold text-xs text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        SKU: {p.sku || '-'}
                      </p>
                    </div>

                    <div className="mt-3 flex items-end justify-between pt-2 border-t border-border/40">
                      <div>
                        <span className="text-xs font-black font-mono text-foreground block">
                          {formatCurrency(p.sellingPrice)}
                        </span>
                        <span className="text-[9.5px] text-muted-foreground">
                          GST: {p.gstPercentage || 18}%
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 py-0 h-4 font-mono ${
                          p.currentStock <= p.minimumStock
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Cart & Super-Fast Checkout */}
        <div className="col-span-12 lg:col-span-5 flex flex-col bg-card overflow-hidden">
          {/* Customer Fast Identification */}
          <div className="p-3 border-b bg-muted/20 grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3 text-primary" /> Customer Name
              </Label>
              <Input
                list="pos-customer-datalist"
                value={customerName}
                onChange={e => {
                  const val = e.target.value;
                  setCustomerName(val);
                  const matched = customers.find(c => c.name.toLowerCase() === val.trim().toLowerCase());
                  if (matched && matched.phone) {
                    setCustomerPhone(matched.phone);
                  }
                }}
                placeholder="Walk-in Customer"
                className="h-8 text-xs font-medium mt-1 bg-background"
              />
              <datalist id="pos-customer-datalist">
                {customers.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.phone ? `${c.phone} · ` : ''}{c.city || ''}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-600" /> Phone / WhatsApp
              </Label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={e => {
                  setCustomerPhone(e.target.value);
                  const cleanDigits = e.target.value.replace(/\D/g, '');
                  if (cleanDigits.length >= 10) {
                    const matched = customers.find(c => c.phone && c.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10)));
                    if (matched) {
                      setCustomerName(matched.name);
                    }
                  }
                }}
                placeholder="10-digit number"
                className="h-8 text-xs font-mono mt-1 bg-background"
              />
            </div>

            {/* Loyalty Points Redemption Widget */}
            {activeCustomer && (activeCustomer.loyaltyPoints ?? 0) > 0 && (
              <div className="col-span-2 flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>
                    <strong>{activeCustomer.loyaltyPoints}</strong> Loyalty Points Available
                  </span>
                </div>
                {redeemedLoyaltyPoints > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRedeemedLoyaltyPoints(0);
                      setOverallDiscount(0);
                      toast.info('Cancelled loyalty discount');
                    }}
                    className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2 font-bold"
                  >
                    Cancel (-₹{redeemedLoyaltyPoints * (settings?.loyaltyPointRedeemValue || 1)})
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const pts = activeCustomer.loyaltyPoints || 0;
                      const redeemRate = settings?.loyaltyPointRedeemValue || 1;
                      const maxDiscount = Math.min(pts * redeemRate, totals.subtotal);
                      const ptsToUse = Math.ceil(maxDiscount / redeemRate);
                      setRedeemedLoyaltyPoints(ptsToUse);
                      setOverallDiscount(maxDiscount);
                      setOverallDiscountType('amount');
                      toast.success(`Redeemed ${ptsToUse} points for ₹${maxDiscount} discount!`);
                    }}
                    className="h-6 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 rounded-lg shadow-xs"
                  >
                    Redeem Points
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50 p-2 space-y-1">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-2">
                  <Zap className="h-6 w-6 opacity-30 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground">Cart is Empty</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Scan a barcode or tap products from the left catalog to start billing.
                </p>
              </div>
            ) : (
              cartItems.map((item, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{item.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                      <span>Rate: {formatCurrency(item.rate)}</span>
                      <span>GST: {item.gstRate}%</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-background border rounded-lg p-0.5">
                    <button
                      onClick={() => updateItemQty(idx, -1)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-bold font-mono text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateItemQty(idx, 1)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="text-right min-w-16">
                    <span className="font-black font-mono text-foreground block">
                      {formatCurrency(item.total)}
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-[10px] text-destructive hover:underline opacity-60 hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout & Totals Summary Panel */}
          <div className="p-3 border-t bg-muted/20 space-y-3 shrink-0">
            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Items ({cartItems.length}):</span>
                <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Tax (GST):</span>
                <span className="font-mono">{formatCurrency(totals.totalTax)}</span>
              </div>
              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Round Off:</span>
                  <span className="font-mono">{totals.roundOff > 0 ? `+${totals.roundOff.toFixed(2)}` : totals.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1.5 border-t border-border/80">
                <span className="font-extrabold text-sm text-foreground">Grand Total:</span>
                <span className="text-2xl font-black font-mono text-primary">
                  {formatCurrency(totals.totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(['Cash', 'UPI', 'Card', 'Credit'] as const).map(mode => (
                <Button
                  key={mode}
                  type="button"
                  variant={paymentMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMode(mode)}
                  className="h-8 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                >
                  {mode === 'Cash' && <Coins className="h-3 w-3" />}
                  {mode === 'UPI' && <QrCode className="h-3 w-3" />}
                  {mode === 'Card' && <CreditCard className="h-3 w-3" />}
                  {mode === 'Credit' && <User className="h-3 w-3" />}
                  <span>{mode}</span>
                </Button>
              ))}
            </div>

            {/* Cash Tendered Calculator (if mode === Cash) */}
            {paymentMode === 'Cash' && totals.totalAmount > 0 && (
              <div className="p-2 rounded-xl bg-background border space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cash Received:</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={cashTendered || ''}
                      onChange={e => setCashTendered(Number(e.target.value))}
                      className="h-7 w-28 text-right font-mono font-bold text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Change to Return:</span>
                  <span className={`font-mono ${changeDue > 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                    {formatCurrency(changeDue)}
                  </span>
                </div>
                {/* Fast Cash Quick Presets */}
                <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
                  {[totals.totalAmount, 100, 200, 500, 1000, 2000].map((amt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => setCashTendered(amt)}
                      className="h-6 text-[10px] px-2 rounded font-mono shrink-0"
                    >
                      ₹{amt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="grid grid-cols-12 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="col-span-3 h-11 text-xs rounded-xl font-bold text-destructive hover:bg-destructive/10"
                title="Clear current cart (Esc)"
              >
                Clear <kbd className="hidden xl:inline text-[9px] font-mono opacity-60">Esc</kbd>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleHoldBill}
                disabled={cartItems.length === 0}
                className="col-span-3 h-11 text-xs rounded-xl font-bold gap-1"
                title="Hold Bill (F8)"
              >
                <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                Hold <kbd className="hidden xl:inline text-[9px] font-mono opacity-60">F8</kbd>
              </Button>

              <Button
                onClick={handleCheckoutAndPrint}
                disabled={cartItems.length === 0}
                className="col-span-6 h-11 text-xs sm:text-sm font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5"
                title="Checkout & Print Receipt (F2)"
              >
                <Printer className="h-4 w-4" />
                <span>Pay & Print</span>
                <kbd className="hidden xl:inline text-[10px] font-mono bg-emerald-700 px-1.5 py-0.5 rounded text-white/90">F2</kbd>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== THERMAL RECEIPT PRINT MODAL ==================== */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Bill Completed
              </DialogTitle>
              {/* Paper Roll Width Selector */}
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
                <Button
                  size="sm"
                  variant={paperWidth === '58mm' ? 'default' : 'ghost'}
                  onClick={() => setPaperWidth('58mm')}
                  className="h-6 px-2 text-[10px] rounded"
                >
                  58mm (2")
                </Button>
                <Button
                  size="sm"
                  variant={paperWidth === '80mm' ? 'default' : 'ghost'}
                  onClick={() => setPaperWidth('80mm')}
                  className="h-6 px-2 text-[10px] rounded"
                >
                  80mm (3")
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs">
              Invoice #{completedInvoice?.invoiceNumber} saved successfully. Ready to print.
            </DialogDescription>
          </DialogHeader>

          {/* Thermal Receipt Visual Preview Box */}
          <div className="my-2 p-3 bg-muted/40 rounded-xl border flex justify-center max-h-96 overflow-y-auto">
            {completedInvoice && settings && (
              <ThermalReceipt
                invoice={completedInvoice}
                settings={settings}
                paperWidth={paperWidth}
                cashTendered={cashTendered}
                changeDue={changeDue}
              />
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsPrintModalOpen(false);
                clearCart();
              }}
              className="w-full sm:w-auto"
            >
              Done / Next Customer
            </Button>
            <Button
              onClick={() => window.print()}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
            >
              <Printer className="h-4 w-4" /> Print Thermal Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== HELD BILLS MODAL ==================== */}
      <Dialog open={isHeldModalOpen} onOpenChange={setIsHeldModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-amber-500" /> Held Bills ({heldBills.length})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Resume any held customer cart or remove abandoned bills.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 max-h-80 overflow-y-auto">
            {heldBills.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No held bills. Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">F8</kbd> to put a cart on hold.
              </div>
            ) : (
              heldBills.map(bill => (
                <div key={bill.id} className="p-3 rounded-xl border bg-card flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground font-mono">{bill.id}</span>
                      <span className="text-[11px] text-muted-foreground">{bill.customerName}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {bill.items.length} items • Held at {new Date(bill.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black font-mono text-sm text-foreground">
                      {formatCurrency(bill.totalAmount)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleRecallBill(bill)}
                      className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-1"
                    >
                      <PlayCircle className="h-3.5 w-3.5" /> Recall
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setHeldBills(prev => prev.filter(b => b.id !== bill.id))}
                      className="h-8 w-8 text-destructive rounded-lg"
                      title="Discard held bill"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHeldModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== KEYBOARD SHORTCUTS GUIDE MODAL ==================== */}
      <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" /> POS Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fast-track your checkout speed without touching the mouse:
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y text-xs py-2">
            <div className="py-2 flex items-center justify-between">
              <span>Checkout & Print</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono font-bold text-primary">F2</kbd>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span>Cycle Payment Mode (Cash/UPI/Card)</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono font-bold">F4</kbd>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span>Hold Current Bill</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono font-bold text-amber-500">F8</kbd>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span>Recall Held Bills</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono font-bold text-primary">F9</kbd>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span>Clear Cart</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono font-bold text-destructive">Esc</kbd>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsShortcutsOpen(false)} className="w-full">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
