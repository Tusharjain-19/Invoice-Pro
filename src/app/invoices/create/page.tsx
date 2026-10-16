'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/db';
import { calculateItemGST, calculateInvoiceGST, isInterStateTransaction } from '@/lib/invoice/gst-calculator';
import { generateInvoiceNumber } from '@/lib/invoice/number-generator';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText, Plus, Trash2, Search, ArrowLeft, Save, IndianRupee, ShoppingCart, UserCheck, ShieldAlert,
  Smartphone, Hash, CheckCircle2, QrCode, Tag, Layers, Check, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice, InvoiceItem, Product, Customer, InvoiceType, InvoiceStatus, Loan } from '@/types';
import { INVOICE_TYPES, INVOICE_TYPE_LABELS, PAYMENT_MODES, INDIAN_STATES, FINANCE_PARTNERS, UNITS } from '@/types';

export const DEFAULT_INVOICE_TERMS = `1. Goods once sold will not be taken back or exchanged without prior authorization.
2. Warranty claims, if any, are covered directly by respective manufacturers.
3. Interest @ 18% p.a. will be charged on overdue payments after due date.
4. All disputes are subject to local jurisdiction only.`;

export const DEFAULT_INVOICE_NOTES = `Thank you for your business! Please quote invoice number for all correspondence. Payments can be settled via UPI, Card, or Bank Transfer.`;

export default function CreateInvoicePage() {
  const router = useRouter();

  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const customers = useLiveQuery(() => db.customers.toArray()) ?? [];
  const products = useLiveQuery(() => db.products.toArray()) ?? [];

  // Form State
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('tax_invoice');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('custom');

  // Client Details
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerState, setCustomerState] = useState('Rajasthan');
  const [customerPhone, setCustomerPhone] = useState('');

  // Items / Cart State
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Totals Configurations
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, number>>({
    Cash: 0,
    UPI: 0,
    'Bank Transfer': 0,
    Cheque: 0,
    Card: 0,
    Credit: 0,
    EMI: 0,
  });
  const [activeSplitModes, setActiveSplitModes] = useState<string[]>(['Cash']);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'amount'>('amount');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);
  const [isReverseCharge, setIsReverseCharge] = useState<boolean>(false);
  const [notes, setNotes] = useState(DEFAULT_INVOICE_NOTES);
  const [terms, setTerms] = useState(DEFAULT_INVOICE_TERMS);

  // EMI / Loan State details
  const [emiType, setEmiType] = useState<'store' | 'finance' | 'credit'>('store');
  const [emiDownPayment, setEmiDownPayment] = useState<number>(0);
  const [emiInterestRate, setEmiInterestRate] = useState<number>(0);
  const [emiInterestType, setEmiInterestType] = useState<'none' | 'flat' | 'reducing'>('none');
  const [emiTenure, setEmiTenure] = useState<number>(6);
  const [emiFirstDueDate, setEmiFirstDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [financePartnerName, setFinancePartnerName] = useState<string>('Bajaj Finance');
  const [financeRefNo, setFinanceRefNo] = useState<string>('');
  const [emiGovtIdType, setEmiGovtIdType] = useState<string>('Aadhaar');
  const [emiGovtIdNumber, setEmiGovtIdNumber] = useState<string>('');

  // Handle Split Payment calculations and formatting
  useEffect(() => {
    if (!isSplitPayment) return;

    const activeSplits = Object.entries(splitAmounts)
      .filter(([_, amt]) => amt > 0);

    // Initial paid amount excludes Store EMI and Credit, as they are outstanding debt
    const sumPaid = activeSplits.reduce((sum, [mode, amt]) => {
      if (mode === 'Credit') return sum;
      if (mode === 'EMI' && emiType === 'store') return sum;
      return sum + amt;
    }, 0);
    setPaidAmount(sumPaid);

    if (activeSplits.length === 0) {
      setPaymentMode('Cash');
    } else {
      const modeString = activeSplits
        .map(([mode, amt]) => `${mode} (₹${amt})`)
        .join(' + ');
      setPaymentMode(modeString);
    }
  }, [isSplitPayment, splitAmounts, emiType]);

  // Auto-generate invoice number when type changes
  useEffect(() => {
    async function loadNumber() {
      if (invoiceType) {
        const nextNum = await generateInvoiceNumber(invoiceType);
        setInvoiceNumber(nextNum);
      }
    }
    loadNumber();
  }, [invoiceType]);

  // Set default terms & conditions and notes from settings
  useEffect(() => {
    if (settings) {
      if (settings.termsAndConditions) {
        setTerms(settings.termsAndConditions);
      }
      if (settings.invoiceFooterNotes) {
        setNotes(settings.invoiceFooterNotes);
      }
      setCustomerState(settings.companyState || 'Rajasthan');
    }
  }, [settings]);

  // Load customer details when selected
  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    if (id === 'custom') {
      setCustomerName('');
      setCustomerAddress('');
      setCustomerGstin('');
      setCustomerState(settings?.companyState || 'Rajasthan');
      setCustomerPhone('');
    } else {
      const cust = customers.find(c => String(c.id) === id);
      if (cust) {
        setCustomerName(cust.name);
        setCustomerAddress(`${cust.address || ''}, ${cust.city || ''}, ${cust.pincode || ''}`);
        setCustomerGstin(cust.gstin || '');
        setCustomerState(cust.state || 'Rajasthan');
        setCustomerPhone(cust.phone || '');
      }
    }
  };

  // Search products
  const searchedProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p =>
      p.isActive && (
        (p.name?.toLowerCase().includes(productSearch.toLowerCase()) ?? false) ||
        (p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ?? false) ||
        (p.hsnCode?.toLowerCase().includes(productSearch.toLowerCase()) ?? false)
      )
    );
  }, [products, productSearch]);

  const isInterState = useMemo(() => {
    if (!settings?.companyState) return false;
    return isInterStateTransaction(settings.companyState, customerState);
  }, [settings, customerState]);

