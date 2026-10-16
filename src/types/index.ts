// =============================================
// InvoicePro - Core Type Definitions
// =============================================

// ---------- Enums & Constants ----------

export const INVOICE_TYPES = {
  TAX_INVOICE: 'tax_invoice',
  RETAIL_INVOICE: 'retail_invoice',
  QUOTATION: 'quotation',
  PROFORMA: 'proforma',
  PURCHASE_INVOICE: 'purchase_invoice',
  DELIVERY_CHALLAN: 'delivery_challan',
  CREDIT_NOTE: 'credit_note',
  DEBIT_NOTE: 'debit_note',
} as const;

export type InvoiceType = typeof INVOICE_TYPES[keyof typeof INVOICE_TYPES];

export const INVOICE_PREFIXES: Record<InvoiceType, string> = {
  tax_invoice: 'INV',
  retail_invoice: 'RET',
  quotation: 'QUO',
  proforma: 'PRO',
  purchase_invoice: 'PUR',
  delivery_challan: 'DC',
  credit_note: 'CN',
  debit_note: 'DN',
};

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  tax_invoice: 'Tax Invoice',
  retail_invoice: 'Retail Invoice',
  quotation: 'Quotation',
  proforma: 'Proforma Invoice',
  purchase_invoice: 'Purchase Invoice',
  delivery_challan: 'Delivery Challan',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
};

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;
export type GSTRate = typeof GST_RATES[number];

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Electricity',
  'Internet',
  'Fuel',
  'Telephone',
  'Office Supplies',
  'Maintenance',
  'Insurance',
  'Miscellaneous',
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Credit', 'EMI'] as const;
export type PaymentMode = typeof PAYMENT_MODES[number];

export const FINANCE_PARTNERS = ['Bajaj Finance', 'HDB Finance', 'TVS Credit', 'Home Credit', 'Other'] as const;
export type FinancePartner = typeof FINANCE_PARTNERS[number];


export const UNITS = [
  'PCS', 'NOS', 'KG', 'GM', 'LTR', 'ML', 'MTR', 'CM', 'FT', 'IN',
  'BOX', 'PKT', 'BAG', 'BTL', 'CAN', 'DZN', 'SET', 'PR', 'ROL', 'SQM',
] as const;
export type Unit = typeof UNITS[number];

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

// ---------- Database Entity Types ----------

export interface Product {
  id?: number;
  name: string;
  sku: string;
  category: string;
  brand: string;
  unit: string;
  hsnCode: string;
  gstPercentage: number;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  batchNumber: string;
  expiryDate: string | null;
  image?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  aadhaarNumber?: string;
  govtIdType?: string;
  govtIdNumber?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  createdAt: number;
  updatedAt: number;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  date: number;
  dueDate: number | null;
  customerId: number | null;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  customerState: string;
  customerPhone: string;
  supplierId: number | null;
  supplierName: string;
  supplierAddress: string;
  supplierGstin: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'amount';
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  paymentMode: string;
  isReverseCharge: boolean;
  isTaxInclusive: boolean;
  notes: string;
  termsAndConditions: string;
  cancellationReason?: string;
  cancelledAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  productId: number | null;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  discountType: 'percentage' | 'amount';
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  imeiOrSerialNo?: string;        // Unique IMEI or Serial Number(s) of the sold item
  modelNumber?: string;           // Hardware Model / Sub-variant / Specs
}

export interface Expense {
  id?: number;
  date: number;
  category: string;
  amount: number;
  description: string;
  paymentMode: string;
  reference: string;
  receiptImage?: string;
  receiptName?: string;
  receiptType?: string;
  createdAt: number;
}

export interface StockLog {
  id?: number;
  productId: number;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string;
  referenceType: 'invoice' | 'purchase' | 'manual' | 'import';
  date: number;
}

export interface Category {
  id?: number;
  name: string;
  description: string;
  createdAt: number;
}

export interface Brand {
  id?: number;
  name: string;
  description: string;
  createdAt: number;
}

