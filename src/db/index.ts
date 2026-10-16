import Dexie, { type Table } from 'dexie';
import type {
  Product,
  Customer,
  Supplier,
  Invoice,
  Expense,
  StockLog,
  Category,
  Brand,
  BackupLog,
  AppSettings,
  Loan,
  LoanInstallment,
  LoanPayment,
} from '@/types';

export class InvoiceProDatabase extends Dexie {
  products!: Table<Product>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  invoices!: Table<Invoice>;
  expenses!: Table<Expense>;
  stockLogs!: Table<StockLog>;
  categories!: Table<Category>;
  brands!: Table<Brand>;
  backupLogs!: Table<BackupLog>;
  settings!: Table<AppSettings>;
  loans!: Table<Loan>;
  loanInstallments!: Table<LoanInstallment>;
  loanPayments!: Table<LoanPayment>;

  constructor() {
    super('BillFlowDB');

    this.version(3).stores({
      products: '++id, name, sku, category, brand, hsnCode, gstPercentage, currentStock, isActive, createdAt',
      customers: '++id, name, phone, email, gstin, state, createdAt',
      suppliers: '++id, name, phone, email, gstNumber, createdAt',
      invoices: '++id, invoiceNumber, invoiceType, date, customerId, supplierId, status, totalAmount, createdAt',
      expenses: '++id, date, category, amount, createdAt',
      stockLogs: '++id, productId, type, date',
      categories: '++id, name',
      brands: '++id, name',
      backupLogs: '++id, date, type',
      settings: '++id',
    });

    this.version(4).stores({
      products: '++id, name, sku, category, brand, hsnCode, gstPercentage, currentStock, isActive, createdAt',
      customers: '++id, name, phone, email, gstin, state, createdAt',
      suppliers: '++id, name, phone, email, gstNumber, createdAt',
      invoices: '++id, invoiceNumber, invoiceType, date, customerId, supplierId, status, totalAmount, createdAt',
      expenses: '++id, date, category, amount, createdAt',
      stockLogs: '++id, productId, type, date',
      categories: '++id, name',
      brands: '++id, name',
      backupLogs: '++id, date, type',
      settings: '++id',
      loans: '++id, loanNumber, customerId, invoiceId, loanType, status, nextDueDate, createdAt',
      loanInstallments: '++id, loanId, installmentNo, dueDate, status',
      loanPayments: '++id, loanId, paymentDate',
    });

    // Migration from v2 (old schema) if needed
    this.version(3).upgrade(tx => {
      // The old tables (products, sales, settings) will be handled
      // New tables are auto-created by Dexie
      console.log('Database migrated to v3');
    });

    this.version(4).upgrade(tx => {
      console.log('Database migrated to v4 with Loans tables');
    });
  }
}

export const db = new InvoiceProDatabase();
export const BillFlowDatabase = InvoiceProDatabase;

export async function ensureLargeAutoIncrementIds() {
  const STARTING_ID = 10000000; // 8 digits (makes next ID 10000001)

  const mainTables = [
    'products',
    'customers',
    'suppliers',
    'invoices',
    'expenses',
    'stockLogs',
    'categories',
    'brands',
    'loans',
    'loanInstallments',
    'loanPayments'
  ] as const;

  for (const tableName of mainTables) {
    try {
      const table = db[tableName];
      const lastItem = await table.toCollection().last();
      const maxId = lastItem ? (lastItem.id ?? 0) : 0;
      if (maxId < STARTING_ID) {
        await table.add({ id: STARTING_ID } as any);
        await table.delete(STARTING_ID);
        console.log(`Auto-increment for ${tableName} elevated to ${STARTING_ID + 1}`);
      }
    } catch (err) {
      console.error(`Failed to elevate ${tableName}:`, err);
    }
  }
}

// Seed default categories
export async function seedDefaults() {
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd([
      { name: 'General', description: 'General products', createdAt: Date.now() },
      { name: 'Electronics', description: 'Electronic items', createdAt: Date.now() },
      { name: 'Clothing', description: 'Apparel and garments', createdAt: Date.now() },
      { name: 'Food & Beverages', description: 'Food items and drinks', createdAt: Date.now() },
      { name: 'Stationery', description: 'Office supplies', createdAt: Date.now() },
      { name: 'Hardware', description: 'Hardware and tools', createdAt: Date.now() },
      { name: 'Cosmetics', description: 'Beauty and personal care', createdAt: Date.now() },
      { name: 'Medicine', description: 'Pharmaceutical products', createdAt: Date.now() },
      { name: 'Grocery', description: 'Daily essentials', createdAt: Date.now() },
      { name: 'Services', description: 'Service-based items', createdAt: Date.now() },
    ]);
  }

  const brandCount = await db.brands.count();
  if (brandCount === 0) {
    await db.brands.bulkAdd([
      { name: 'Unbranded', description: 'No specific brand', createdAt: Date.now() },
      { name: 'Local', description: 'Local brand', createdAt: Date.now() },
    ]);
  }

  // Elevate auto-increment counters for all tables to 8 digits
  await ensureLargeAutoIncrementIds();
}