// Helper to generate a realistic 15-digit IMEI with Luhn checksum
function generateRandomIMEI(): string {
  let imei = '86';
  for (let i = 0; i < 12; i++) {
    imei += Math.floor(Math.random() * 10);
  }
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(imei[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return imei + checkDigit;
}

// Helper to generate unique product serial number
function generateProductSerial(prefix: string = 'SN'): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${dateStr}-${randomPart}`;
}

  // Add a blank custom item
  const addBlankItem = () => {
    const newItem: InvoiceItem = {
      productId: null,
      description: '',
      hsnCode: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      discount: 0,
      discountType: 'amount',
      taxableAmount: 0,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
      imeiOrSerialNo: '',
      modelNumber: '',
    };
    setCartItems(prev => [...prev, newItem]);
    toast.success('Added blank invoice item');
  };

  // Add Product to Cart
  const addProductToCart = (p: Product) => {
    const existing = cartItems.find(item => item.productId === p.id);
    if (existing) {
      toast.error('Item is already added to invoice. Adjust its quantity.');
      setProductSearch('');
      setShowProductDropdown(false);
      return;
    }

    const newItem: InvoiceItem = {
      productId: p.id!,
      description: p.name,
      hsnCode: p.hsnCode || '',
      quantity: 1,
      unit: p.unit || 'PCS',
      rate: p.sellingPrice,
      discount: 0,
      discountType: 'amount',
      taxableAmount: 0,
      gstRate: p.gstPercentage || 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
      imeiOrSerialNo: '',
      modelNumber: p.sku || '',
    };

    // Calculate initial item taxes
    const result = calculateItemGST(
      {
        quantity: newItem.quantity,
        rate: newItem.rate,
        discount: newItem.discount,
        discountType: newItem.discountType,
        gstRate: newItem.gstRate,
      },
      isTaxInclusive,
      isInterState
    );

    newItem.taxableAmount = result.taxableAmount;
    newItem.cgst = result.cgst;
    newItem.sgst = result.sgst;
    newItem.igst = result.igst;
    newItem.total = result.total;

    setCartItems(prev => [...prev, newItem]);
    setProductSearch('');
    setShowProductDropdown(false);
    toast.success(`${p.name} added to invoice`);
  };

  // Update Cart Item quantity, rate, discount, etc.
  const updateCartItem = (idx: number, updates: Partial<InvoiceItem>) => {
    setCartItems(prev => {
      const items = [...prev];
      const current = { ...items[idx], ...updates };

      const result = calculateItemGST(
        {
          quantity: current.quantity,
          rate: current.rate,
          discount: current.discount,
          discountType: current.discountType,
          gstRate: current.gstRate,
        },
        isTaxInclusive,
        isInterState
      );

      current.taxableAmount = result.taxableAmount;
      current.cgst = result.cgst;
      current.sgst = result.sgst;
      current.igst = result.igst;
      current.total = result.total;

      items[idx] = current;
      return items;
    });
  };

  const removeCartItem = (idx: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  const adjustInputRef = useRef<HTMLInputElement>(null);

  const handleAdjustFinalAmount = (targetAmount: number) => {
    if (cartItems.length === 0) {
      toast.error('Add at least one item first');
      return;
    }
    const currentTotal = totals.totalAmount;
    if (currentTotal <= 0) {
      toast.error('Current total must be greater than zero to adjust');
      return;
    }

    const factor = targetAmount / currentTotal;

    setCartItems(prev => {
      const updated = prev.map(item => {
        const newRate = Math.round(item.rate * factor * 100) / 100;
        
        const result = calculateItemGST(
          {
            quantity: item.quantity,
            rate: newRate,
            discount: item.discount,
            discountType: item.discountType,
            gstRate: item.gstRate,
          },
          isTaxInclusive,
          isInterState
        );

        return {
          ...item,
          rate: newRate,
          taxableAmount: result.taxableAmount,
          cgst: result.cgst,
          sgst: result.sgst,
          igst: result.igst,
          total: result.total,
        };
      });

      // Recalculate temp total to absorb any rounding error on the last item
      const tempTotals = calculateInvoiceGST(
        updated,
        isTaxInclusive,
        isInterState,
        overallDiscount,
        overallDiscountType
      );

      const diff = targetAmount - tempTotals.totalAmount;
      if (diff !== 0 && updated.length > 0) {
        const lastIdx = updated.length - 1;
        const lastItem = updated[lastIdx];
        
        const gstMultiplier = isTaxInclusive ? 1 : (1 + lastItem.gstRate / 100);
        const rateDiff = (diff / lastItem.quantity) / gstMultiplier;
        const finalRate = Math.round((lastItem.rate + rateDiff) * 100) / 100;
        
        const finalResult = calculateItemGST(
          {
            quantity: lastItem.quantity,
            rate: finalRate,
            discount: lastItem.discount,
            discountType: lastItem.discountType,
            gstRate: lastItem.gstRate,
          },
          isTaxInclusive,
          isInterState
        );

        updated[lastIdx] = {
          ...lastItem,
          rate: finalRate,
          taxableAmount: finalResult.taxableAmount,
          cgst: finalResult.cgst,
          sgst: finalResult.sgst,
          igst: finalResult.igst,
          total: finalResult.total,
        };
      }

      return updated;
    });

    toast.success(`Invoice total adjusted to ₹${targetAmount.toLocaleString('en-IN')}`);
    if (adjustInputRef.current) {
      adjustInputRef.current.value = targetAmount.toString();
    }
  };

  // Recalculate totals when items, discount, interstate, or inclusive tax changes
  const totals = useMemo(() => {
    return calculateInvoiceGST(
      cartItems,
      isTaxInclusive,
      isInterState,
      overallDiscount,
      overallDiscountType
    );
  }, [cartItems, isTaxInclusive, isInterState, overallDiscount, overallDiscountType]);

  // Calculated EMI details
  const emiCalculation = useMemo(() => {
    const isEmiActive = (!isSplitPayment && paymentMode === 'EMI') || (isSplitPayment && splitAmounts.EMI > 0);
    const isCreditActive = (!isSplitPayment && paymentMode === 'Credit') || (isSplitPayment && splitAmounts.Credit > 0);

    const loanAmount = isSplitPayment 
      ? splitAmounts.EMI 
      : Math.max(0, totals.totalAmount - emiDownPayment);

    if (loanAmount <= 0) return { loanAmount: 0, monthlyEMI: 0, totalInterest: 0, totalPayable: 0 };

    let totalInterest = 0;
    let totalPayable = loanAmount;
    let monthlyEMI = 0;

    if (isCreditActive) {
      monthlyEMI = loanAmount;
      totalPayable = loanAmount;
      totalInterest = 0;
    } else if (isEmiActive && emiType === 'finance') {
      monthlyEMI = 0;
      totalPayable = loanAmount;
      totalInterest = 0;
    } else if (isEmiActive) {
      // Store EMI
      const months = emiTenure;
      const rate = emiInterestRate;

      if (emiInterestType === 'none') {
        monthlyEMI = loanAmount / months;
        totalPayable = loanAmount;
        totalInterest = 0;
      } else if (emiInterestType === 'flat') {
        totalInterest = loanAmount * (rate / 100) * (months / 12);
        totalPayable = loanAmount + totalInterest;
        monthlyEMI = totalPayable / months;
      } else if (emiInterestType === 'reducing') {
        const monthlyRate = rate / 12 / 100;
        if (monthlyRate === 0) {
          monthlyEMI = loanAmount / months;
          totalPayable = loanAmount;
          totalInterest = 0;
        } else {
          monthlyEMI = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
          totalPayable = monthlyEMI * months;
          totalInterest = totalPayable - loanAmount;
        }
      }
    }

    return {
      loanAmount,
      monthlyEMI,
      totalInterest,
      totalPayable
    };
  }, [totals.totalAmount, emiDownPayment, emiType, emiInterestRate, emiInterestType, emiTenure, paymentMode, isSplitPayment, splitAmounts]);

  // Set paidAmount helper when totalAmount, paymentMode, or emiDownPayment changes
  useEffect(() => {
    if (isSplitPayment) return;
    if (paymentMode === 'EMI') {
      if (emiType === 'finance') {
        setPaidAmount(totals.totalAmount);
      } else {
        setPaidAmount(emiDownPayment);
      }
    } else if (paymentMode === 'Credit') {
      setPaidAmount(0);
    } else {
      setPaidAmount(totals.totalAmount);
    }
  }, [totals.totalAmount, paymentMode, emiDownPayment, emiType, isSplitPayment]);

  const toggleSplitPayment = (checked: boolean) => {
    setIsSplitPayment(checked);
    if (checked) {
      if (paymentMode === 'UPI') {
        if (totals.totalAmount > 100000) {
          setActiveSplitModes(['UPI', 'Cash']);
          setSplitAmounts({
            Cash: totals.totalAmount - 100000,
            UPI: 100000,
            'Bank Transfer': 0,
            Cheque: 0,
            Card: 0,
            Credit: 0,
            EMI: 0,
          });
        } else {
          setActiveSplitModes(['UPI']);
          setSplitAmounts({
            Cash: 0,
            UPI: totals.totalAmount,
            'Bank Transfer': 0,
            Cheque: 0,
            Card: 0,
            Credit: 0,
            EMI: 0,
          });
        }
      } else {
        const mode = paymentMode || 'Cash';
        setActiveSplitModes([mode]);
        setSplitAmounts({
          Cash: mode === 'Cash' ? totals.totalAmount : 0,
          UPI: mode === 'UPI' ? Math.min(100000, totals.totalAmount) : 0,
          'Bank Transfer': mode === 'Bank Transfer' ? totals.totalAmount : 0,
          Cheque: mode === 'Cheque' ? totals.totalAmount : 0,
          Card: mode === 'Card' ? totals.totalAmount : 0,
          Credit: mode === 'Credit' ? totals.totalAmount : 0,
          EMI: mode === 'EMI' ? totals.totalAmount : 0,
        });
      }
    } else {
      if (totals.totalAmount > 100000 && paymentMode === 'UPI') {
        setPaymentMode('Cash');
      }
    }
  };

  const balanceSplitAmounts = (editedMode: string, editedValue: number, activeModes: string[]) => {
    const total = totals.totalAmount;
    let val = Math.max(0, Math.min(total, editedValue));

    // Hard ceiling: UPI cannot exceed ₹1,00,000 per transaction under NPCI limits
    if (editedMode === 'UPI' && val > 100000) {
      val = 100000;
    }

    const newAmounts = { ...splitAmounts };
    
    PAYMENT_MODES.forEach(m => {
      if (!activeModes.includes(m)) {
        newAmounts[m] = 0;
      }
    });

    newAmounts[editedMode] = val;
    let remaining = total - val;

    const others = activeModes.filter(m => m !== editedMode);
    if (others.length === 0) {
      if (editedMode === 'UPI' && total > 100000) {
        newAmounts['UPI'] = 100000;
        newAmounts['Cash'] = total - 100000;
        setActiveSplitModes(['UPI', 'Cash']);
        setSplitAmounts(newAmounts);
        toast.warning('UPI is capped at ₹1,00,000 max (NPCI limit). Cash was added to balance the remaining ' + formatCurrency(total - 100000));
        return;
      }
      newAmounts[editedMode] = total;
      setSplitAmounts(newAmounts);
      return;
    }

    // Determine primary absorber - avoid UPI if remainder > 100,000
    const primaryAbsorber = others.find(m => m === 'Cash') || 
                           others.find(m => m !== 'UPI') || 
                           others[0];

    const orderedOthers = [
      ...others.filter(m => m !== primaryAbsorber),
      primaryAbsorber
    ];

    for (let i = 0; i < orderedOthers.length - 1; i++) {
      const mode = orderedOthers[i];
      let currentVal = newAmounts[mode] || 0;
      if (mode === 'UPI') {
        currentVal = Math.min(100000, currentVal);
      }
      const maxAllowed = mode === 'UPI' ? Math.min(100000, remaining) : remaining;
      const allowedVal = Math.max(0, Math.min(maxAllowed, currentVal));
      newAmounts[mode] = allowedVal;
      remaining -= allowedVal;
    }

    const lastMode = orderedOthers[orderedOthers.length - 1];
    if (lastMode === 'UPI') {
      const upiTake = Math.min(100000, remaining);
      newAmounts['UPI'] = upiTake;
      remaining -= upiTake;
      if (remaining > 0) {
        const nonUpi = activeModes.find(m => m !== 'UPI' && m !== editedMode);
        if (nonUpi) {
          newAmounts[nonUpi] = (newAmounts[nonUpi] || 0) + remaining;
        } else {
          newAmounts['Cash'] = remaining;
          setActiveSplitModes([...activeModes, 'Cash']);
        }
      }
    } else {
      newAmounts[lastMode] = Math.max(0, remaining);
    }

    setSplitAmounts(newAmounts);
  };

  const handleSplitAmountChange = (mode: string, value: number) => {
    let val = value;
    if (mode === 'UPI' && val > 100000) {
      val = 100000;
      toast.warning('UPI payment is capped at ₹1,00,000 maximum per transaction (NPCI limit).');
    }
    balanceSplitAmounts(mode, val, activeSplitModes);
  };

  const handleToggleSplitMode = (mode: string, checked: boolean) => {
    let nextActive: string[];
    if (checked) {
      if (activeSplitModes.includes(mode)) return;
      nextActive = [...activeSplitModes, mode];
    } else {
      if (activeSplitModes.length <= 1) {
        toast.error('At least one payment mode must be active');
        return;
      }
      nextActive = activeSplitModes.filter(m => m !== mode);
    }

    setActiveSplitModes(nextActive);

    const targetMode = checked ? mode : nextActive[0];
    let targetVal = checked ? 0 : (splitAmounts[targetMode] || 0);
    if (targetMode === 'UPI' && targetVal > 100000) {
      targetVal = 100000;
    }

    balanceSplitAmounts(targetMode, targetVal, nextActive);
  };

  useEffect(() => {
    if (!isSplitPayment) return;
    const currentSum = Object.values(splitAmounts).reduce((a, b) => a + b, 0);
    if (Math.abs(currentSum - totals.totalAmount) > 0.01) {
      if (activeSplitModes.length > 0) {
        const mode = activeSplitModes[0];
        const val = splitAmounts[mode] || 0;
        balanceSplitAmounts(mode, val, activeSplitModes);
      }
    }
  }, [totals.totalAmount, isSplitPayment, activeSplitModes]);

  // Save/Finalize Invoice
  const handleSaveInvoice = async (status: InvoiceStatus) => {
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Add at least one item to the invoice');
      return;
    }

    // NPCI UPI regulatory limit validation: single UPI payment cannot exceed ₹1,00,000
    if (!isSplitPayment && paymentMode === 'UPI' && totals.totalAmount > 100000) {
      toast.error(`UPI transaction limit is ₹1,00,000 (NPCI limit). For ${formatCurrency(totals.totalAmount)}, please enable Split Payment with UPI capped at ₹1,00,000.`);
      return;
    }

    // NPCI UPI regulatory limit validation in split payment: UPI component cannot exceed ₹1,00,000
    if (isSplitPayment && (splitAmounts['UPI'] || 0) > 100000) {
      toast.error('UPI split amount cannot exceed ₹1,00,000 as per NPCI regulations.');
      return;
    }

    try {
      const invoiceData: Invoice = {
        invoiceNumber,
        invoiceType,
        date: new Date(invoiceDate).getTime(),
        dueDate: invoiceDueDate ? new Date(invoiceDueDate).getTime() : null,
        customerId: selectedCustomerId === 'custom' ? null : parseInt(selectedCustomerId, 10),
        customerName,
        customerAddress,
        customerGstin,
        customerState,
        customerPhone,
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
        paidAmount,
        balanceDue: Math.max(0, totals.totalAmount - paidAmount),
        status: status === 'draft' ? 'draft' : (paidAmount >= totals.totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'overdue')),
        paymentMode,
        isReverseCharge,
        isTaxInclusive,
        notes,
        termsAndConditions: terms,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      // Auto-register customer in db.customers if doing EMI or credit sale so customer data is saved in EMI management
      const hasEmi = (!isSplitPayment && paymentMode === 'EMI') || (isSplitPayment && splitAmounts.EMI > 0);
      const hasCredit = (!isSplitPayment && paymentMode === 'Credit') || (isSplitPayment && splitAmounts.Credit > 0);

      let effectiveCustomerId: number | null = null;
      if (selectedCustomerId && selectedCustomerId !== 'custom') {
        effectiveCustomerId = parseInt(selectedCustomerId, 10);
      } else if (customerName && customerName.trim()) {
        let existing = null;
        if (customerPhone) {
          existing = await db.customers.where('phone').equals(customerPhone.trim()).first();
        }
        if (!existing) {
          existing = await db.customers.where('name').equals(customerName.trim()).first();
        }
        if (existing && existing.id) {
          effectiveCustomerId = existing.id;
        } else {
          // Auto-save customer into database
          effectiveCustomerId = (await db.customers.add({
            name: customerName.trim(),
            phone: customerPhone || '',
            email: '',
            address: customerAddress || '',
            city: '',
            state: customerState || '',
            pincode: '',
            gstin: customerGstin || '',
            pan: emiGovtIdType === 'PAN' ? emiGovtIdNumber : '',
            aadhaarNumber: emiGovtIdType === 'Aadhaar' ? emiGovtIdNumber : undefined,
            govtIdType: emiGovtIdType,
            govtIdNumber: emiGovtIdNumber || undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })) as number;
        }
      }

      invoiceData.customerId = effectiveCustomerId;

      // Add to database
      const id = await db.invoices.add(invoiceData);

      // Create EMI Loan if selected and invoice is finalized
      if (status !== 'draft' && hasEmi) {
        const cid = effectiveCustomerId || 0;
        const isStoreEMI = emiType === 'store';
        const isFinanceEMI = emiType === 'finance';
        
        let interestVal = isStoreEMI ? emiInterestRate : 0;
        let interestTypeVal = isStoreEMI ? emiInterestType : 'none';
        let tenureVal = isFinanceEMI ? 0 : emiTenure;
        
        const loanAmountVal = isSplitPayment ? splitAmounts.EMI : emiCalculation.loanAmount;
        const totalPayableVal = isSplitPayment 
          ? (isStoreEMI ? emiCalculation.totalPayable : splitAmounts.EMI)
          : emiCalculation.totalPayable;
        const monthlyEmiVal = isSplitPayment ? emiCalculation.monthlyEMI : emiCalculation.monthlyEMI;

        const loanData: Loan = {
          loanNumber: `LN-EMI-${invoiceNumber}`,
          customerId: cid,
          customerName,
          invoiceId: id,
          invoiceNumber,
          loanType: emiType,
          status: isFinanceEMI ? 'completed' : 'active',
          startDate: new Date(invoiceDate).getTime(),
          endDate: new Date(emiFirstDueDate).getTime() + (tenureVal * 30 * 24 * 60 * 60 * 1000),
          interestRate: interestVal,
          interestType: interestTypeVal,
          tenureMonths: tenureVal,
          principalAmount: loanAmountVal,
          downPayment: isSplitPayment ? 0 : emiDownPayment,
          loanAmount: loanAmountVal,
          monthlyEMI: isFinanceEMI ? 0 : monthlyEmiVal,
          remainingAmount: isFinanceEMI ? 0 : totalPayableVal,
          paidAmount: isFinanceEMI ? loanAmountVal : 0,
          nextDueDate: isFinanceEMI ? null : new Date(emiFirstDueDate).getTime(),
          financePartnerName: isFinanceEMI ? financePartnerName : undefined,
          remarks: isFinanceEMI ? `Finance Partner Payout Ref: ${financeRefNo}` : undefined,
          aadhaarNumber: emiGovtIdType === 'Aadhaar' ? emiGovtIdNumber : undefined,
          panNumber: emiGovtIdType === 'PAN' ? emiGovtIdNumber : undefined,
          govtIdType: emiGovtIdType,
          govtIdNumber: emiGovtIdNumber || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const loanId = await db.loans.add(loanData);

        // Record Down Payment if any (only for non-split store EMI)
        if (!isSplitPayment && emiDownPayment > 0) {
          await db.loanPayments.add({
            loanId,
            paymentDate: Date.now(),
            amountPaid: emiDownPayment,
            paymentMode: 'Cash',
            notes: 'Initial invoice downpayment',
            receivedBy: 'Billing Counter'
          });
        }

        // Generate Installment Schedules
        if (isStoreEMI) {
          const firstDue = new Date(emiFirstDueDate);
          for (let i = 1; i <= emiTenure; i++) {
            const dueDate = new Date(firstDue);
            dueDate.setMonth(firstDue.getMonth() + (i - 1));
            
            await db.loanInstallments.add({
              loanId,
              installmentNo: i,
              dueDate: dueDate.getTime(),
              amount: monthlyEmiVal,
              status: 'pending',
              lateFee: 0
            });
          }
        }
      }

      // Create Credit Loan if selected and invoice is finalized
      if (status !== 'draft' && hasCredit) {
        const cid = effectiveCustomerId || 0;
        const loanAmountVal = isSplitPayment ? splitAmounts.Credit : Math.max(0, totals.totalAmount - emiDownPayment);

        const loanData: Loan = {
          loanNumber: `LN-CR-${invoiceNumber}`,
          customerId: cid,
          customerName,
          invoiceId: id,
          invoiceNumber,
          loanType: 'credit',
          status: 'active',
          startDate: new Date(invoiceDate).getTime(),
          endDate: new Date(emiFirstDueDate).getTime() + (1 * 30 * 24 * 60 * 60 * 1000),
          interestRate: 0,
          interestType: 'none',
          tenureMonths: 1,
          principalAmount: loanAmountVal,
          downPayment: isSplitPayment ? 0 : emiDownPayment,
          loanAmount: loanAmountVal,
          monthlyEMI: loanAmountVal,
          remainingAmount: loanAmountVal,
          paidAmount: 0,
          nextDueDate: new Date(emiFirstDueDate).getTime(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const loanId = await db.loans.add(loanData);

        // Record Down Payment if any (only for non-split credit)
        if (!isSplitPayment && emiDownPayment > 0) {
          await db.loanPayments.add({
            loanId,
            paymentDate: Date.now(),
            amountPaid: emiDownPayment,
            paymentMode: 'Cash',
            notes: 'Initial invoice downpayment',
            receivedBy: 'Billing Counter'
          });
        }

        // Installment schedule for credit (single installment)
        await db.loanInstallments.add({
          loanId,
          installmentNo: 1,
          dueDate: new Date(emiFirstDueDate).getTime(),
          amount: loanAmountVal,
          status: 'pending',
          lateFee: 0
        });
      }

      // Decrement stock for finalized invoices
      if (status !== 'draft') {
        for (const item of cartItems) {
          if (item.productId) {
            const prod = await db.products.get(item.productId);
            if (prod) {
              const previousStock = prod.currentStock;
              const newStock = Math.max(0, previousStock - item.quantity);
              
              // Update stock
              await db.products.update(item.productId, { currentStock: newStock });
 
              // Log stock adjustment
              await db.stockLogs.add({
                productId: item.productId,
                productName: prod.name,
                type: 'out',
                quantity: item.quantity,
                previousStock,
                newStock,
                reference: invoiceNumber,
                referenceType: 'invoice',
                date: Date.now(),
              });
            }
          }
        }
      }
 
      toast.success('Invoice created successfully');
      router.push(`/invoices/${id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save invoice. Ensure invoice number is unique.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Invoice</h2>
          <p className="text-muted-foreground text-sm">Raise a new invoice and adjust items inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Items */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-base font-bold">General Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Invoice Type</Label>
                <Select value={invoiceType} onValueChange={v => setInvoiceType(v as InvoiceType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVOICE_TYPE_LABELS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-no">Invoice Number</Label>
                <Input id="invoice-no" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardHeader className="py-4 border-b flex flex-row justify-between items-center">
              <CardTitle className="text-base font-bold flex items-center gap-1.5"><UserCheck className="h-4 w-4 text-primary" /> Client Details</CardTitle>
              <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">-- Custom Client --</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cust-name">Customer Name *</Label>
                <Input id="cust-name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Type name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-phone">Phone Number</Label>
                <Input id="cust-phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Type phone" />
              </div>
              <div className="space-y-2">
                <Label>Place of Supply (State)</Label>
                <Select value={customerState} onValueChange={setCustomerState}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="cust-addr">Billing Address</Label>
                <Input id="cust-addr" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Street, City, Pincode" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-gst">Customer GSTIN</Label>
                <Input id="cust-gst" value={customerGstin} onChange={e => setCustomerGstin(e.target.value.toUpperCase())} placeholder="15-digit GSTIN" className="font-mono" />
              </div>
            </CardContent>
          </Card>

          {/* Add Line Items Section */}
          <Card className="border shadow-sm">
            <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" /> Invoice Items
                </CardTitle>
                <span className="font-mono text-xs text-muted-foreground font-medium">
                  ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBlankItem}
                  className="h-8 text-xs font-bold gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/10 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Blank Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Product search box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type product name, SKU or HSN barcode to search catalog..."
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="pl-9 h-11 text-sm bg-background"
                />

                {showProductDropdown && productSearch && (
                  <div className="absolute top-[105%] left-0 right-0 z-50 bg-background border rounded-lg shadow-xl max-h-56 overflow-y-auto divide-y">
                    {searchedProducts.length === 0 ? (
                      <div className="p-4 text-sm text-center text-muted-foreground">
                        No matching product found. You can click &quot;+ Add Blank Item&quot; to add a custom item.
                      </div>
                    ) : (
                      searchedProducts.map(p => (
                        <button
                          key={p.id}
                          className="w-full text-left p-3 hover:bg-muted text-sm flex justify-between items-center transition-colors"
                          onClick={() => addProductToCart(p)}
                        >
                          <div>
                            <p className="font-semibold text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              SKU: <span className="font-mono">{p.sku || '-'}</span> | HSN: <span className="font-mono">{p.hsnCode || '-'}</span> | Stock: <span className="font-mono font-medium">{p.currentStock} {p.unit}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-primary block">{formatCurrency(p.sellingPrice)}</span>
                            <span className="text-[10px] text-muted-foreground">GST: {p.gstPercentage || 18}%</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Stacked Items List */}
              <div className="space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/10 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">No items added to invoice yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                        Search your product catalog above, or click the button below to add an ad-hoc device or product with IMEI / Serial tracking.
                      </p>
                    </div>
                    <Button type="button" size="sm" onClick={addBlankItem} className="gap-1.5 text-xs font-semibold">
                      <Plus className="h-3.5 w-3.5" /> Add First Item
                    </Button>
                  </div>
                ) : (
                  cartItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 sm:p-4.5 border rounded-xl bg-card shadow-sm space-y-3.5 relative border-slate-200 dark:border-slate-800"
                    >
                      {/* Item Header Strip */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-primary/10 text-primary font-mono font-bold text-xs">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Line Item
                          </span>
                          {item.productId ? (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Catalog Product
                            </span>
                          ) : (
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                              Custom Device / Service
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-xs text-foreground hidden sm:inline">
                            Item Total: {formatCurrency(item.total)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md" 
                            onClick={() => removeCartItem(idx)}
                            title="Remove this item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Row 1: Item Description & Model Number */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        {/* Description */}
                        <div className="md:col-span-6 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Item Name & Description *
                          </label>
                          <Input 
                            value={item.description} 
                            onChange={e => updateCartItem(idx, { description: e.target.value })} 
                            placeholder="e.g. iPhone 15 Pro, MacBook Pro M3, Samsung TV..."
                            className="h-10 font-semibold text-sm w-full bg-background rounded-md px-3" 
                          />
                        </div>

                        {/* Model / Sub-variant */}
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Model / Sub-Variant No.
                          </label>
                          <Input 
                            value={item.modelNumber || ''} 
                            onChange={e => updateCartItem(idx, { modelNumber: e.target.value })} 
                            placeholder="e.g. A3101 / SM-S928B / 256GB"
                            className="h-10 font-mono text-xs w-full bg-background rounded-md px-3" 
                          />
                        </div>

                        {/* HSN / SAC */}
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            HSN / SAC
                          </label>
                          <Input 
                            value={item.hsnCode || ''} 
                            onChange={e => updateCartItem(idx, { hsnCode: e.target.value })} 
                            placeholder="e.g. 8517"
                            className="h-10 font-mono text-xs text-center w-full bg-background rounded-md px-2" 
                          />
                        </div>
                      </div>

                      {/* Row 2: Device Identification / IMEI & Serial Number Strip */}
                      <div className="p-3 rounded-lg bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            <Smartphone className="h-3.5 w-3.5 text-primary" />
                            <span>Product Unique Identifier (IMEI / Serial Number)</span>
                          </div>
                          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Printed on bill as Sold-by-Us Proof
                          </span>
                        </div>

                        <div className="relative">
                          <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            value={item.imeiOrSerialNo || ''}
                            onChange={e => updateCartItem(idx, { imeiOrSerialNo: e.target.value })}
                            placeholder={
                              item.quantity > 1 
                                ? `Enter ${item.quantity} IMEIs/Serial numbers (separated by comma)...`
                                : "Enter or scan 15-digit IMEI or Serial Number..."
                            }
                            className="pl-8 font-mono text-xs h-9 bg-background w-full"
                          />
                        </div>

                        {item.imeiOrSerialNo ? (
                          <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Verified Sold Item:</span>
                            <span className="font-mono text-foreground font-semibold bg-background px-1.5 py-0.5 rounded border text-[10px]">
                              {item.modelNumber || item.description || 'Device'}
                            </span>
                            <span>with ID</span>
                            <span className="font-mono text-primary font-bold bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20 text-[10px]">
                              {item.imeiOrSerialNo}
                            </span>
                            <span className="text-slate-500 text-[10px]">(Permanent sale verification for customer warranty)</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>💡 Mobile phone IMEI, laptop serial, or electronics unit ID will be printed on the invoice for customer warranty &amp; service verification.</span>
                          </div>
                        )}
                      </div>

                      {/* Row 3: Proportional Numeric Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end pt-1">
                        {/* Rate */}
                        <div className="col-span-2 sm:col-span-3 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Rate (₹ Excl. GST)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₹</span>
                            <Input 
                              type="number" 
                              value={item.rate || ''} 
                              onChange={e => updateCartItem(idx, { rate: parseFloat(e.target.value) || 0 })} 
                              placeholder="0.00"
                              className="h-10 pl-6 text-left font-mono text-xs w-full bg-background rounded-md" 
                            />
                          </div>
                        </div>

                        {/* Quantity & Unit */}
                        <div className="col-span-2 sm:col-span-3 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Qty &amp; Unit
                          </label>
                          <div className="flex items-center bg-background border rounded-md h-10 w-full overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = parseFloat(item.quantity as any) || 0;
                                updateCartItem(idx, { quantity: Math.max(1, currentQty - 1) });
                              }}
                              className="w-8 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted font-bold text-sm select-none shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="any"
                              value={item.quantity === undefined || item.quantity === null ? '' : item.quantity}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '') {
                                  updateCartItem(idx, { quantity: '' as any });
                                } else {
                                  const parsed = parseFloat(val);
                                  updateCartItem(idx, { quantity: isNaN(parsed) ? '' as any : parsed });
                                }
                              }}
                              placeholder="1"
                              className="w-full text-center font-mono text-xs bg-transparent outline-none border-x h-10 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = parseFloat(item.quantity as any) || 0;
                                updateCartItem(idx, { quantity: currentQty + 1 });
                              }}
                              className="w-8 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted font-bold text-sm select-none shrink-0"
                            >
                              +
                            </button>
                            <select
                              value={item.unit || 'PCS'}
                              onChange={e => updateCartItem(idx, { unit: e.target.value })}
                              className="h-10 text-[11px] font-semibold bg-muted/30 border-l px-1.5 outline-none cursor-pointer text-muted-foreground hover:text-foreground shrink-0 max-w-18"
                              title="Measurement Unit"
                            >
                              {UNITS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Discount */}
                        <div className="col-span-1 sm:col-span-2 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Discount
                          </label>
                          <div className="flex items-center h-10 border rounded-md bg-background overflow-hidden w-full">
                            <input 
                              type="number" 
                              value={item.discount || ''} 
                              onChange={e => updateCartItem(idx, { discount: parseFloat(e.target.value) || 0 })} 
                              placeholder="0"
                              className="h-10 text-right font-mono text-xs w-full bg-transparent px-2 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <select
                              value={item.discountType}
                              onChange={e => updateCartItem(idx, { discountType: e.target.value as 'percentage' | 'amount' })}
                              className="h-10 text-xs border-l px-1.5 bg-muted/30 outline-none font-bold shrink-0 cursor-pointer text-muted-foreground hover:text-foreground w-9"
                            >
                              <option value="amount">₹</option>
                              <option value="percentage">%</option>
                            </select>
                          </div>
                        </div>

                        {/* GST */}
                        <div className="col-span-1 sm:col-span-2 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            GST Rate
                          </label>
                          <select
                            value={item.gstRate}
                            onChange={e => updateCartItem(idx, { gstRate: Number(e.target.value) })}
                            className="h-10 text-xs border rounded-md px-2.5 w-full bg-background border-input outline-none focus:ring-1 focus:ring-primary font-semibold"
                          >
                            <option value="0">0%</option>
                            <option value="0.25">0.25%</option>
                            <option value="3">3%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>

                        {/* Total Amount */}
                        <div className="col-span-2 sm:col-span-2 space-y-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block text-right">
                            Line Total
                          </label>
                          <div className="flex flex-col justify-center h-10 px-2.5 bg-muted/40 dark:bg-muted/20 border rounded-md text-right">
                            <span className="font-mono font-bold text-xs text-foreground truncate">
                              {formatCurrency(item.total)}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono leading-none">
                              Tax: {formatCurrency(item.cgst + item.sgst + item.igst)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Action row below items: Add Item & Tax Toggles */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBlankItem}
                    className="h-9 text-xs font-bold gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/5 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Add Blank Item
                  </Button>
                </div>

                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 font-medium cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isTaxInclusive} 
                      onChange={e => setIsTaxInclusive(e.target.checked)} 
                      className="rounded border-slate-300 text-primary focus:ring-primary" 
                    />
                    Tax Inclusive Pricing (GST included in rate)
                  </label>
                  <label className="flex items-center gap-2 font-medium cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isReverseCharge} 
                      onChange={e => setIsReverseCharge(e.target.checked)} 
                      className="rounded border-slate-300 text-primary focus:ring-primary" 
                    />
                    Reverse Charge Applicable
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings & Summary */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-base font-bold">Billing Calculations</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <table className="w-full text-xs space-y-2">
                <tbody>
                  <tr className="flex justify-between py-1 border-b border-dashed">
                    <td className="text-muted-foreground">Subtotal</td>
                    <td className="font-mono font-semibold">{formatCurrency(totals.subtotal)}</td>
                  </tr>
                  <tr className="flex justify-between py-1 border-b border-dashed">
                    <td className="text-muted-foreground">Line item discounts</td>
                    <td className="font-mono text-destructive">-{formatCurrency(cartItems.reduce((acc, i) => acc + (i.quantity * i.rate - i.taxableAmount), 0))}</td>
                  </tr>
                  <tr className="flex justify-between py-1 border-b border-dashed">
                    <td className="text-muted-foreground">Taxable Value</td>
                    <td className="font-mono font-semibold">{formatCurrency(totals.taxableAmount)}</td>
                  </tr>
                  <tr className="flex justify-between py-1 border-b border-dashed">
                    <td className="text-muted-foreground">CGST Amount</td>
                    <td className="font-mono">{formatCurrency(totals.cgst)}</td>
                  </tr>
                  <tr className="flex justify-between py-1 border-b border-dashed">
                    <td className="text-muted-foreground">SGST Amount</td>
                    <td className="font-mono">{formatCurrency(totals.sgst)}</td>
                  </tr>
                  <tr className="flex justify-between py-1 border-b border-dashed">
                    <td className="text-muted-foreground">IGST Amount</td>
                    <td className="font-mono">{formatCurrency(totals.igst)}</td>
                  </tr>
                  <tr className="flex justify-between py-1 border-b border-dashed">
                    <td className="text-muted-foreground">Total Tax (GST)</td>
                    <td className="font-mono font-semibold">{formatCurrency(totals.totalTax)}</td>
                  </tr>
                  {totals.roundOff !== 0 && (
                    <tr className="flex justify-between py-1 border-b border-dashed">
                      <td className="text-muted-foreground">Round-off Offset</td>
                      <td className="font-mono">{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff)}</td>
                    </tr>
                  )}
                  <tr className="flex justify-between py-2.5 text-sm font-black border-t-2 border-double border-primary/30">
                    <td className="text-primary">Net Grand Total</td>
                    <td className="font-mono text-primary text-lg font-extrabold">{formatCurrency(totals.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Adjust / Override Final Amount panel */}
              <div className="bg-[#f0f9ff] dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/35 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="adjust-total" className="text-xs font-bold text-sky-800 dark:text-sky-400 flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-sky-500" /> Override Grand Total
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="adjust-total"
                    ref={adjustInputRef}
                    type="number"
                    placeholder="e.g. 3000"
                    className="h-9 font-mono text-sm bg-background border-sky-200 dark:border-sky-900 focus-visible:ring-sky-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = parseFloat((e.target as HTMLInputElement).value);
                        if (val > 0) handleAdjustFinalAmount(val);
                      }
                    }}
                  />
                  <Button 
                    size="sm"
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 h-9 rounded-lg"
                    onClick={(e) => {
                      e.preventDefault();
                      if (adjustInputRef.current) {
                        const val = parseFloat(adjustInputRef.current.value);
                        if (val > 0) handleAdjustFinalAmount(val);
                      }
                    }}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-[10px] text-sky-600/80 leading-normal">
                  Proportionally recalculates and matches all line item rates & GST to this final total.
                </p>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-dashed">
                  <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Payment Configuration</Label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isSplitPayment} 
                      onChange={e => toggleSplitPayment(e.target.checked)} 
                      className="rounded border-slate-300 h-3.5 w-3.5" 
                    />
                    Split Payment
                  </label>
                </div>

                {!isSplitPayment ? (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Label>Payment Mode</Label>
                      {paymentMode === 'UPI' && totals.totalAmount > 100000 && (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Exceeds ₹1L Limit
                        </span>
                      )}
                    </div>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map(mode => (
                          <SelectItem key={mode} value={mode}>
                            {mode} {mode === 'UPI' && totals.totalAmount > 100000 ? '(Max ₹1 Lakh / Split Required)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* NPCI UPI Limit Exceeded Warning Card */}
                    {paymentMode === 'UPI' && totals.totalAmount > 100000 && (
                      <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                          <div className="space-y-1">
                            <span className="font-bold">NPCI UPI Limit Exceeded (Max ₹1,00,000):</span>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                              Standard UPI regulations (NPCI / RBI) limit individual UPI payments to ₹1,00,000 per transaction. 
                              For this bill of <strong>{formatCurrency(totals.totalAmount)}</strong>, pure UPI cannot be processed. 
                              Please enable <strong>Split Payment</strong> (UPI capped at ₹1,00,000 + Cash or Bank Transfer).
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200 dark:border-amber-800/60">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsSplitPayment(true);
                              setActiveSplitModes(['UPI', 'Cash']);
                              setSplitAmounts({
                                Cash: Math.max(0, totals.totalAmount - 100000),
                                UPI: 100000,
                                'Bank Transfer': 0,
                                Cheque: 0,
                                Card: 0,
                                Credit: 0,
                                EMI: 0,
                              });
                              toast.info('Split Payment enabled: UPI ₹1,00,000 (max cap) + Cash balance');
                            }}
                            className="h-7 text-xs font-semibold bg-white dark:bg-slate-900 border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
                          >
                            Split: UPI (₹1,00,000) + Cash ({formatCurrency(Math.max(0, totals.totalAmount - 100000))})
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsSplitPayment(true);
                              setActiveSplitModes(['UPI', 'Bank Transfer']);
                              setSplitAmounts({
                                Cash: 0,
                                UPI: 100000,
                                'Bank Transfer': Math.max(0, totals.totalAmount - 100000),
                                Cheque: 0,
                                Card: 0,
                                Credit: 0,
                                EMI: 0,
                              });
                              toast.info('Split Payment enabled: UPI ₹1,00,000 (max cap) + Bank balance');
                            }}
                            className="h-7 text-xs font-semibold bg-white dark:bg-slate-900 border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
                          >
                            Split: UPI (₹1,00,000) + Bank ({formatCurrency(Math.max(0, totals.totalAmount - 100000))})
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Split Payment Mode Amounts</Label>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">NPCI UPI Max: ₹1,00,000</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {PAYMENT_MODES.map(mode => (
                        <div key={mode} className="grid grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-6 flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={activeSplitModes.includes(mode)}
                              onChange={e => handleToggleSplitMode(mode, e.target.checked)}
                              className="rounded border-slate-300 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className={`font-medium ${activeSplitModes.includes(mode) ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>
                              {mode}
                              {mode === 'UPI' && (
                                <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(Max ₹1 Lakh)</span>
                              )}
                            </span>
                          </div>
                          <div className="col-span-6 relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-semibold">₹</span>
                            <Input
                              type="number"
                              disabled={!activeSplitModes.includes(mode)}
                              max={mode === 'UPI' ? 100000 : undefined}
                              value={activeSplitModes.includes(mode) ? (splitAmounts[mode] || '') : ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                handleSplitAmountChange(mode, val);
                              }}
                              placeholder="0.00"
                              className="h-8 pl-6 pr-2 py-1 font-mono text-xs w-full bg-background rounded-md border-input disabled:bg-slate-100 disabled:opacity-60 dark:disabled:bg-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeSplitModes.includes('UPI') && (splitAmounts['UPI'] || 0) === 100000 && totals.totalAmount > 100000 && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium italic pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        ℹ️ UPI portion is capped at ₹1,00,000 maximum per NPCI regulations. Remaining balance is allocated to other active modes.
                      </p>
                    )}
                  </div>
                )}

                {/* EMI Details Form panel */}
                {((!isSplitPayment && paymentMode === 'EMI') || (isSplitPayment && splitAmounts.EMI > 0)) && (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200/80 space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-1 border-b">
                      <span className="font-bold text-slate-850 dark:text-slate-250">EMI Setup</span>
                      <Select value={emiType} onValueChange={val => setEmiType(val as any)}>
                        <SelectTrigger className="h-7 w-28 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="store">Store EMI</SelectItem>
                          <SelectItem value="finance">Finance Partner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {emiType === 'store' ? (
                      <div className="space-y-2">
                        <div className={isSplitPayment ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
                          {!isSplitPayment && (
                            <div className="space-y-1">
                              <Label className="text-[10px] h-8 flex items-end pb-0.5">Down Payment (₹)</Label>
                              <Input 
                                type="number" 
                                value={emiDownPayment || ''} 
                                onChange={e => setEmiDownPayment(parseFloat(e.target.value) || 0)} 
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label className="text-[10px] h-8 flex items-end pb-0.5">Interest Rate (Annual %)</Label>
                            <Input 
                              type="number" 
                              value={emiInterestRate || ''} 
                              onChange={e => setEmiInterestRate(parseFloat(e.target.value) || 0)} 
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] h-8 flex items-end pb-0.5">Interest Type</Label>
                            <Select value={emiInterestType} onValueChange={val => setEmiInterestType(val as any)}>
                              <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Interest</SelectItem>
                                <SelectItem value="flat">Flat Rate</SelectItem>
                                <SelectItem value="reducing">Reducing Bal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] h-8 flex items-end pb-0.5">Tenure (Months)</Label>
                            <Input 
                              type="number" 
                              value={emiTenure || ''} 
                              onChange={e => setEmiTenure(parseInt(e.target.value, 10) || 1)} 
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">First Due Date</Label>
                          <Input 
                            type="date" 
                            value={emiFirstDueDate} 
                            onChange={e => setEmiFirstDueDate(e.target.value)} 
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Borrower Govt ID</Label>
                            <Select value={emiGovtIdType} onValueChange={setEmiGovtIdType}>
                              <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Aadhaar">Aadhaar Card</SelectItem>
                                <SelectItem value="PAN">PAN Card</SelectItem>
                                <SelectItem value="Voter ID">Voter ID</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">{emiGovtIdType} Number</Label>
                            <Input
                              value={emiGovtIdNumber}
                              onChange={e => setEmiGovtIdNumber(e.target.value.toUpperCase())}
                              placeholder={emiGovtIdType === 'Aadhaar' ? '12-digit UIDAI' : 'Govt ID Number'}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="border-t pt-2 space-y-1 text-[11px] font-semibold text-slate-500">
                          <div className="flex justify-between">
                            <span>Loan Amount:</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(emiCalculation.loanAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Monthly EMI:</span>
                            <span className="font-mono text-primary font-bold">{formatCurrency(emiCalculation.monthlyEMI)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Interest:</span>
                            <span className="font-mono text-amber-700 font-bold">{formatCurrency(emiCalculation.totalInterest)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1 mt-1 text-slate-900 dark:text-slate-105">
                            <span>Total Payable:</span>
                            <span className="font-mono font-black">{formatCurrency(emiCalculation.totalPayable)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Finance Partner</Label>
                          <Select value={financePartnerName} onValueChange={setFinancePartnerName}>
                            <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FINANCE_PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className={isSplitPayment ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
                          {!isSplitPayment && (
                            <div className="space-y-1">
                              <Label className="text-[10px]">Down Payment (₹)</Label>
                              <Input 
                                type="number" 
                                value={emiDownPayment || ''} 
                                onChange={e => setEmiDownPayment(parseFloat(e.target.value) || 0)} 
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label className="text-[10px]">Approval Code / Ref No.</Label>
                            <Input 
                              value={financeRefNo} 
                              onChange={e => setFinanceRefNo(e.target.value)} 
                              placeholder="F18273619"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="border-t pt-2 text-[10px] text-slate-400 font-semibold leading-normal">
                          <p>* Finance company will payout the balance of {formatCurrency(isSplitPayment ? splitAmounts.EMI : Math.max(0, totals.totalAmount - emiDownPayment))} directly to the store.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Credit details Form panel */}
                {((!isSplitPayment && paymentMode === 'Credit') || (isSplitPayment && splitAmounts.Credit > 0)) && (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-1 border-b">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Credit Sale Configuration</span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Expected Due Date</Label>
                      <Input 
                        type="date" 
                        value={emiFirstDueDate} 
                        onChange={e => setEmiFirstDueDate(e.target.value)} 
                        className="h-8 text-xs"
                      />
                    </div>
                    {!isSplitPayment && (
                      <div className="space-y-1">
                        <Label className="text-[10px]">Down Payment (₹)</Label>
                        <Input 
                          type="number" 
                          value={emiDownPayment || ''} 
                          onChange={e => setEmiDownPayment(parseFloat(e.target.value) || 0)} 
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    )}
                    <div className="border-t pt-2 space-y-1 text-[11px] font-semibold text-slate-500">
                      <div className="flex justify-between">
                        <span>Total Outstanding Credit:</span>
                        <span className="font-mono text-rose-600 font-bold">{formatCurrency(isSplitPayment ? splitAmounts.Credit : Math.max(0, totals.totalAmount - emiDownPayment))}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="paid-amt">Amount Received (₹)</Label>
                  <Input
                    id="paid-amt"
                    type="number"
                    value={paidAmount || ''}
                    onChange={e => !isSplitPayment && setPaidAmount(parseFloat(e.target.value) || 0)}
                    disabled={isSplitPayment || paymentMode === 'EMI' || paymentMode === 'Credit'}
                    className="font-mono text-emerald-600 font-bold disabled:bg-slate-100 disabled:opacity-90 dark:disabled:bg-slate-950/60"
                  />
                  {isSplitPayment && (
                    <p className="text-[9px] text-muted-foreground font-medium">
                      Calculated automatically as the sum of all split amounts.
                    </p>
                  )}
                  {paidAmount < totals.totalAmount && (
                    <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
                      <ShieldAlert className="h-3.5 w-3.5" /> Balance due will be {formatCurrency(totals.totalAmount - paidAmount)} (Credit)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card className="border border-border/70 shadow-xs">
            <CardHeader className="p-4 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">
                  Notes &amp; Terms
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground font-semibold px-2"
                  onClick={() => {
                    setNotes(settings?.invoiceFooterNotes || DEFAULT_INVOICE_NOTES);
                    setTerms(settings?.termsAndConditions || DEFAULT_INVOICE_TERMS);
                    toast.success('Reset to standard default notes & terms');
                  }}
                >
                  Reset Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes" className="text-xs font-bold text-foreground">
                    Notes / Remarks
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Footer message</span>
                </div>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Terms or payment guidelines..."
                  className="min-h-16 text-xs resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="terms" className="text-xs font-bold text-foreground">
                    Terms &amp; Conditions
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Legal clauses</span>
                </div>
                <Textarea
                  id="terms"
                  value={terms}
                  onChange={e => setTerms(e.target.value)}
                  placeholder="1. Goods once sold..."
                  className="min-h-24 text-xs font-mono leading-relaxed resize-y"
                />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <Button variant="outline" className="w-full font-bold shadow-xs" onClick={() => handleSaveInvoice('draft')}>
                  Save Draft
                </Button>
                <Button className="w-full flex items-center justify-center gap-1.5 font-bold shadow-xs" onClick={() => handleSaveInvoice('paid')}>
                  <Save className="h-4 w-4" /> Save &amp; Print
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