export interface BackupLog {
  id?: number;
  type: 'export' | 'import';
  date: number;
  size: number;
  status: 'success' | 'failed';
  notes: string;
}

export interface AppSettings {
  id?: number;
  // Company Info
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyPincode: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyGstin: string;
  companyPan: string;
  companyLogo: string;     // base64 or data URL
  companySignature: string; // base64 or data URL
  // Bank Details
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankBranch: string;
  // UPI
  upiId: string;
  // Invoice Settings
  invoicePrefix: Record<InvoiceType, string>;
  financialYearStart: number; // month (0-11), default 3 (April)
  currency: string;
  currencySymbol: string;
  decimalPlaces: number;
  defaultTaxInclusive: boolean;
  defaultTemplate: string;
  termsAndConditions: string;
  invoiceFooterNotes: string;
  // Sizing & layout settings for logo/sign
  logoWidth?: number;
  logoAlign?: 'left' | 'center' | 'right';
  sigWidth?: number;
  showLogo?: boolean;
  showSignature?: boolean;
  // Theme
  theme: 'light' | 'dark';
}

// ---------- Utility Types ----------

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export type FilterPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DashboardStats {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  profit: number;
  expenses: number;
  pendingPayments: number;
  lowStockProducts: number;
  totalProducts: number;
  totalInvoices: number;
}

export interface GSTBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
}

// Default settings factory
export function createDefaultSettings(): AppSettings {
  return {
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyState: 'Rajasthan',
    companyPincode: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyGstin: '',
    companyPan: '',
    companyLogo: '',
    companySignature: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    bankBranch: '',
    upiId: '',
    invoicePrefix: { ...INVOICE_PREFIXES },
    financialYearStart: 3, // April
    currency: 'INR',
    currencySymbol: '₹',
    decimalPlaces: 2,
    defaultTaxInclusive: false,
    defaultTemplate: 'premium',
    termsAndConditions: '1. Goods once sold will not be taken back or exchanged without prior authorization.\n2. Warranty claims, if any, are covered directly by respective manufacturers.\n3. Interest @ 18% p.a. will be charged on overdue payments after due date.\n4. All disputes are subject to local jurisdiction only.',
    invoiceFooterNotes: 'Thank you for your business! Please quote invoice number for all correspondence. Payments can be settled via UPI, Card, or Bank Transfer.',
    logoWidth: 120,
    logoAlign: 'left',
    sigWidth: 120,
    showLogo: true,
    showSignature: true,
    theme: 'light',
  };
}

export interface Loan {
  id?: number;
  loanNumber: string;
  customerId: number;
  customerName: string;
  invoiceId?: number;
  invoiceNumber?: string;
  loanType: 'store' | 'finance' | 'credit';
  status: 'active' | 'completed' | 'overdue' | 'defaulted' | 'cancelled' | 'disputed';
  startDate: number;
  endDate: number;
  interestRate: number;
  interestType: 'none' | 'simple' | 'flat' | 'reducing';
  tenureMonths: number;
  principalAmount: number;
  downPayment: number;
  loanAmount: number;
  monthlyEMI: number;
  remainingAmount: number;
  paidAmount: number;
  nextDueDate: number | null;
  financePartnerName?: string;
  remarks?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  govtIdType?: string;
  govtIdNumber?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorRelation?: string;
  idProofDoc?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LoanInstallment {
  id?: number;
  loanId: number;
  installmentNo: number;
  dueDate: number;
  amount: number;
  paidDate?: number;
  status: 'pending' | 'paid' | 'overdue' | 'disputed' | 'rescheduled';
  paymentMethod?: string;
  transactionReference?: string;
  lateFee: number;
  remarks?: string;
}

export interface LoanPayment {
  id?: number;
  loanId: number;
  paymentDate: number;
  amountPaid: number;
  paymentMode: string;
  referenceNumber?: string;
  receivedBy?: string;
  notes?: string;
}

