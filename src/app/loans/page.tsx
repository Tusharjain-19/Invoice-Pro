'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/db';
import type { Loan, LoanInstallment, LoanPayment, Customer } from '@/types';
import { FINANCE_PARTNERS } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  Percent,
  Search,
  Calendar,
  DollarSign,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Calculator,
  Download,
  Coins,
  Plus,
  Eye,
  X,
  CreditCard,
  Building2,
  Receipt,
  Printer,
  ShieldCheck,
  Check,
  Sparkles,
  ArrowRight,
  UserCheck,
  PhoneCall,
  SlidersHorizontal,
  Upload,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { WhatsAppDueReminderModal } from '@/components/payments/WhatsAppDueReminderModal';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function LoansPage() {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Database lists
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Active Loan Selected for schedule & collection
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanInstallments, setLoanInstallments] = useState<LoanInstallment[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [isCreditLimitOpen, setIsCreditLimitOpen] = useState(false);
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState(false);
  const [reminderLoan, setReminderLoan] = useState<Loan | null>(null);

  // New Loan Form State
  const [newLoanCustomerId, setNewLoanCustomerId] = useState<string>('');
  const [newLoanCustomerName, setNewLoanCustomerName] = useState<string>('');
  const [newLoanCustomerPhone, setNewLoanCustomerPhone] = useState<string>('');
  const [newLoanType, setNewLoanType] = useState<'store' | 'finance' | 'credit'>('store');
  const [newLoanPartner, setNewLoanPartner] = useState<string>('Bajaj Finance');
  const [newLoanPrincipal, setNewLoanPrincipal] = useState<number>(50000);
  const [newLoanDownPayment, setNewLoanDownPayment] = useState<number>(10000);
  const [newLoanTenure, setNewLoanTenure] = useState<number>(12);
  const [newLoanRate, setNewLoanRate] = useState<number>(12);
  const [newLoanInterestType, setNewLoanInterestType] = useState<'none' | 'simple' | 'flat' | 'reducing'>('reducing');
  const [newLoanStartDate, setNewLoanStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newLoanRemarks, setNewLoanRemarks] = useState<string>('');

  // Government ID, KYC & Guarantor States
  const [newLoanGovtIdType, setNewLoanGovtIdType] = useState<string>('Aadhaar');
  const [newLoanGovtIdNumber, setNewLoanGovtIdNumber] = useState<string>('');
  const [newLoanPan, setNewLoanPan] = useState<string>('');
  const [newLoanGuarantorName, setNewLoanGuarantorName] = useState<string>('');
  const [newLoanGuarantorPhone, setNewLoanGuarantorPhone] = useState<string>('');
  const [newLoanGuarantorRelation, setNewLoanGuarantorRelation] = useState<string>('');
  const [newLoanIdProofDoc, setNewLoanIdProofDoc] = useState<string | undefined>(undefined);
  const [newLoanIdProofName, setNewLoanIdProofName] = useState<string | undefined>(undefined);
  const loanProofInputRef = useRef<HTMLInputElement>(null);

  const handleLoanProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewLoanIdProofDoc(event.target?.result as string);
      setNewLoanIdProofName(file.name);
      toast.success(`Attached ID proof: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectCustomerForLoan = (cid: string) => {
    setNewLoanCustomerId(cid);
    const c = customers.find((x) => x.id?.toString() === cid);
    if (c) {
      setNewLoanCustomerName(c.name);
      setNewLoanCustomerPhone(c.phone || '');
      if (c.pan) setNewLoanPan(c.pan);
      if (c.aadhaarNumber) {
        setNewLoanGovtIdType('Aadhaar');
        setNewLoanGovtIdNumber(c.aadhaarNumber);
      } else if (c.govtIdNumber) {
        setNewLoanGovtIdType(c.govtIdType || 'Aadhaar');
        setNewLoanGovtIdNumber(c.govtIdNumber);
      }
    }
  };

  const handleLoanCustomerNameChange = (nameVal: string) => {
    setNewLoanCustomerName(nameVal);
    const matched = customers.find((c) => c.name.toLowerCase() === nameVal.trim().toLowerCase());
    if (matched && matched.id) {
      setNewLoanCustomerId(matched.id.toString());
      setNewLoanCustomerPhone(matched.phone || '');
      if (matched.pan) setNewLoanPan(matched.pan);
      if (matched.aadhaarNumber) {
        setNewLoanGovtIdType('Aadhaar');
        setNewLoanGovtIdNumber(matched.aadhaarNumber);
      } else if (matched.govtIdNumber) {
        setNewLoanGovtIdType(matched.govtIdType || 'Aadhaar');
        setNewLoanGovtIdNumber(matched.govtIdNumber);
      }
    } else {
      setNewLoanCustomerId('');
    }
  };

  // Collection modal state
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMode, setCollectMode] = useState<string>('UPI');
  const [collectRef, setCollectRef] = useState<string>('');
  const [collectLateFee, setCollectLateFee] = useState<string>('0');
  const [collectNotes, setCollectNotes] = useState<string>('');

  // Customer Credit profile selection state
  const [selectedProfileCustomerId, setSelectedProfileCustomerId] = useState<string>('');
  const [customerCreditLimit, setCustomerCreditLimit] = useState<string>('50000');

  // Interactive Calculator State
  const [calcPrice, setCalcPrice] = useState<number>(80000);
  const [calcDownPayment, setCalcDownPayment] = useState<number>(20000);
  const [calcRate, setCalcRate] = useState<number>(12);
  const [calcTenure, setCalcTenure] = useState<number>(12);
  const [calcInterestType, setCalcInterestType] = useState<'none' | 'flat' | 'reducing'>('reducing');

  // Load database tables
  const loadData = async () => {
    try {
      const allLoans = await db.loans.toArray();
      const allCustomers = await db.customers.toArray();
      const allInstallments = await db.loanInstallments.toArray();
      const allPayments = await db.loanPayments.toArray();

      setLoans(allLoans.sort((a, b) => b.createdAt - a.createdAt));
      setCustomers(allCustomers);
      setInstallments(allInstallments);
      setPayments(allPayments);

      if (allCustomers.length > 0 && !selectedProfileCustomerId) {
        setSelectedProfileCustomerId(allCustomers[0].id?.toString() || '');
      }
    } catch (err) {
      console.error('Error reading loans DB data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update detail displays when loan selected
  useEffect(() => {
    if (selectedLoan?.id) {
      db.loanInstallments.where('loanId').equals(selectedLoan.id).sortBy('installmentNo').then(setLoanInstallments);
      db.loanPayments.where('loanId').equals(selectedLoan.id).toArray().then(setLoanPayments);
    }
  }, [selectedLoan, loans, installments, payments]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const active = loans.filter((l) => l.status === 'active' || l.status === 'overdue');
    const totalOutstanding = active.reduce((sum, l) => sum + l.remainingAmount, 0);
    const activeCount = active.length;

    // Today's collections
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayColl = payments
      .filter((p) => p.paymentDate >= startOfToday.getTime())
      .reduce((sum, p) => sum + p.amountPaid, 0);

    // Overdue EMIs
    const overdueEMIs = installments.filter(
      (i) => i.status === 'overdue' || (i.status === 'pending' && i.dueDate < Date.now())
    );
    const overdueCount = overdueEMIs.length;
    const overdueAmount = overdueEMIs.reduce((sum, i) => sum + i.amount, 0);

    // Defaulted loan count
    const defaultedCount = loans.filter((l) => l.status === 'defaulted').length;

    // Monthly recovery amount (current month payments)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyRecovery = payments
      .filter((p) => p.paymentDate >= startOfMonth.getTime())
      .reduce((sum, p) => sum + p.amountPaid, 0);

    // Finance partner distribution
    const partnerLoans = loans.filter((l) => l.loanType === 'finance');
    const storeLoans = loans.filter((l) => l.loanType === 'store' || l.loanType === 'credit');

    return {
      activeLoansCount: activeCount,
      totalOutstanding,
      todayCollection: todayColl,
      overdueCount,
      overdueAmount,
      defaultedCount,
      monthlyRecovery,
      partnerLoansCount: partnerLoans.length,
      storeLoansCount: storeLoans.length,
    };
  }, [loans, payments, installments]);

  // Search & Filtered Loans Account List
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      const matchQuery =
        (l.loanNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (l.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        Boolean(l.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchType = typeFilter === 'all' || l.loanType === typeFilter;

      return matchQuery && matchStatus && matchType;
    });
  }, [loans, searchQuery, statusFilter, typeFilter]);

  // Upcoming dues (due in next 15 days) or overdue
  const dueInstallments = useMemo(() => {
    const next15Days = Date.now() + 15 * 24 * 60 * 60 * 1000;
    return installments
      .filter((i) => i.status !== 'paid' && i.dueDate <= next15Days)
      .sort((a, b) => a.dueDate - b.dueDate)
      .map((inst) => {
        const loan = loans.find((l) => l.id === inst.loanId);
        const isOverdue = inst.dueDate < Date.now();
        const daysOverdue = isOverdue ? Math.floor((Date.now() - inst.dueDate) / (1000 * 60 * 60 * 24)) : 0;
        return {
          ...inst,
          customerName: loan?.customerName || 'N/A',
          loanNumber: loan?.loanNumber || 'N/A',
          loanType: loan?.loanType || 'store',
          isOverdue,
          daysOverdue,
          loanObj: loan,
        };
      });
  }, [installments, loans]);

  // Customer detailed statement/profile details
  const customerProfileDetails = useMemo(() => {
    if (!selectedProfileCustomerId) return null;
    const cid = parseInt(selectedProfileCustomerId, 10);
    const cust = customers.find((c) => c.id === cid);
    if (!cust) return null;

    const custLoans = loans.filter((l) => l.customerId === cid);
    const totalOutstanding = custLoans
      .filter((l) => l.status === 'active' || l.status === 'overdue')
      .reduce((sum, l) => sum + l.remainingAmount, 0);

    const paidAmount = custLoans.reduce((sum, l) => sum + l.paidAmount, 0);
    const totalLimit = parseFloat(localStorage.getItem(`credit_limit_${cid}`) || '50000');

    const custLoanIds = custLoans.map((l) => l.id);
    const custPayments = payments.filter((p) => custLoanIds.includes(p.loanId));
    const custInstallments = installments.filter((i) => custLoanIds.includes(i.loanId));

    const upcoming = custInstallments.filter((i) => i.status === 'pending' && i.dueDate >= Date.now());
    const overdue = custInstallments.filter(
      (i) => i.status === 'overdue' || (i.status === 'pending' && i.dueDate < Date.now())
    );

    const onTimePayments = custInstallments.filter((i) => i.status === 'paid' && (!i.lateFee || i.lateFee === 0)).length;
    const totalDueOrPaid = custInstallments.filter((i) => i.status === 'paid' || i.dueDate < Date.now()).length;
    const reliabilityScore = totalDueOrPaid > 0 ? Math.round((onTimePayments / totalDueOrPaid) * 100) : 100;

    return {
      customer: cust,
      loans: custLoans,
      totalOutstanding,
      paidAmount,
      creditLimit: totalLimit,
      availableCredit: Math.max(0, totalLimit - totalOutstanding),
      utilizationPct: totalLimit > 0 ? Math.min(100, Math.round((totalOutstanding / totalLimit) * 100)) : 0,
      payments: custPayments,
      upcoming,
      overdue,
      reliabilityScore,
    };
  }, [selectedProfileCustomerId, customers, loans, payments, installments]);

  // Calculator amortization calculation
  const calculatorAmortization = useMemo(() => {
    const loanAmount = Math.max(0, calcPrice - calcDownPayment);
    if (loanAmount <= 0) return { loanAmount: 0, totalInterest: 0, totalPayable: 0, emi: 0, schedule: [] };

    let totalInterest = 0;
    let totalPayable = loanAmount;
    let emi = 0;
    const schedule = [];

    const monthlyRate = calcRate / 12 / 100;
    const months = calcTenure || 1;

    if (calcInterestType === 'none') {
      emi = loanAmount / months;
      totalPayable = loanAmount;
      totalInterest = 0;
    } else if (calcInterestType === 'flat') {
      totalInterest = loanAmount * (calcRate / 100) * (months / 12);
      totalPayable = loanAmount + totalInterest;
      emi = totalPayable / months;
    } else if (calcInterestType === 'reducing') {
      if (calcRate === 0) {
        emi = loanAmount / months;
        totalPayable = loanAmount;
        totalInterest = 0;
      } else {
        emi =
          (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);
        totalPayable = emi * months;
        totalInterest = totalPayable - loanAmount;
      }
    }

    let tempPrincipal = loanAmount;
    const today = new Date();

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + i);

      let interestPart = 0;
      let principalPart = emi;

      if (calcInterestType === 'reducing' && calcRate > 0) {
        interestPart = tempPrincipal * monthlyRate;
        principalPart = emi - interestPart;
        tempPrincipal -= principalPart;
      } else if (calcInterestType === 'flat') {
        interestPart = totalInterest / months;
        principalPart = loanAmount / months;
      } else {
        interestPart = 0;
        principalPart = loanAmount / months;
      }

      schedule.push({
        installmentNo: i,
        dueDate: dueDate.getTime(),
        interest: interestPart,
        principal: principalPart,
        amount: emi,
        balance: Math.max(0, tempPrincipal),
      });
    }

    return {
      loanAmount,
      totalInterest,
      totalPayable,
      emi,
      schedule,
    };
  }, [calcPrice, calcDownPayment, calcRate, calcTenure, calcInterestType]);

  // Create New Loan Action
  const handleCreateNewLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoanCustomerName || !newLoanCustomerName.trim()) {
      toast.error('Please enter customer name for the loan account');
      return;
    }

    const cleanName = newLoanCustomerName.trim();
    const cleanPhone = newLoanCustomerPhone.trim();

    let customer: Customer | null = null;
    if (newLoanCustomerId) {
      customer = customers.find((c) => c.id === parseInt(newLoanCustomerId, 10)) || null;
    }
    if (!customer && cleanPhone) {
      const cleanDigits = cleanPhone.replace(/\D/g, '');
      const last10 = cleanDigits.slice(-10);
      customer = customers.find((c) => c.phone && c.phone.replace(/\D/g, '').endsWith(last10)) || null;
    }
    if (!customer) {
      customer = customers.find((c) => c.name.toLowerCase() === cleanName.toLowerCase()) || null;
    }

    let customerIdToUse: number;
    let customerNameToUse = cleanName;

    if (customer && customer.id) {
      customerIdToUse = customer.id;
      customerNameToUse = customer.name;
      // Update existing customer record with any new phone/pan/govtId
      const custUpdates: Partial<Customer> = {};
      if (cleanPhone && !customer.phone) custUpdates.phone = cleanPhone;
      if (newLoanGovtIdType === 'Aadhaar' && newLoanGovtIdNumber && !customer.aadhaarNumber) {
        custUpdates.aadhaarNumber = newLoanGovtIdNumber;
      }
      if (newLoanPan && !customer.pan) {
        custUpdates.pan = newLoanPan;
      }
      if (newLoanGovtIdNumber && !customer.govtIdNumber) {
        custUpdates.govtIdType = newLoanGovtIdType;
        custUpdates.govtIdNumber = newLoanGovtIdNumber;
      }
      if (Object.keys(custUpdates).length > 0) {
        custUpdates.updatedAt = Date.now();
        await db.customers.update(customer.id, custUpdates);
      }
    } else {
      // Auto-save new customer into db.customers so they appear in Customers section
      customerIdToUse = (await db.customers.add({
        name: cleanName,
        phone: cleanPhone,
        email: '',
        address: '',
        city: '',
        state: 'Rajasthan',
        pincode: '',
        gstin: '',
        pan: newLoanPan || (newLoanGovtIdType === 'PAN' ? newLoanGovtIdNumber : ''),
        aadhaarNumber: newLoanGovtIdType === 'Aadhaar' ? newLoanGovtIdNumber : undefined,
        govtIdType: newLoanGovtIdType || undefined,
        govtIdNumber: newLoanGovtIdNumber ? newLoanGovtIdNumber.trim() : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })) as number;
    }

    const principal = Number(newLoanPrincipal) || 0;
    const downPayment = Number(newLoanDownPayment) || 0;
    const loanAmount = Math.max(0, principal - downPayment);
    const tenure = Number(newLoanTenure) || 12;
    const rate = Number(newLoanRate) || 0;

    if (loanAmount <= 0) {
      toast.error('Loan amount must be greater than zero');
      return;
    }

    const toastId = toast.loading('Disbursing loan and creating installment schedule...');

    try {
      // Calculate EMI
      let emi = 0;
      let totalInterest = 0;
      const monthlyRate = rate / 12 / 100;

      if (newLoanInterestType === 'none' || rate === 0) {
        emi = loanAmount / tenure;
      } else if (newLoanInterestType === 'flat') {
        totalInterest = loanAmount * (rate / 100) * (tenure / 12);
        emi = (loanAmount + totalInterest) / tenure;
      } else {
        emi =
          (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
          (Math.pow(1 + monthlyRate, tenure) - 1);
        totalInterest = emi * tenure - loanAmount;
      }

      const totalPayable = loanAmount + totalInterest;
      const startTimestamp = new Date(newLoanStartDate).getTime() || Date.now();
      const endTimestamp = startTimestamp + tenure * 30 * 24 * 60 * 60 * 1000;
      const loanNumber = `LN-${Date.now().toString().slice(-6)}`;

      // 1. Add to loans DB with Govt ID & KYC Credentials
      const loanId = await db.loans.add({
        loanNumber,
        customerId: customerIdToUse,
        customerName: customerNameToUse,
        loanType: newLoanType,
        status: 'active',
        startDate: startTimestamp,
        endDate: endTimestamp,
        interestRate: rate,
        interestType: newLoanInterestType,
        tenureMonths: tenure,
        principalAmount: principal,
        downPayment,
        loanAmount,
        monthlyEMI: Math.round(emi),
        remainingAmount: totalPayable,
        paidAmount: 0,
        nextDueDate: startTimestamp + 30 * 24 * 60 * 60 * 1000,
        financePartnerName: newLoanType === 'finance' ? newLoanPartner : undefined,
        remarks: newLoanRemarks || 'Disbursed via Loans & EMI suite',
        aadhaarNumber: newLoanGovtIdType === 'Aadhaar' ? newLoanGovtIdNumber : undefined,
        panNumber: newLoanPan || (newLoanGovtIdType === 'PAN' ? newLoanGovtIdNumber : undefined),
        govtIdType: newLoanGovtIdType,
        govtIdNumber: newLoanGovtIdNumber || undefined,
        guarantorName: newLoanGuarantorName || undefined,
        guarantorPhone: newLoanGuarantorPhone || undefined,
        guarantorRelation: newLoanGuarantorRelation || undefined,
        idProofDoc: newLoanIdProofDoc,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 2. Generate Installments
      const baseDueDate = new Date(startTimestamp);
      for (let i = 1; i <= tenure; i++) {
        const dueDate = new Date(baseDueDate);
        dueDate.setMonth(baseDueDate.getMonth() + i);

        await db.loanInstallments.add({
          loanId: loanId as number,
          installmentNo: i,
          dueDate: dueDate.getTime(),
          amount: Math.round(emi),
          status: 'pending',
          lateFee: 0,
        });
      }

      toast.dismiss(toastId);
      toast.success(`Loan account ${loanNumber} disbursed for ${customerNameToUse}!`);
      setNewLoanCustomerName('');
      setNewLoanCustomerPhone('');
      setNewLoanCustomerId('');
      setIsCreateLoanOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to disburse loan:', err);
      toast.dismiss(toastId);
      toast.error('Failed to create loan account');
    }
  };

  // Handle saving collected payment to DB
  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !selectedLoan.id) return;

    const amount = parseFloat(collectAmount) || 0;
    const lateFee = parseFloat(collectLateFee) || 0;
    if (amount <= 0) {
      toast.error('Please enter a valid collection amount');
      return;
    }

    const toastId = toast.loading('Recording EMI collection...');

    try {
      // 1. Write the payment log
      await db.loanPayments.add({
        loanId: selectedLoan.id,
        paymentDate: Date.now(),
        amountPaid: amount,
        paymentMode: collectMode,
        referenceNumber: collectRef || undefined,
        notes: collectNotes || undefined,
        receivedBy: 'Billing Counter',
      });

      // 2. Pay off installments chronologically
      const loanInsts = await db.loanInstallments
        .where('loanId')
        .equals(selectedLoan.id)
        .sortBy('installmentNo');

      let remaining = amount;
      for (const inst of loanInsts) {
        if (inst.status !== 'paid' && remaining > 0) {
          const installmentDue = inst.amount + (inst.lateFee || 0);

          if (remaining >= installmentDue) {
            inst.status = 'paid';
            inst.paidDate = Date.now();
            inst.paymentMethod = collectMode;
            inst.transactionReference = collectRef;
            if (lateFee > 0) {
              inst.lateFee = (inst.lateFee || 0) + lateFee;
            }
            await db.loanInstallments.put(inst);
            remaining -= installmentDue;
          } else {
            inst.amount = Math.max(0, inst.amount - remaining);
            await db.loanInstallments.put(inst);
            remaining = 0;
          }
        }
      }

      // 3. Update Loan account status & balances
      const updatedPaid = selectedLoan.paidAmount + amount;
      const updatedRemaining = Math.max(0, selectedLoan.remainingAmount - amount);
      const isDone = updatedRemaining <= 0;

      const refreshedInsts = await db.loanInstallments
        .where('loanId')
        .equals(selectedLoan.id)
        .toArray();

      const nextInst = refreshedInsts
        .filter((i) => i.status !== 'paid')
        .sort((a, b) => a.dueDate - b.dueDate)[0];

      const nextDueDate = nextInst ? nextInst.dueDate : null;
      let nextStatus: Loan['status'] = isDone ? 'completed' : 'active';
      if (!isDone && nextInst && nextInst.dueDate < Date.now()) {
        nextStatus = 'overdue';
      }

      await db.loans.update(selectedLoan.id, {
        paidAmount: updatedPaid,
        remainingAmount: updatedRemaining,
        nextDueDate,
        status: nextStatus,
        updatedAt: Date.now(),
      });

      // 4. Update the Invoice model's paid totals if linked
      if (selectedLoan.invoiceId) {
        const invoice = await db.invoices.get(selectedLoan.invoiceId);
        if (invoice) {
          const newPaid = invoice.paidAmount + amount;
          const newBalance = Math.max(0, invoice.totalAmount - newPaid);
          const newInvoiceStatus = newBalance <= 0 ? 'paid' : 'partial';

          await db.invoices.update(selectedLoan.invoiceId, {
            paidAmount: newPaid,
            balanceDue: newBalance,
            status: newInvoiceStatus,
            updatedAt: Date.now(),
          });
        }
      }

      setIsCollectOpen(false);
      setCollectAmount('');
      setCollectRef('');
      setCollectLateFee('0');
      setCollectNotes('');

      await loadData();
      const refreshedLoan = await db.loans.get(selectedLoan.id);
      if (refreshedLoan) setSelectedLoan(refreshedLoan);

      toast.dismiss(toastId);
      toast.success(`Payment of ${formatCurrency(amount)} recorded successfully!`);
    } catch (err) {
      console.error('Error saving collection:', err);
      toast.dismiss(toastId);
      toast.error('Failed to record payment');
    }
  };

  // Save credit limit
  const handleSaveCreditLimit = () => {
    if (!selectedProfileCustomerId) return;
    localStorage.setItem(`credit_limit_${selectedProfileCustomerId}`, customerCreditLimit);
    setIsCreditLimitOpen(false);
    toast.success('Customer credit limit updated');
    loadData();
  };

  // Quick action: open collect modal for an installment
  const handleQuickCollect = (inst: any) => {
    const loan = loans.find((l) => l.id === inst.loanId);
    if (loan) {
      setSelectedLoan(loan);
      setCollectAmount(inst.amount.toString());
      setIsCollectOpen(true);
    }
  };

  // Export Loans & Installment Register to Excel
  const handleExportLoansExcel = () => {
    if (loans.length === 0) {
      toast.error('No loan records to export');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Loans
    const loansData = loans.map((l) => ({
      'Loan Number': l.loanNumber,
      'Customer Name': l.customerName,
      'Type': l.loanType.toUpperCase(),
      'Partner': l.financePartnerName || 'Store Credit',
      'Principal': l.principalAmount,
      'Down Payment': l.downPayment,
      'Loan Amount': l.loanAmount,
      'Monthly EMI': l.monthlyEMI,
      'Paid': l.paidAmount,
      'Remaining': l.remainingAmount,
      'Tenure': `${l.tenureMonths} Months`,
      'Interest Rate': `${l.interestRate}% (${l.interestType})`,
      'Next Due Date': l.nextDueDate ? formatDate(l.nextDueDate) : 'N/A',
      'Status': l.status.toUpperCase(),
    }));
    const wsLoans = XLSX.utils.json_to_sheet(loansData);
    XLSX.utils.book_append_sheet(wb, wsLoans, 'Loans Register');

    // Sheet 2: Payments
    if (payments.length > 0) {
      const payRows = payments.map((p) => {
        const loan = loans.find((l) => l.id === p.loanId);
        return {
          'Receipt Date': formatDate(p.paymentDate),
          'Loan Number': loan?.loanNumber || 'N/A',
          'Customer': loan?.customerName || 'N/A',
          'Amount Paid': p.amountPaid,
          'Mode': p.paymentMode,
          'Reference': p.referenceNumber || 'N/A',
          'Notes': p.notes || '',
        };
      });
      const wsPay = XLSX.utils.json_to_sheet(payRows);
      XLSX.utils.book_append_sheet(wb, wsPay, 'Collections Log');
    }

    XLSX.writeFile(wb, `Loan_Management_Register_${Date.now()}.xlsx`);
    toast.success('Loan register exported to Excel');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/50 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Loans & EMI Management</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-2 py-0.5">
              {stats.activeLoansCount} Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Track customer store credit, installment amortization, financing partners, and recover due collections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleExportLoansExcel}
            variant="outline"
            size="sm"
            className="rounded-xl font-bold h-9 border-border/60 hover:bg-muted/40 gap-1.5"
          >
            <Download className="h-4 w-4" /> Export Register
          </Button>
          <Button
            onClick={() => setIsCreateLoanOpen(true)}
            size="sm"
            className="rounded-xl font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Disburse New Loan
          </Button>
        </div>
      </div>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-3.5 rounded-xl border border-border/50 bg-card flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Loans</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-foreground">{stats.activeLoansCount}</span>
            <span className="text-[10px] text-primary block mt-0.5 font-semibold">Open portfolios</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Outstanding</span>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-foreground font-mono">{formatCurrency(stats.totalOutstanding)}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Remaining principal</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Today's Collections</span>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(stats.todayCollection)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Cleared today</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Overdue Dues</span>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(stats.overdueAmount)}</span>
            <span className="text-[10px] text-rose-500 block mt-0.5 font-semibold">{stats.overdueCount} installments late</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Recovery</span>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-foreground font-mono">{formatCurrency(stats.monthlyRecovery)}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Month to date</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-card flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Partner Loans</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-foreground">{stats.partnerLoansCount}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Bajaj / HDB / TVS</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation - Prominent, Large Touch Targets & Clear Selection State */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
        <div className="bg-card/70 p-2 rounded-2xl border border-border/60 backdrop-blur-xs">
          <TabsList className="flex flex-wrap items-center gap-2 bg-transparent p-0 w-full h-auto">
            <TabsTrigger
              value="overview"
              className="flex-1 min-w-42.5 sm:flex-initial py-3 px-5 text-sm font-bold rounded-xl gap-2.5 transition-all duration-150 border data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:border-border/60 data-[state=inactive]:bg-background/80 data-[state=inactive]:text-foreground/80 data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:text-foreground cursor-pointer"
            >
              <Clock className="h-4.5 w-4.5 shrink-0" />
              <span>Overview & Dues</span>
              {dueInstallments.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                  {dueInstallments.length}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="accounts"
              className="flex-1 min-w-45 sm:flex-initial py-3 px-5 text-sm font-bold rounded-xl gap-2.5 transition-all duration-150 border data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:border-border/60 data-[state=inactive]:bg-background/80 data-[state=inactive]:text-foreground/80 data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:text-foreground cursor-pointer"
            >
              <CreditCard className="h-4.5 w-4.5 shrink-0" />
              <span>Loan Accounts</span>
              <span className="ml-1 px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-muted text-foreground/80 border border-border/40">
                {loans.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="profiles"
              className="flex-1 min-w-55 sm:flex-initial py-3 px-5 text-sm font-bold rounded-xl gap-2.5 transition-all duration-150 border data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:border-border/60 data-[state=inactive]:bg-background/80 data-[state=inactive]:text-foreground/80 data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:text-foreground cursor-pointer"
            >
              <UserCheck className="h-4.5 w-4.5 shrink-0" />
              <span>Customer Khata & Limits</span>
            </TabsTrigger>

            <TabsTrigger
              value="calculator"
              className="flex-1 min-w-42.5 sm:flex-initial py-3 px-5 text-sm font-bold rounded-xl gap-2.5 transition-all duration-150 border data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:border-border/60 data-[state=inactive]:bg-background/80 data-[state=inactive]:text-foreground/80 data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:text-foreground cursor-pointer"
            >
              <Calculator className="h-4.5 w-4.5 shrink-0" />
              <span>EMI Calculator</span>
            </TabsTrigger>

            <TabsTrigger
              value="reports"
              className="flex-1 min-w-45 sm:flex-initial py-3 px-5 text-sm font-bold rounded-xl gap-2.5 transition-all duration-150 border data-[state=active]:border-primary/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:border-border/60 data-[state=inactive]:bg-background/80 data-[state=inactive]:text-foreground/80 data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:text-foreground cursor-pointer"
            >
              <Receipt className="h-4.5 w-4.5 shrink-0" />
              <span>Collections Register</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* -------------------- 1. OVERVIEW TAB -------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Due & Overdue Installments Feed */}
            <Card className="lg:col-span-8 border border-border/50 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Due & Overdue Installments (Next 15 Days)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pending repayments that require follow-up or immediate collection
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-bold bg-muted">
                  {dueInstallments.length} pending
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {dueInstallments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="text-xs font-bold">All upcoming EMIs are cleared on schedule!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {dueInstallments.map((inst) => (
                      <div key={inst.id} className="p-3.5 flex items-center justify-between hover:bg-muted/15 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              inst.isOverdue
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            #{inst.installmentNo}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground truncate">{inst.customerName}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{inst.loanNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Due: {formatDate(inst.dueDate)}
                              </span>
                              {inst.isOverdue && (
                                <span className="text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 rounded">
                                  {inst.daysOverdue}d overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-extrabold font-mono text-foreground">{formatCurrency(inst.amount)}</span>
                          <Button
                            size="sm"
                            onClick={() => handleQuickCollect(inst)}
                            className="h-8 rounded-lg font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Collect
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Financing Channels & Quick Tools */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border border-border/50 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Credit Channels Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="p-3 rounded-xl border border-border/40 bg-muted/15 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <Coins className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">In-Store Credit / Khata</p>
                        <p className="text-[10px] text-muted-foreground">{stats.storeLoansCount} accounts</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono font-bold text-xs">Self Funded</Badge>
                  </div>

                  <div className="p-3 rounded-xl border border-border/40 bg-muted/15 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Finance Partners</p>
                        <p className="text-[10px] text-muted-foreground">{stats.partnerLoansCount} accounts</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono font-bold text-xs">Bajaj / HDB / TVS</Badge>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => setIsCreateLoanOpen(true)}
                      className="w-full rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-10 shadow-xs"
                    >
                      <Plus className="h-4 w-4" /> Disburse New Customer Loan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Overdue Alert Advisory */}
              {stats.overdueCount > 0 && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Action Required: {stats.overdueCount} Overdue EMIs</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Total overdue balance of <strong className="text-foreground font-mono">{formatCurrency(stats.overdueAmount)}</strong> requires customer follow-up to protect store cash flow.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* -------------------- 2. LOAN ACCOUNTS TAB -------------------- */}
        <TabsContent value="accounts" className="space-y-4">
          {/* Filter Bar */}
          <Card className="border border-border/50 shadow-xs">
            <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2.5 min-w-60">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer, loan #, or invoice..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="defaulted">Defaulted</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-36 h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Loan Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="store">Store Installment</SelectItem>
                    <SelectItem value="finance">Finance Partner</SelectItem>
                    <SelectItem value="credit">Store Credit (Khata)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => setIsCreateLoanOpen(true)}
                  size="sm"
                  className="rounded-xl font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  <Plus className="h-4 w-4" /> New Loan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loans Directory Table */}
          <Card className="border border-border/50 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/40 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Loan Account</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Type / Partner</th>
                    <th className="py-3 px-4 text-right">Principal</th>
                    <th className="py-3 px-4">Repayment Progress</th>
                    <th className="py-3 px-4 text-right">Monthly EMI</th>
                    <th className="py-3 px-4">Next Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-card">
                  {filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground">
                        <CreditCard className="h-9 w-9 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-bold">No loan accounts found matching criteria</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => {
                      const progressPct =
                        loan.principalAmount > 0
                          ? Math.min(100, Math.round((loan.paidAmount / (loan.paidAmount + loan.remainingAmount)) * 100))
                          : 0;

                      return (
                        <tr key={loan.id} className="hover:bg-muted/15 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-foreground block">{loan.loanNumber}</span>
                            {loan.invoiceNumber && (
                              <span className="text-[10px] text-muted-foreground">Inv: {loan.invoiceNumber}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-foreground block">{loan.customerName}</span>
                            {loan.govtIdNumber && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono mt-0.5">
                                <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                                {loan.govtIdType || 'ID'}: {loan.govtIdNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize font-semibold text-foreground block">
                              {loan.loanType === 'finance' ? loan.financePartnerName || 'Finance Partner' : 'In-Store Credit'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{loan.tenureMonths} Mo @ {loan.interestRate}%</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                            {formatCurrency(loan.principalAmount)}
                          </td>
                          <td className="py-3 px-4 min-w-36">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Paid: {formatCurrency(loan.paidAmount, 0)}</span>
                              <span className="font-bold text-foreground">{progressPct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${progressPct}%` }}
                                className={`h-full rounded-full ${
                                  loan.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : loan.status === 'overdue'
                                    ? 'bg-rose-500'
                                    : 'bg-primary'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-foreground">
                            {formatCurrency(loan.monthlyEMI)}
                          </td>
                          <td className="py-3 px-4">
                            {loan.nextDueDate ? (
                              <span
                                className={`text-[11px] font-semibold ${
                                  loan.nextDueDate < Date.now() && loan.status !== 'completed'
                                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {formatDate(loan.nextDueDate)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Settled</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold capitalize ${
                                loan.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : loan.status === 'overdue'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                  : loan.status === 'completed'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {loan.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedLoan(loan);
                                  setIsScheduleOpen(true);
                                }}
                                className="h-7 text-xs font-bold px-2 rounded-lg"
                              >
                                Schedule
                              </Button>
                              {loan.status !== 'completed' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReminderLoan(loan)}
                                    className="h-7 text-xs font-bold px-2 rounded-lg border-emerald-500/30 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 gap-1"
                                    title="Send EMI Reminder on WhatsApp"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">WhatsApp</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLoan(loan);
                                      setCollectAmount(loan.monthlyEMI.toString());
                                      setIsCollectOpen(true);
                                    }}
                                    className="h-7 text-xs font-bold px-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                                  >
                                    Collect
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* -------------------- 3. CUSTOMER KHATA & PROFILES TAB -------------------- */}
        <TabsContent value="profiles" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Customer Selector Card */}
            <Card className="lg:col-span-4 border border-border/50 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Select Customer Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Select Customer</Label>
                  <Select value={selectedProfileCustomerId} onValueChange={setSelectedProfileCustomerId}>
                    <SelectTrigger className="w-full h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id?.toString() || ''}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {customerProfileDetails && (
                  <div className="pt-4 space-y-4">
                    {/* Customer Identity Card */}
                    <div className="p-3.5 rounded-xl border border-border/40 bg-muted/15 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-foreground">
                          {customerProfileDetails.customer.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary">
                          {customerProfileDetails.reliabilityScore}% Score
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Phone: {customerProfileDetails.customer.phone || 'N/A'}
                      </p>
                      {customerProfileDetails.customer.city && (
                        <p className="text-xs text-muted-foreground">
                          Location: {customerProfileDetails.customer.city}, {customerProfileDetails.customer.state}
                        </p>
                      )}
                    </div>

                    {/* Credit Limit & Utilization */}
                    <div className="p-3.5 rounded-xl border border-border/40 bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credit Limit</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomerCreditLimit(customerProfileDetails.creditLimit.toString());
                            setIsCreditLimitOpen(true);
                          }}
                          className="h-6 text-[11px] font-bold text-primary p-1 hover:underline"
                        >
                          Edit Limit
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Outstanding Used:</span>
                          <span className="font-bold font-mono text-foreground">
                            {formatCurrency(customerProfileDetails.totalOutstanding)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Available Credit:</span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(customerProfileDetails.availableCredit)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden mt-1">
                          <div
                            style={{ width: `${customerProfileDetails.utilizationPct}%` }}
                            className={`h-full rounded-full transition-all ${
                              customerProfileDetails.utilizationPct > 80 ? 'bg-rose-500' : 'bg-primary'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground block text-right">
                          {customerProfileDetails.utilizationPct}% utilized of {formatCurrency(customerProfileDetails.creditLimit)} limit
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Loans and History */}
            <Card className="lg:col-span-8 border border-border/50 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Customer Active Loans & History</span>
                  <Badge variant="outline" className="text-xs">
                    {customerProfileDetails?.loans.length || 0} Accounts
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {!customerProfileDetails || customerProfileDetails.loans.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Coins className="h-9 w-9 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">No loan or credit accounts registered for this customer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerProfileDetails.loans.map((loan) => (
                      <div key={loan.id} className="p-3.5 rounded-xl border border-border/40 bg-muted/10 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground text-xs">{loan.loanNumber}</span>
                            <Badge variant="outline" className="text-[10px] font-bold capitalize">
                              {loan.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            EMI: <strong className="text-foreground">{formatCurrency(loan.monthlyEMI)}/mo</strong> · {loan.tenureMonths} Months · Rate: {loan.interestRate}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-xs font-bold font-mono text-foreground block">
                              Remaining: {formatCurrency(loan.remainingAmount)}
                            </span>
                            <span className="text-[10px] text-emerald-600 block">
                              Paid: {formatCurrency(loan.paidAmount)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLoan(loan);
                              setIsScheduleOpen(true);
                            }}
                            className="h-8 text-xs font-bold rounded-lg"
                          >
                            Schedule
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------------------- 4. EMI CALCULATOR TAB -------------------- */}
        <TabsContent value="calculator" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Input Controls */}
            <Card className="lg:col-span-5 border border-border/50 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Loan & Financing Parameters
                </CardTitle>
                <CardDescription className="text-xs">Adjust principal, down payment, and tenure</CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Purchase / Asset Price (₹)</Label>
                  <Input
                    type="number"
                    value={calcPrice}
                    onChange={(e) => setCalcPrice(Number(e.target.value))}
                    className="h-9 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Down Payment Paid (₹)</Label>
                  <Input
                    type="number"
                    value={calcDownPayment}
                    onChange={(e) => setCalcDownPayment(Number(e.target.value))}
                    className="h-9 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Interest Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: '0% No Cost' },
                      { id: 'flat', label: 'Flat Rate' },
                      { id: 'reducing', label: 'Reducing Bal' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCalcInterestType(m.id as any)}
                        className={`text-xs font-semibold py-1.5 px-2 rounded-xl border transition-all ${
                          calcInterestType === m.id
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border/60 hover:bg-muted/30 text-muted-foreground'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {calcInterestType !== 'none' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-foreground">
                      <span>Annual Interest Rate (%)</span>
                      <span className="font-mono text-primary">{calcRate}%</span>
                    </div>
                    <Input
                      type="number"
                      step="0.5"
                      value={calcRate}
                      onChange={(e) => setCalcRate(Number(e.target.value))}
                      className="h-9 rounded-xl text-xs font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-foreground">
                    <span>Tenure Duration</span>
                    <span className="font-mono text-primary">{calcTenure} Months</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[3, 6, 9, 12, 18, 24, 36].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCalcTenure(t)}
                        className={`text-xs font-semibold py-1 rounded-lg border transition-all ${
                          calcTenure === t
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border/50 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        {t}m
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result & Amortization Schedule */}
            <Card className="lg:col-span-7 border border-border/50 shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Coins className="h-4 w-4 text-emerald-500" />
                        Estimated Monthly EMI & Summary
                      </CardTitle>
                      <CardDescription className="text-xs">Based on {calcTenure} monthly installments</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setNewLoanPrincipal(calcPrice);
                        setNewLoanDownPayment(calcDownPayment);
                        setNewLoanTenure(calcTenure);
                        setNewLoanRate(calcRate);
                        setNewLoanInterestType(calcInterestType);
                        setIsCreateLoanOpen(true);
                      }}
                      className="rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Convert to Loan
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Primary Scorecard */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Monthly EMI</span>
                      <span className="text-xl font-black text-primary font-mono block mt-1">
                        {formatCurrency(calculatorAmortization.emi, 0)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/40 bg-muted/15">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Loan Amount</span>
                      <span className="text-xl font-black text-foreground font-mono block mt-1">
                        {formatCurrency(calculatorAmortization.loanAmount, 0)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/40 bg-muted/15">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Interest</span>
                      <span className="text-xl font-black text-amber-600 font-mono block mt-1">
                        {formatCurrency(calculatorAmortization.totalInterest, 0)}
                      </span>
                    </div>
                  </div>

                  {/* Amortization Table Preview */}
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <div className="bg-muted/40 px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground grid grid-cols-5 text-center border-b border-border/40">
                      <span className="text-left">Inst #</span>
                      <span>Principal</span>
                      <span>Interest</span>
                      <span>EMI</span>
                      <span className="text-right">Balance</span>
                    </div>
                    <div className="divide-y divide-border/20 max-h-60 overflow-y-auto text-xs">
                      {calculatorAmortization.schedule.map((item) => (
                        <div key={item.installmentNo} className="px-3 py-2 grid grid-cols-5 text-center items-center hover:bg-muted/15 font-mono">
                          <span className="text-left font-bold text-foreground">Month {item.installmentNo}</span>
                          <span className="text-muted-foreground">{formatCurrency(item.principal, 0)}</span>
                          <span className="text-amber-600">{formatCurrency(item.interest, 0)}</span>
                          <span className="font-bold text-foreground">{formatCurrency(item.amount, 0)}</span>
                          <span className="text-right text-muted-foreground">{formatCurrency(item.balance, 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* -------------------- 5. REPORTS TAB -------------------- */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="border border-border/50 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Loan Recovery & Collections Log
                </CardTitle>
                <CardDescription className="text-xs">Chronological payments registered across all customer loan accounts</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportLoansExcel}
                className="rounded-xl font-bold text-xs gap-1.5"
              >
                <Download className="h-4 w-4" /> Export to Excel
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/40 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Loan Account</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Amount Cleared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 bg-card">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">
                          <Receipt className="h-9 w-9 mx-auto mb-2 opacity-40" />
                          <p className="text-xs font-bold">No EMI payment transactions recorded yet</p>
                        </td>
                      </tr>
                    ) : (
                      payments.slice(0, 20).map((pay) => {
                        const loan = loans.find((l) => l.id === pay.loanId);
                        return (
                          <tr key={pay.id} className="hover:bg-muted/15 transition-colors">
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {formatDateTime(pay.paymentDate)}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-foreground">
                              {loan?.loanNumber || 'N/A'}
                            </td>
                            <td className="py-3 px-4 font-bold text-foreground">
                              {loan?.customerName || 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="font-semibold text-[10px]">
                                {pay.paymentMode}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {pay.referenceNumber || 'Counter'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(pay.amountPaid)}
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
        </TabsContent>
      </Tabs>

      {/* ==================== MODALS ==================== */}

      {/* 1. Disburse New Loan Modal */}
      <Dialog open={isCreateLoanOpen} onOpenChange={setIsCreateLoanOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-6">
          <form onSubmit={handleCreateNewLoan}>
            <DialogHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">Disburse Customer Loan / EMI</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Create in-store credit account or tie with partner financing
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Customer Input & Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Customer Name *</Label>
                    {newLoanCustomerId && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 py-0 px-1.5">
                        Saved Customer
                      </Badge>
                    )}
                  </div>
                  <Input
                    list="loan-borrowers-datalist"
                    value={newLoanCustomerName}
                    onChange={(e) => handleLoanCustomerNameChange(e.target.value)}
                    placeholder="Type name (e.g. Ramesh Sharma)"
                    className="h-9 rounded-xl text-xs font-medium"
                    required
                  />
                  <datalist id="loan-borrowers-datalist">
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.phone ? `${c.phone} · ` : ''}{c.city || ''}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Phone / WhatsApp Number</Label>
                  <Input
                    type="tel"
                    value={newLoanCustomerPhone}
                    onChange={(e) => {
                      setNewLoanCustomerPhone(e.target.value);
                      const cleanDigits = e.target.value.replace(/\D/g, '');
                      if (cleanDigits.length >= 10) {
                        const last10 = cleanDigits.slice(-10);
                        const matched = customers.find(c => c.phone && c.phone.replace(/\D/g, '').endsWith(last10));
                        if (matched && matched.id && (!newLoanCustomerName || newLoanCustomerName.trim().toLowerCase() === matched.name.toLowerCase())) {
                          handleSelectCustomerForLoan(matched.id.toString());
                        }
                      }
                    }}
                    placeholder="10-digit mobile number"
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Or Quick Pick from existing customers dropdown */}
              {customers.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Or Select From Saved Customers</span>
                    <div className="h-px bg-border/50 flex-1" />
                  </div>
                  <Select value={newLoanCustomerId} onValueChange={handleSelectCustomerForLoan}>
                    <SelectTrigger className="w-full h-8 rounded-lg text-xs text-muted-foreground">
                      <SelectValue placeholder="Choose from saved customers list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id?.toString() || ''}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Loan Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Credit Channel</Label>
                  <Select value={newLoanType} onValueChange={(v: any) => setNewLoanType(v)}>
                    <SelectTrigger className="w-full h-9 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="store">Store Installment (Self)</SelectItem>
                      <SelectItem value="finance">Finance Partner</SelectItem>
                      <SelectItem value="credit">Khata Credit Line</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newLoanType === 'finance' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Financing Partner</Label>
                    <Select value={newLoanPartner} onValueChange={setNewLoanPartner}>
                      <SelectTrigger className="w-full h-9 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FINANCE_PARTNERS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Principal & Down Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Total Asset Price (₹) *</Label>
                  <Input
                    type="number"
                    value={newLoanPrincipal}
                    onChange={(e) => setNewLoanPrincipal(Number(e.target.value))}
                    className="h-9 rounded-xl text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Down Payment (₹)</Label>
                  <Input
                    type="number"
                    value={newLoanDownPayment}
                    onChange={(e) => setNewLoanDownPayment(Number(e.target.value))}
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Tenure & Interest */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Tenure (Mo)</Label>
                  <Input
                    type="number"
                    value={newLoanTenure}
                    onChange={(e) => setNewLoanTenure(Number(e.target.value))}
                    className="h-9 rounded-xl text-xs font-mono"
                    min="1"
                    max="60"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={newLoanRate}
                    onChange={(e) => setNewLoanRate(Number(e.target.value))}
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Type</Label>
                  <Select value={newLoanInterestType} onValueChange={(v: any) => setNewLoanInterestType(v)}>
                    <SelectTrigger className="w-full h-9 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">0% No Cost</SelectItem>
                      <SelectItem value="reducing">Reducing</SelectItem>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Account Remarks</Label>
                <Input
                  value={newLoanRemarks}
                  onChange={(e) => setNewLoanRemarks(e.target.value)}
                  placeholder="e.g. Purchased Samsung 55 Inch Smart TV"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Government ID & Borrower Verification Section */}
              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Borrower KYC & Government ID
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Official ID Verification</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Govt ID Type *</Label>
                    <Select value={newLoanGovtIdType} onValueChange={setNewLoanGovtIdType}>
                      <SelectTrigger className="w-full h-9 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aadhaar">Aadhaar Card (UIDAI)</SelectItem>
                        <SelectItem value="PAN">PAN Card</SelectItem>
                        <SelectItem value="Voter ID">Voter ID (EPIC)</SelectItem>
                        <SelectItem value="Driving License">Driving License</SelectItem>
                        <SelectItem value="Passport">Passport</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      {newLoanGovtIdType} Number *
                    </Label>
                    <Input
                      value={newLoanGovtIdNumber}
                      onChange={(e) => setNewLoanGovtIdNumber(e.target.value.toUpperCase())}
                      placeholder={newLoanGovtIdType === 'Aadhaar' ? '12-digit Aadhaar' : 'Govt ID Number'}
                      className="h-9 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {newLoanGovtIdType !== 'PAN' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Customer PAN Number (Optional)</Label>
                    <Input
                      value={newLoanPan}
                      onChange={(e) => setNewLoanPan(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      className="h-9 rounded-xl text-xs font-mono"
                      maxLength={10}
                    />
                  </div>
                )}

                {/* Guarantor Details */}
                <div className="pt-2 border-t border-dashed border-border/40 space-y-2">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Guarantor / Co-applicant (Optional)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={newLoanGuarantorName}
                      onChange={(e) => setNewLoanGuarantorName(e.target.value)}
                      placeholder="Guarantor Name"
                      className="h-8 rounded-lg text-xs"
                    />
                    <Input
                      value={newLoanGuarantorPhone}
                      onChange={(e) => setNewLoanGuarantorPhone(e.target.value)}
                      placeholder="Phone"
                      className="h-8 rounded-lg text-xs font-mono"
                    />
                    <Input
                      value={newLoanGuarantorRelation}
                      onChange={(e) => setNewLoanGuarantorRelation(e.target.value)}
                      placeholder="Relation"
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Attach ID Document Scan / Camera Photo */}
                <div className="pt-2 border-t border-dashed border-border/40 space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    ID Document / Photo Proof
                  </Label>
                  <input
                    type="file"
                    ref={loanProofInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleLoanProofFileChange}
                  />
                  {newLoanIdProofDoc ? (
                    <div className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        {newLoanIdProofName || 'ID Proof Attached'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setNewLoanIdProofDoc(undefined); setNewLoanIdProofName(undefined); }}
                        className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loanProofInputRef.current?.click()}
                      className="w-full text-xs gap-1.5 border-dashed border-border/80 h-9"
                    >
                      <Upload className="h-3.5 w-3.5 text-primary" />
                      Upload Aadhaar / ID Scan or Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/40 sm:justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateLoanOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                Confirm & Disburse Loan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Repayment Schedule Statement Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Loan Repayment Schedule: {selectedLoan?.loanNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Customer: <strong className="text-foreground">{selectedLoan?.customerName}</strong> · EMI: {formatCurrency(selectedLoan?.monthlyEMI || 0)}/mo
                </DialogDescription>
              </div>
              <Badge variant="outline" className="capitalize text-xs font-bold">
                {selectedLoan?.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {/* Borrower KYC & Guarantor Credentials Header */}
            {selectedLoan && (selectedLoan.govtIdNumber || selectedLoan.panNumber || selectedLoan.guarantorName) && (
              <div className="p-3 rounded-xl border border-border/50 bg-muted/20 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {selectedLoan.govtIdNumber && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      {selectedLoan.govtIdType || 'Govt ID'}
                    </span>
                    <span className="font-mono font-bold text-foreground">{selectedLoan.govtIdNumber}</span>
                  </div>
                )}
                {selectedLoan.panNumber && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">PAN Number</span>
                    <span className="font-mono font-bold text-foreground">{selectedLoan.panNumber}</span>
                  </div>
                )}
                {selectedLoan.guarantorName && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Guarantor ({selectedLoan.guarantorRelation || 'Co-signer'})
                    </span>
                    <span className="font-bold text-foreground">
                      {selectedLoan.guarantorName} {selectedLoan.guarantorPhone ? `(${selectedLoan.guarantorPhone})` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border/40 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/40 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Inst #</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Payment Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-card font-mono">
                  {loanInstallments.map((inst) => (
                    <tr key={inst.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-foreground">Installment {inst.installmentNo}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{formatDate(inst.dueDate)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatCurrency(inst.amount)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold capitalize ${
                            inst.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : inst.dueDate < Date.now()
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {inst.status === 'paid' ? 'Paid' : inst.dueDate < Date.now() ? 'Overdue' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-muted-foreground font-sans">
                        {inst.paidDate ? `${formatDate(inst.paidDate)} (${inst.paymentMethod || 'Paid'})` : 'Awaiting payment'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 sm:justify-between items-center text-xs text-muted-foreground">
            <span>Remaining Due: <strong className="text-foreground font-mono">{formatCurrency(selectedLoan?.remainingAmount || 0)}</strong></span>
            <Button size="sm" onClick={() => setIsScheduleOpen(false)} className="rounded-xl font-bold">
              Close Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Collect EMI Payment Modal */}
      <Dialog open={isCollectOpen} onOpenChange={setIsCollectOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-6">
          <form onSubmit={handleCollectPayment}>
            <DialogHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">Collect EMI Repayment</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Borrower: <strong className="text-foreground">{selectedLoan?.customerName}</strong> ({selectedLoan?.loanNumber})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Collection Amount (₹) *</Label>
                <Input
                  type="number"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="h-10 rounded-xl text-sm font-mono font-extrabold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Payment Mode</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['UPI', 'Cash', 'Bank Transfer', 'Card'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCollectMode(m)}
                      className={`text-xs font-semibold py-1.5 rounded-xl border transition-all ${
                        collectMode === m
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border/50 text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">UTR / Transaction Reference</Label>
                <Input
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  placeholder="e.g. UPI Ref / Cheque No"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Payment Notes</Label>
                <Input
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="Optional receipt notes"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/40 sm:justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCollectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                Confirm & Print Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Customer Credit Limit Modal */}
      <Dialog open={isCreditLimitOpen} onOpenChange={setIsCreditLimitOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-5">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-sm font-bold text-foreground">Adjust Khata Credit Limit</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <Label className="text-xs font-bold text-foreground">Maximum Khata Limit (₹)</Label>
            <Input
              type="number"
              value={customerCreditLimit}
              onChange={(e) => setCustomerCreditLimit(e.target.value)}
              className="h-9 rounded-xl font-mono text-xs font-bold"
            />
          </div>
          <DialogFooter className="pt-2 border-t border-border/40">
            <Button size="sm" onClick={handleSaveCreditLimit} className="w-full rounded-xl font-bold">
              Save Limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp EMI Reminder Modal */}
      <WhatsAppDueReminderModal
        open={!!reminderLoan}
        onOpenChange={(open) => !open && setReminderLoan(null)}
        loan={reminderLoan}
        defaultType="emi_due"
      />
    </div>
  );
}
