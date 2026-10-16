import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Invoice, AppSettings } from '@/types';
import { formatDate, formatCurrency, numberToWords } from '@/lib/utils';

// Helper to format currency for PDF (removes the Rupee symbol if it causes font render issues or uses plain Rs. / INR symbol)
const formatPDFCurrency = (amount: number) => {
  return `INR ${amount.toFixed(2)}`;
};

interface PDFTemplateProps {
  invoice: Invoice;
  settings: AppSettings;
  qrCodeDataUrl?: string; // Passed from browser canvas for offline support
}

// ----------------------------------------------------
// PDF Styles Definitions
// ----------------------------------------------------
const styles = StyleSheet.create({
  // General Page
  pageA4: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#ffffff',
  },

  // Headings & Header Variations
  headerAmazon: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLtim: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerUnilever: {
    borderWidth: 1,
    borderColor: '#0f172a',
    flexDirection: 'row',
    marginBottom: 12,
  },
  headerItc: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerBigBazaar: {
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'dashed',
    paddingBottom: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  headerPremium: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  // Titles
  titleLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  titleLtim: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
 
  // Grids
  grid2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 15,
  },
  grid3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
 
  // Compartments & Cards
  card: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardBlue: {
    flex: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#1e293b',
    paddingLeft: 10,
    paddingVertical: 2,
  },
  cardSlate: {
    flex: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#64748b',
    paddingLeft: 10,
    paddingVertical: 2,
  },
  boxBordered: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0f172a',
    padding: 8,
  },
 
  // Product Table
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    padding: 5,
    fontWeight: 'bold',
  },
  tableHeaderBlue: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    color: '#ffffff',
    padding: 6,
    fontWeight: 'bold',
  },
  tableHeaderDark: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    color: '#ffffff',
    padding: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 5,
  },
  tableRowStriped: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 5,
  },

  // Column Widths
  colNum: { width: '5%', textAlign: 'center' },
  colDesc: { width: '40%' },
  colHsn: { width: '10%', textAlign: 'center' },
  colRate: { width: '12%', textAlign: 'right' },
  colQty: { width: '8%', textAlign: 'center' },
  colDisc: { width: '10%', textAlign: 'right' },
  colGst: { width: '8%', textAlign: 'center' },
  colTotal: { width: '12%', textAlign: 'right' },

  // Totals Section
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 20,
  },
  summaryCard: {
    width: '45%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },

  // Footer Section
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 10,
    marginTop: 'auto',
  },
  logo: {
    height: 40,
    width: 100,
    objectFit: 'contain',
  },
  signature: {
    height: 25,
    width: 100,
    objectFit: 'contain',
    marginTop: 3,
  },
  qrCode: {
    height: 48,
    width: 48,
  },
});

// Helper to render logo dynamically in PDFs
const renderPDFLogo = (settings: AppSettings, customStyle = {}) => {
  if (settings.showLogo === false || !settings.companyLogo) return null;
  
  let alignSelf: 'flex-start' | 'center' | 'flex-end' = 'flex-start';
  if (settings.logoAlign === 'center') alignSelf = 'center';
  if (settings.logoAlign === 'right') alignSelf = 'flex-end';
  
  return (
    <Image 
      src={settings.companyLogo} 
      style={{
        width: settings.logoWidth || 120,
        height: 'auto',
        alignSelf,
        objectFit: 'contain',
        marginBottom: 5,
        ...customStyle,
      }} 
    />
  );
};

// Helper to render signature dynamically in PDFs
const renderPDFSignature = (settings: AppSettings, customStyle = {}) => {
  if (settings.showSignature === false || !settings.companySignature) return null;
  return (
    <Image 
      src={settings.companySignature} 
      style={{
        width: settings.sigWidth || 120,
        height: 'auto',
        alignSelf: 'center',
        objectFit: 'contain',
        marginTop: 3,
        ...customStyle,
      }} 
    />
  );
};

// Helper to build UPI link with NPCI ₹1,00,000 regulatory ceiling and Split amount parsing
const getPDFUpiUrl = (invoice: Invoice, settings: AppSettings) => {
  if (!settings.upiId) return '';
  let upiAmount = invoice.totalAmount;
  const match = invoice.paymentMode?.match(/UPI\s*\(₹?([0-9.]+)\)/i);
  if (match && match[1]) {
    upiAmount = parseFloat(match[1]) || invoice.totalAmount;
  }
  if (upiAmount > 100000) {
    upiAmount = 100000;
  }
  return `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.companyName)}&am=${upiAmount}&cu=INR`;
};

// Helper to render CANCELLED banner in PDFs
const renderPDFCancelledBanner = (invoice: Invoice) => {
  if (invoice.status !== 'cancelled') return null;
  return (
    <View style={{
      backgroundColor: '#fff1f2',
      borderWidth: 1.5,
      borderColor: '#f43f5e',
      borderRadius: 4,
      padding: 6,
      marginBottom: 10,
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#e11d48', letterSpacing: 2 }}>
        *** VOID / CANCELLED INVOICE ***
      </Text>
      {invoice.cancellationReason ? (
        <Text style={{ fontSize: 7, color: '#9f1239', marginTop: 2 }}>
          Cancellation Reason: {invoice.cancellationReason}
        </Text>
      ) : null}
    </View>
  );
};

// ----------------------------------------------------
// PDF Template 1: Amazon-Like
// ----------------------------------------------------
export function PDFTemplateAmazonLike({ invoice, settings, qrCodeDataUrl }: PDFTemplateProps) {
  const isInterState = (settings.companyState || '').toLowerCase().trim() !== (invoice.customerState || '').toLowerCase().trim();

  return (
    <Document>
      <Page size="A4" style={styles.pageA4}>
        {renderPDFCancelledBanner(invoice)}
        <View style={styles.headerAmazon}>
          <View>
            <Text style={styles.titleLarge}>
              {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
            </Text>
            <View style={{ marginTop: 8, fontSize: 8, color: '#475569' }}>
              <Text>Invoice No: {invoice.invoiceNumber}</Text>
              <Text>Date: {formatDate(invoice.date)}</Text>
              {invoice.dueDate && <Text>Due Date: {formatDate(invoice.dueDate)}</Text>}
              <Text>Place of Supply: {invoice.customerState}</Text>
              <Text>Payment Mode: {invoice.paymentMode}</Text>
            </View>
          </View>
          <View style={{ alignItems: settings.logoAlign === 'center' ? 'center' : (settings.logoAlign === 'left' ? 'flex-start' : 'flex-end'), flex: 1 }}>
            {renderPDFLogo(settings)}
            {!settings.companyLogo && (
              <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{settings.companyName}</Text>
            )}
            <Text style={{ fontSize: 8, color: '#64748b', textAlign: settings.logoAlign === 'center' ? 'center' : (settings.logoAlign === 'left' ? 'left' : 'right'), marginTop: 4, maxWidth: 200 }}>
              {settings.companyName}{'\n'}
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}{'\n'}
              Ph: {settings.companyPhone} | GSTIN: {settings.companyGstin || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#64748b', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 2, marginBottom: 4 }}>
              BILLING DETAILS
            </Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text>{invoice.customerAddress}</Text>
            <Text style={{ marginTop: 4 }}>GSTIN: {invoice.customerGstin || 'N/A'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#64748b', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 2, marginBottom: 4 }}>
              SHIPPING DETAILS
            </Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text>{invoice.customerAddress}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>Item Description</Text>
            <Text style={styles.colHsn}>HSN</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colDisc}>Disc</Text>
            <Text style={styles.colGst}>GST</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {invoice.items && invoice.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={{ fontWeight: 'bold' }}>{item.description}</Text>
                {(item.modelNumber || item.imeiOrSerialNo) ? (
                  <Text style={{ fontSize: 6.5, color: '#475569', marginTop: 1.5 }}>
                    {item.modelNumber ? `Model: ${item.modelNumber} ` : ''}
                    {item.imeiOrSerialNo ? `IMEI/SN: ${item.imeiOrSerialNo} ` : ''}
                    {'(Sold by us)'}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.colHsn}>{item.hsnCode || '-'}</Text>
              <Text style={styles.colRate}>{formatPDFCurrency(item.rate)}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colDisc}>{item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatPDFCurrency(item.discount)) : '-'}</Text>
              <Text style={styles.colGst}>{item.gstRate}%</Text>
              <Text style={styles.colTotal}>{formatPDFCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>Amount in Words:</Text>
            <Text style={{ fontStyle: 'italic', color: '#475569', marginTop: 2 }}>{numberToWords(invoice.totalAmount)}</Text>
            {invoice.notes && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Notes:</Text>
                <Text style={{ color: '#64748b' }}>{invoice.notes}</Text>
              </View>
            )}
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}><Text>Subtotal:</Text><Text>{formatPDFCurrency(invoice.subtotal)}</Text></View>
            {invoice.discount > 0 && <View style={styles.summaryRow}><Text>Discount:</Text><Text>-{formatPDFCurrency(invoice.discount)}</Text></View>}
            <View style={styles.summaryRow}><Text>Taxable:</Text><Text>{formatPDFCurrency(invoice.taxableAmount)}</Text></View>
            {!isInterState ? (
              <>
                <View style={styles.summaryRow}><Text>CGST Total:</Text><Text>{formatPDFCurrency(invoice.cgst)}</Text></View>
                <View style={styles.summaryRow}><Text>SGST Total:</Text><Text>{formatPDFCurrency(invoice.sgst)}</Text></View>
              </>
            ) : (
              <View style={styles.summaryRow}><Text>IGST Total:</Text><Text>{formatPDFCurrency(invoice.igst)}</Text></View>
            )}
            {invoice.roundOff !== 0 && <View style={styles.summaryRow}><Text>Round Off:</Text><Text>{formatPDFCurrency(invoice.roundOff)}</Text></View>}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#cbd5e1', paddingTop: 4, fontWeight: 'bold', fontSize: 10 }]}>
              <Text>Net Amount:</Text>
              <Text style={{ color: '#b12704' }}>{formatPDFCurrency(invoice.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
              <View style={{ marginLeft: 8, fontSize: 8, color: '#64748b' }}>
                <Text style={{ fontWeight: 'bold' }}>UPI & Bank Transfers</Text>
                <Text>ID: {settings.upiId || 'N/A'}</Text>
                <Text>A/C: {settings.bankAccountNumber}</Text>
                <Text>IFSC: {settings.bankIfsc}</Text>
              </View>
            </View>
            <View style={{ textAlign: 'right', fontSize: 8, alignItems: 'flex-end' }}>
              <Text>Authorized Signatory</Text>
              {renderPDFSignature(settings)}
            </View>
          </View>
          <Text style={{ fontSize: 6.5, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------
// PDF Template 2: LTIMindtree-Like (Enterprise Blue)
// ----------------------------------------------------
export function PDFTemplateLTIMindtreeLike({ invoice, settings, qrCodeDataUrl }: PDFTemplateProps) {
  const isInterState = (settings.companyState || '').toLowerCase().trim() !== (invoice.customerState || '').toLowerCase().trim();

  return (
    <Document>
      <Page size="A4" style={styles.pageA4}>
        {renderPDFCancelledBanner(invoice)}
        <View style={styles.headerLtim}>
          <View style={{ alignItems: settings.logoAlign === 'center' ? 'center' : (settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'), flex: 1 }}>
            {renderPDFLogo(settings)}
            {!settings.companyLogo && (
              <View style={{ height: 20, width: 20, backgroundColor: '#0f172a' }} />
            )}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0f172a', marginTop: 4 }}>{settings.companyName}</Text>
            <Text style={{ fontSize: 8, color: '#64748b', maxWidth: 220 }}>
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </Text>
            <Text style={{ fontSize: 8, color: '#475569', marginTop: 2 }}>GSTIN: {settings.companyGstin}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.titleLtim}>
              {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
            </Text>
            <View style={{ marginTop: 8, fontSize: 8, color: '#475569', textAlign: 'right' }}>
              <Text>Invoice No: {invoice.invoiceNumber}</Text>
              <Text>Date: {formatDate(invoice.date)}</Text>
              {invoice.dueDate && <Text>Due: {formatDate(invoice.dueDate)}</Text>}
              <Text style={{ color: '#475569', fontWeight: 'bold' }}>Payment: {invoice.paymentMode}</Text>
            </View>
          </View>
        </View>
 
        <View style={styles.grid2}>
          <View style={styles.cardBlue}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#0f172a', marginBottom: 2 }}>BILLED TO</Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text style={{ color: '#475569' }}>{invoice.customerAddress}</Text>
            <Text style={{ marginTop: 2 }}>GSTIN: {invoice.customerGstin || 'N/A'}</Text>
          </View>
          <View style={styles.cardSlate}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#64748b', marginBottom: 2 }}>SHIPPING DETAILS</Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text style={{ color: '#475569' }}>{invoice.customerAddress}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderBlue}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>Item Description</Text>
            <Text style={styles.colHsn}>HSN</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colDisc}>Disc</Text>
            <Text style={styles.colGst}>GST</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {invoice.items && invoice.items.map((item, idx) => (
            <View key={idx} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={{ fontWeight: 'normal' }}>{item.description}</Text>
                {(item.modelNumber || item.imeiOrSerialNo) ? (
                  <Text style={{ fontSize: 6.5, color: '#475569', marginTop: 1.5 }}>
                    {item.modelNumber ? `Model: ${item.modelNumber} ` : ''}
                    {item.imeiOrSerialNo ? `IMEI/SN: ${item.imeiOrSerialNo} ` : ''}
                    {'(Sold by us)'}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.colHsn}>{item.hsnCode || '-'}</Text>
              <Text style={styles.colRate}>{formatPDFCurrency(item.rate)}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colDisc}>{item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatPDFCurrency(item.discount)) : '-'}</Text>
              <Text style={styles.colGst}>{item.gstRate}%</Text>
              <Text style={styles.colTotal}>{formatPDFCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: '#f1f5f9', padding: 8, borderRadius: 4, fontSize: 8 }}>
              <Text style={{ fontWeight: 'bold', color: '#1e293b', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 4 }}>TAX COMPONENT SUMMARY</Text>
              {!isInterState ? (
                <>
                  <Text>Central GST (CGST): {formatPDFCurrency(invoice.cgst)} (9.0%)</Text>
                  <Text>State GST (SGST): {formatPDFCurrency(invoice.sgst)} (9.0%)</Text>
                </>
              ) : (
                <Text>Integrated GST (IGST): {formatPDFCurrency(invoice.igst)}</Text>
              )}
              <Text style={{ marginTop: 2, fontWeight: 'bold' }}>Total Tax Amt: {formatPDFCurrency(invoice.totalTax)}</Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
            <View style={styles.summaryRow}><Text>Subtotal:</Text><Text>{formatPDFCurrency(invoice.subtotal)}</Text></View>
            {invoice.discount > 0 && <View style={styles.summaryRow}><Text>Discount:</Text><Text>-{formatPDFCurrency(invoice.discount)}</Text></View>}
            <View style={styles.summaryRow}><Text>Tax Base:</Text><Text>{formatPDFCurrency(invoice.taxableAmount)}</Text></View>
            <View style={styles.summaryRow}><Text>GST Tax:</Text><Text>{formatPDFCurrency(invoice.totalTax)}</Text></View>
            {invoice.roundOff !== 0 && <View style={styles.summaryRow}><Text>Round Off:</Text><Text>{formatPDFCurrency(invoice.roundOff)}</Text></View>}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#cbd5e1', paddingTop: 4, fontWeight: 'bold', fontSize: 10, color: '#0f172a' }]}>
              <Text>Net Amount:</Text>
              <Text>{formatPDFCurrency(invoice.totalAmount)}</Text>
            </View>
          </View>
        </View>
 
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
              <View style={{ marginLeft: 8, fontSize: 8 }}>
                <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>UPI Payments QR</Text>
                <Text>ID: {settings.upiId || 'N/A'}</Text>
                <Text>A/C: {settings.bankAccountNumber}</Text>
                <Text>Bank: {settings.bankName}</Text>
              </View>
            </View>
            <View style={{ textAlign: 'right', fontSize: 8, alignItems: 'flex-end' }}>
              <Text>For {settings.companyName}</Text>
              {renderPDFSignature(settings)}
              <Text style={{ marginTop: 2, color: '#64748b' }}>Authorized Official</Text>
            </View>
          </View>
          <Text style={{ fontSize: 6.5, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </Text>
        </View>
      </Page>
    </Document>
    );
}

// ----------------------------------------------------
// PDF Template 3: Unilever-Like (Boxed Grid)
// ----------------------------------------------------
export function PDFTemplateUnileverLike({ invoice, settings, qrCodeDataUrl }: PDFTemplateProps) {
  const isInterState = (settings.companyState || '').toLowerCase().trim() !== (invoice.customerState || '').toLowerCase().trim();
  const upiString = getPDFUpiUrl(invoice, settings);

  return (
    <Document>
      <Page size="A4" style={[styles.pageA4, { padding: 20 }]}>
        {renderPDFCancelledBanner(invoice)}
        <View style={styles.headerUnilever}>
          <View style={{ flex: 2, padding: 8, alignItems: settings.logoAlign === 'center' ? 'center' : (settings.logoAlign === 'right' ? 'flex-end' : 'flex-start') }}>
            {renderPDFLogo(settings)}
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{settings.companyName}</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </Text>
            <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 2 }}>GSTIN: {settings.companyGstin}</Text>
          </View>
          <View style={{ flex: 1, padding: 8, backgroundColor: '#f8fafc', alignItems: 'flex-end', borderLeftWidth: 1, borderColor: '#0f172a' }}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', borderWidth: 1, borderStyle: 'solid', borderColor: '#000', padding: 2 }}>ORIGINAL FOR RECIPIENT</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 8 }}>
              {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
            </Text>
            <Text style={{ fontSize: 7, marginTop: 4 }}>Bill No: {invoice.invoiceNumber}</Text>
            <Text style={{ fontSize: 7 }}>Date: {formatDate(invoice.date)}</Text>
            <Text style={{ fontSize: 7 }}>Payment: {invoice.paymentMode}</Text>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderColor: '#0f172a', flexDirection: 'row', marginBottom: 10 }}>
          <View style={{ flex: 1, padding: 6, borderRightWidth: 1, borderColor: '#0f172a' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 7, borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 4 }}>DETAILS OF RECEIVER (BILLED TO)</Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text>{invoice.customerAddress}</Text>
            <Text style={{ marginTop: 2 }}>GSTIN: {invoice.customerGstin}</Text>
            <Text>State: {invoice.customerState}</Text>
          </View>
          <View style={{ flex: 1, padding: 6 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 7, borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 2, marginBottom: 4 }}>DETAILS OF CONSIGNEE (SHIPPED TO)</Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text>{invoice.customerAddress}</Text>
            {invoice.customerPhone && <Text style={{ marginTop: 2 }}>Phone: {invoice.customerPhone}</Text>}
          </View>
        </View>

        <View style={{ borderWidth: 1, borderColor: '#0f172a', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderColor: '#0f172a', padding: 4, fontWeight: 'bold', fontSize: 7, textAlign: 'center' }}>
            <Text style={{ width: '4%' }}>#</Text>
            <Text style={{ width: '38%', textAlign: 'left' }}>Description of Goods</Text>
            <Text style={{ width: '10%' }}>HSN</Text>
            <Text style={{ width: '8%' }}>Qty</Text>
            <Text style={{ width: '10%', textAlign: 'right' }}>Rate</Text>
            <Text style={{ width: '10%', textAlign: 'right' }}>Disc</Text>
            <Text style={{ width: '10%', textAlign: 'right' }}>Taxable</Text>
            <Text style={{ width: '10%', textAlign: 'right' }}>Total</Text>
          </View>
          {invoice.items && invoice.items.map((item, idx) => (
            <View key={idx} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#0f172a', padding: 4, fontSize: 7, textAlign: 'center' }}>
              <Text style={{ width: '4%' }}>{idx + 1}</Text>
              <View style={{ width: '38%', textAlign: 'left' }}>
                <Text style={{ fontWeight: 'bold' }}>{item.description}</Text>
                {(item.modelNumber || item.imeiOrSerialNo) ? (
                  <Text style={{ fontSize: 5.5, color: '#334155', marginTop: 1 }}>
                    {item.modelNumber ? `Model: ${item.modelNumber} ` : ''}
                    {item.imeiOrSerialNo ? `IMEI/SN: ${item.imeiOrSerialNo} ` : ''}
                    {'(Sold by us)'}
                  </Text>
                ) : null}
              </View>
              <Text style={{ width: '10%' }}>{item.hsnCode || '-'}</Text>
              <Text style={{ width: '8%' }}>{item.quantity}</Text>
              <Text style={{ width: '10%', textAlign: 'right' }}>{formatPDFCurrency(item.rate)}</Text>
              <Text style={{ width: '10%', textAlign: 'right' }}>{item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatPDFCurrency(item.discount)) : '-'}</Text>
              <Text style={{ width: '10%', textAlign: 'right' }}>{formatPDFCurrency(item.taxableAmount)}</Text>
              <Text style={{ width: '10%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Dense HSN details breakup table */}
        <View style={{ borderWidth: 1, borderColor: '#0f172a', padding: 4, marginBottom: 10 }}>
          <Text style={{ fontSize: 7, fontWeight: 'bold', marginBottom: 2 }}>HSN / SAC WISE TAX SUMMARY</Text>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#0f172a', paddingBottom: 2, fontSize: 6, fontWeight: 'bold', textAlign: 'center' }}>
            <Text style={{ flex: 1.5 }}>HSN</Text>
            <Text style={{ flex: 2 }}>Taxable Val</Text>
            <Text style={{ flex: 2 }}>CGST (Rate/Amt)</Text>
            <Text style={{ flex: 2 }}>SGST (Rate/Amt)</Text>
            <Text style={{ flex: 2 }}>IGST (Rate/Amt)</Text>
            <Text style={{ flex: 2, textAlign: 'right' }}>Total Tax</Text>
          </View>
          {invoice.items && Array.from(new Set(invoice.items.map(item => item.hsnCode || 'N/A'))).map((hsn, idx) => {
            const filtered = invoice.items.filter(item => (item.hsnCode || 'N/A') === hsn);
            const taxableVal = filtered.reduce((sum, item) => sum + item.taxableAmount, 0);
            const cgstVal = filtered.reduce((sum, item) => sum + item.cgst, 0);
            const sgstVal = filtered.reduce((sum, item) => sum + item.sgst, 0);
            const igstVal = filtered.reduce((sum, item) => sum + item.igst, 0);
            const totalTax = cgstVal + sgstVal + igstVal;
            const gstRate = filtered[0]?.gstRate || 0;

            return (
              <View key={idx} style={{ flexDirection: 'row', paddingTop: 2, fontSize: 6, textAlign: 'center' }}>
                <Text style={{ flex: 1.5 }}>{hsn}</Text>
                <Text style={{ flex: 2 }}>{formatPDFCurrency(taxableVal)}</Text>
                <Text style={{ flex: 2 }}>{isInterState ? '0%' : `${gstRate/2}%`} / {formatPDFCurrency(cgstVal)}</Text>
                <Text style={{ flex: 2 }}>{isInterState ? '0%' : `${gstRate/2}%`} / {formatPDFCurrency(sgstVal)}</Text>
                <Text style={{ flex: 2 }}>{isInterState ? `${gstRate}%` : '0%'} / {formatPDFCurrency(igstVal)}</Text>
                <Text style={{ flex: 2, textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(totalTax)}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ borderWidth: 1, borderColor: '#0f172a', flexDirection: 'row', marginBottom: 10 }}>
          <View style={{ flex: 1.2, padding: 6, borderRightWidth: 1, borderColor: '#0f172a' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 7 }}>Amount in Words:</Text>
            <Text style={{ fontStyle: 'italic', fontSize: 7, marginTop: 2 }}>{numberToWords(invoice.totalAmount)}</Text>
            {invoice.notes && <Text style={{ color: '#475569', fontSize: 7, marginTop: 4 }}>Note: {invoice.notes}</Text>}
          </View>
          <View style={{ flex: 0.8, padding: 6, backgroundColor: '#f8fafc' }}>
            <View style={styles.summaryRow}><Text>Subtotal:</Text><Text>{formatPDFCurrency(invoice.subtotal)}</Text></View>
            <View style={styles.summaryRow}><Text>GST Tax:</Text><Text>{formatPDFCurrency(invoice.totalTax)}</Text></View>
            {invoice.roundOff !== 0 && <View style={styles.summaryRow}><Text>Round Off:</Text><Text>{formatPDFCurrency(invoice.roundOff)}</Text></View>}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#0f172a', paddingTop: 4, fontWeight: 'bold' }]}>
              <Text>Net Amt:</Text>
              <Text>{formatPDFCurrency(invoice.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderStyle: 'solid', borderColor: '#0f172a', padding: 6, fontSize: 7 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={{ fontWeight: 'bold' }}>BANK INFORMATION</Text>
              <Text>Bank: {settings.bankName} | A/C Holder: {settings.bankAccountName || settings.companyName}</Text>
              <Text>A/C No: {settings.bankAccountNumber} | IFSC: {settings.bankIfsc}</Text>
            </View>
            {upiString && qrCodeDataUrl && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image src={qrCodeDataUrl} style={{ height: 35, width: 35 }} />
                <Text style={{ fontSize: 6, color: '#64748b', marginLeft: 4 }}>Scan to pay UPI</Text>
              </View>
            )}
            <View style={{ textAlign: 'right', minWidth: 100, alignItems: 'flex-end' }}>
              <Text>For {settings.companyName}</Text>
              {renderPDFSignature(settings)}
              <Text style={{ marginTop: 2, color: '#64748b', fontSize: 6 }}>Authorized Signatory</Text>
            </View>
          </View>
          <Text style={{ fontSize: 6.5, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------
// PDF Template 4: ITC-Like (Logistics Grid)
// ----------------------------------------------------
export function PDFTemplateITCLike({ invoice, settings, qrCodeDataUrl }: PDFTemplateProps) {
  const isInterState = (settings.companyState || '').toLowerCase().trim() !== (invoice.customerState || '').toLowerCase().trim();

  return (
    <Document>
      <Page size="A4" style={styles.pageA4}>
        {renderPDFCancelledBanner(invoice)}
        <View style={styles.headerItc}>
          <View style={{ alignItems: settings.logoAlign === 'center' ? 'center' : (settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'), flex: 1 }}>
            {renderPDFLogo(settings)}
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#000000' }}>{settings.companyName}</Text>
            <Text style={{ fontSize: 8, color: '#475569', maxWidth: 220 }}>
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </Text>
            <Text style={{ fontSize: 8, fontWeight: 'bold', marginTop: 2 }}>GSTIN: {settings.companyGstin}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>TAX INVOICE</Text>
              <Text style={{ fontSize: 8, marginTop: 4 }}>Inv No: {invoice.invoiceNumber}</Text>
              <Text style={{ fontSize: 8 }}>Date: {formatDate(invoice.date)}</Text>
              <Text style={{ fontSize: 8 }}>Supply State: {invoice.customerState}</Text>
              <Text style={{ fontSize: 8 }}>Payment Mode: {invoice.paymentMode}</Text>
            </View>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderColor: '#cbd5e1', flexDirection: 'row', backgroundColor: '#f8fafc', marginBottom: 12, fontSize: 8 }}>
          <View style={{ flex: 1, padding: 6, borderRightWidth: 1, borderColor: '#cbd5e1' }}><Text style={{ color: '#64748b' }}>Vehicle Number</Text><Text style={{ fontWeight: 'bold' }}>DL-3C-YA-1204</Text></View>
          <View style={{ flex: 1, padding: 6, borderRightWidth: 1, borderColor: '#cbd5e1' }}><Text style={{ color: '#64748b' }}>E-Way Bill No</Text><Text style={{ fontWeight: 'bold' }}>381029481023</Text></View>
          <View style={{ flex: 1, padding: 6, borderRightWidth: 1, borderColor: '#cbd5e1' }}><Text style={{ color: '#64748b' }}>Date of Supply</Text><Text>{formatDate(invoice.date)}</Text></View>
          <View style={{ flex: 1, padding: 6 }}><Text style={{ color: '#64748b' }}>Reverse Charge</Text><Text>{invoice.isReverseCharge ? 'Yes' : 'No'}</Text></View>
        </View>

        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#475569', marginBottom: 2 }}>BUYER (BILLED TO)</Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text>{invoice.customerAddress}</Text>
            <Text style={{ marginTop: 2 }}>GSTIN: {invoice.customerGstin}</Text>
          </View>
          <View style={styles.card}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#475569', marginBottom: 2 }}>CONSIGNEE (SHIPPED TO)</Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text>{invoice.customerAddress}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderDark}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>Item Description</Text>
            <Text style={styles.colHsn}>HSN</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colDisc}>Taxable</Text>
            <Text style={styles.colGst}>GST</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {invoice.items && invoice.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={{ fontWeight: 'bold' }}>{item.description}</Text>
                {(item.modelNumber || item.imeiOrSerialNo) ? (
                  <Text style={{ fontSize: 6.5, color: '#475569', marginTop: 1.5 }}>
                    {item.modelNumber ? `Model: ${item.modelNumber} ` : ''}
                    {item.imeiOrSerialNo ? `IMEI/SN: ${item.imeiOrSerialNo} ` : ''}
                    {'(Sold by us)'}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.colHsn}>{item.hsnCode || '-'}</Text>
              <Text style={styles.colRate}>{formatPDFCurrency(item.rate)}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colDisc}>{formatPDFCurrency(item.taxableAmount)}</Text>
              <Text style={styles.colGst}>{item.gstRate}%</Text>
              <Text style={styles.colTotal}>{formatPDFCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>Amount in Words:</Text>
            <Text style={{ fontStyle: 'italic', marginTop: 2 }}>{numberToWords(invoice.totalAmount)}</Text>
            {invoice.notes && <Text style={{ color: '#64748b', marginTop: 6 }}>Remarks: {invoice.notes}</Text>}
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}><Text>Subtotal:</Text><Text>{formatPDFCurrency(invoice.subtotal)}</Text></View>
            <View style={styles.summaryRow}><Text>Taxable:</Text><Text>{formatPDFCurrency(invoice.taxableAmount)}</Text></View>
            <View style={styles.summaryRow}><Text>GST Total:</Text><Text>{formatPDFCurrency(invoice.totalTax)}</Text></View>
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#cbd5e1', paddingTop: 4, fontWeight: 'bold' }]}>
              <Text>Net Amt:</Text>
              <Text>{formatPDFCurrency(invoice.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={{ fontWeight: 'bold' }}>Bank Details</Text>
              <Text>Bank: {settings.bankName} | IFSC: {settings.bankIfsc}</Text>
              <Text>A/C Number: {settings.bankAccountNumber}</Text>
            </View>
            <View style={{ textAlign: 'right', minWidth: 120, alignItems: 'flex-end' }}>
              <Text>For {settings.companyName}</Text>
              {renderPDFSignature(settings)}
              <Text style={{ marginTop: 2, color: '#64748b', fontSize: 6 }}>Authorized Signatory</Text>
            </View>
          </View>
          <Text style={{ fontSize: 6.5, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------
// PDF Template 5: Big Bazaar-Like (Retail Grocery)
// ----------------------------------------------------
export function PDFTemplateBigBazaarLike({ invoice, settings, qrCodeDataUrl }: PDFTemplateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.pageA4}>
        {renderPDFCancelledBanner(invoice)}
        <View style={[styles.headerBigBazaar, { alignItems: settings.logoAlign === 'center' ? 'center' : (settings.logoAlign === 'right' ? 'flex-end' : 'flex-start') }]}>
          {renderPDFLogo(settings)}
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>{settings.companyName}</Text>
          <Text style={{ fontSize: 8, color: '#475569' }}>
            {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
          </Text>
          <Text style={{ fontSize: 8, fontWeight: 'bold' }}>GSTIN: {settings.companyGstin}</Text>
        </View>

        <View style={[styles.grid2, { borderBottomWidth: 1, borderBottomColor: '#cbd5e1', borderBottomStyle: 'dashed', paddingBottom: 6 }]}>
          <View>
            <Text style={{ color: '#64748b', fontSize: 7 }}>CUSTOMER DETAILS</Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text>{invoice.customerAddress}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: 'bold' }}>Bill No: {invoice.invoiceNumber}</Text>
            <Text>Date: {formatDate(invoice.date)}</Text>
            <Text>Payment: {invoice.paymentMode}</Text>
          </View>
        </View>

        <View style={[styles.table, { borderWidth: 0, borderBottomWidth: 1, borderColor: '#000000', marginBottom: 10 }]}>
          <View style={[styles.tableHeader, { backgroundColor: '#ffffff', borderBottomWidth: 2, borderBottomColor: '#000000', paddingVertical: 4 }]}>
            <Text style={{ width: '5%' }}>#</Text>
            <Text style={{ width: '45%' }}>Item Name</Text>
            <Text style={{ width: '10%' }}>HSN</Text>
            <Text style={{ width: '12%', textAlign: 'right' }}>Price</Text>
            <Text style={{ width: '8%', textAlign: 'center' }}>Qty</Text>
            <Text style={{ width: '10%', textAlign: 'right' }}>Disc</Text>
            <Text style={{ width: '10%', textAlign: 'right' }}>Total</Text>
          </View>
          {invoice.items && invoice.items.map((item, idx) => (
            <View key={idx} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 4, fontSize: 8 }}>
              <Text style={{ width: '5%', textAlign: 'center' }}>{idx + 1}</Text>
              <View style={{ width: '45%' }}>
                <Text style={{ fontWeight: 'bold' }}>{item.description}</Text>
                {(item.modelNumber || item.imeiOrSerialNo) ? (
                  <Text style={{ fontSize: 6, color: '#475569', marginTop: 1 }}>
                    {item.modelNumber ? `Model: ${item.modelNumber} ` : ''}
                    {item.imeiOrSerialNo ? `IMEI/SN: ${item.imeiOrSerialNo} ` : ''}
                    {'(Sold by us)'}
                  </Text>
                ) : null}
              </View>
              <Text style={{ width: '10%', textAlign: 'center' }}>{item.hsnCode || '-'}</Text>
              <Text style={{ width: '12%', textAlign: 'right' }}>{formatPDFCurrency(item.rate)}</Text>
              <Text style={{ width: '8%', textAlign: 'center' }}>{item.quantity}</Text>
              <Text style={{ width: '10%', textAlign: 'right' }}>{item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatPDFCurrency(item.discount)) : '-'}</Text>
              <Text style={{ width: '10%', textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>Amount in Words:</Text>
            <Text style={{ fontStyle: 'italic', marginTop: 2 }}>{numberToWords(invoice.totalAmount)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderWidth: 0, backgroundColor: '#f8fafc', padding: 8 }]}>
            <View style={styles.summaryRow}><Text>Gross Total:</Text><Text>{formatPDFCurrency(invoice.subtotal)}</Text></View>
            {invoice.discount > 0 && <View style={styles.summaryRow}><Text>Promo Disc:</Text><Text>-{formatPDFCurrency(invoice.discount)}</Text></View>}
            <View style={styles.summaryRow}><Text>Tax Base:</Text><Text>{formatPDFCurrency(invoice.taxableAmount)}</Text></View>
            <View style={styles.summaryRow}><Text>VAT/GST Total:</Text><Text>{formatPDFCurrency(invoice.totalTax)}</Text></View>
            {invoice.roundOff !== 0 && <View style={styles.summaryRow}><Text>Round Off:</Text><Text>{formatPDFCurrency(invoice.roundOff)}</Text></View>}
            <View style={[styles.summaryRow, { borderTopWidth: 2, borderTopColor: '#000', borderTopStyle: 'dashed', paddingTop: 6, fontWeight: 'bold', fontSize: 11 }]}>
              <Text>NET TOTAL:</Text>
              <Text>{formatPDFCurrency(invoice.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.footer, { borderTopWidth: 2, borderTopColor: '#cbd5e1', borderTopStyle: 'dashed' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
              <View style={{ marginLeft: 8, fontSize: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Scan to Pay</Text>
                <Text>UPI: {settings.upiId || 'N/A'}</Text>
              </View>
            </View>
            <View style={{ textAlign: 'right', minWidth: 120, alignItems: 'flex-end' }}>
              <Text>Cashier Seal</Text>
              {renderPDFSignature(settings)}
            </View>
          </View>
          <Text style={{ fontSize: 6.5, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------
// PDF Template 6: Premium Default
// ----------------------------------------------------
export function PDFTemplatePremiumDefault({ invoice, settings, qrCodeDataUrl }: PDFTemplateProps) {
  const isInterState = (settings.companyState || '').toLowerCase().trim() !== (invoice.customerState || '').toLowerCase().trim();

  return (
    <Document>
      <Page size="A4" style={styles.pageA4}>
        {renderPDFCancelledBanner(invoice)}
        <View style={styles.headerPremium}>
          <View style={{ alignItems: settings.logoAlign === 'center' ? 'center' : (settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'), flex: 1 }}>
            {renderPDFLogo(settings)}
            {!settings.companyLogo && (
              <View style={{ height: 20, width: 20, backgroundColor: '#0f172a', borderRadius: 4 }} />
            )}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#111827', marginTop: 4 }}>{settings.companyName}</Text>
            <Text style={{ fontSize: 8, color: '#4b5563', maxWidth: 220, marginTop: 1 }}>
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </Text>
            <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>GSTIN: {settings.companyGstin}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.titleLarge, { color: '#0f172a' }]}>
              {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
            </Text>
            <View style={{ marginTop: 8, fontSize: 8, color: '#4b5563', textAlign: 'right' }}>
              <Text>Invoice No: {invoice.invoiceNumber}</Text>
              <Text>Date: {formatDate(invoice.date)}</Text>
              {invoice.dueDate && <Text>Due Date: {formatDate(invoice.dueDate)}</Text>}
              <Text style={{ fontWeight: 'bold', color: '#475569' }}>Payment Mode: {invoice.paymentMode}</Text>
              <Text style={{ fontWeight: 'bold', color: '#10b981', textTransform: 'uppercase', marginTop: 2 }}>{invoice.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid2}>
          <View style={styles.card}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 2, marginBottom: 4 }}>BILLED TO</Text>
            <Text style={{ fontWeight: 'bold' }}>{invoice.customerName}</Text>
            <Text style={{ color: '#4b5563', marginTop: 2 }}>{invoice.customerAddress}</Text>
            <Text style={{ marginTop: 4 }}>GSTIN: {invoice.customerGstin}</Text>
          </View>
          <View style={styles.card}>
            <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#475569', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 2, marginBottom: 4 }}>ORIGIN INFO</Text>
            <Text style={{ fontWeight: 'bold' }}>{settings.companyName}</Text>
            <Text style={{ color: '#4b5563', marginTop: 2 }}>Ph: {settings.companyPhone}</Text>
            <Text style={{ color: '#4b5563' }}>Mail: {settings.companyEmail}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: '#111827', color: '#ffffff' }]}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>Item Description</Text>
            <Text style={styles.colHsn}>HSN</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colDisc}>Disc</Text>
            <Text style={styles.colGst}>GST</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {invoice.items && invoice.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={{ fontWeight: 'bold', color: '#111827' }}>{item.description}</Text>
                {(item.modelNumber || item.imeiOrSerialNo) ? (
                  <Text style={{ fontSize: 6.5, color: '#475569', marginTop: 1.5 }}>
                    {item.modelNumber ? `Model: ${item.modelNumber} ` : ''}
                    {item.imeiOrSerialNo ? `IMEI/SN: ${item.imeiOrSerialNo} ` : ''}
                    {'(Sold by us)'}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.colHsn}>{item.hsnCode || '-'}</Text>
              <Text style={styles.colRate}>{formatPDFCurrency(item.rate)}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colDisc}>{item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatPDFCurrency(item.discount)) : '-'}</Text>
              <Text style={styles.colGst}>{item.gstRate}%</Text>
              <Text style={styles.colTotal}>{formatPDFCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderStyle: 'solid', borderColor: '#e2e8f0', borderRadius: 4, padding: 8, fontSize: 8, marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: 2 }}>GST ANALYSIS</Text>
              {!isInterState ? (
                <>
                  <Text>Central GST (CGST) 9.0%: {formatPDFCurrency(invoice.cgst)}</Text>
                  <Text>State GST (SGST) 9.0%: {formatPDFCurrency(invoice.sgst)}</Text>
                </>
              ) : (
                <Text>Integrated GST (IGST): {formatPDFCurrency(invoice.igst)}</Text>
              )}
              <Text style={{ marginTop: 2, fontWeight: 'bold' }}>GST Total: {formatPDFCurrency(invoice.totalTax)}</Text>
            </View>
            {invoice.notes && <Text style={{ fontSize: 8, color: '#4b5563' }}>Note: {invoice.notes}</Text>}
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}><Text>Subtotal:</Text><Text>{formatPDFCurrency(invoice.subtotal)}</Text></View>
            {invoice.discount > 0 && <View style={styles.summaryRow}><Text>Discount:</Text><Text>-{formatPDFCurrency(invoice.discount)}</Text></View>}
            <View style={styles.summaryRow}><Text>Tax Base:</Text><Text>{formatPDFCurrency(invoice.taxableAmount)}</Text></View>
            <View style={styles.summaryRow}><Text>GST Tax:</Text><Text>{formatPDFCurrency(invoice.totalTax)}</Text></View>
            {invoice.roundOff !== 0 && <View style={styles.summaryRow}><Text>Round Off:</Text><Text>{formatPDFCurrency(invoice.roundOff)}</Text></View>}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#cbd5e1', paddingTop: 4, fontWeight: 'bold', fontSize: 10, color: '#0f172a' }]}>
              <Text>Net Amount:</Text>
              <Text>{formatPDFCurrency(invoice.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
              <View style={{ marginLeft: 8, fontSize: 8 }}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Bank Transfer Details</Text>
                <Text>Holder: {settings.bankAccountName || settings.companyName}</Text>
                <Text>A/C: {settings.bankAccountNumber} | IFSC: {settings.bankIfsc}</Text>
                <Text>Bank: {settings.bankName}</Text>
              </View>
            </View>
            <View style={{ textAlign: 'right', minWidth: 120, alignItems: 'flex-end' }}>
              <Text>For {settings.companyName}</Text>
              {renderPDFSignature(settings)}
              <Text style={{ marginTop: 2, color: '#6b7280', fontSize: 6 }}>Authorized Official</Text>
            </View>
          </View>
          <Text style={{ fontSize: 6.5, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------
// PDF Template 7: Tata-Like Structured (Industrial Tax Invoice)
// ----------------------------------------------------
export function PDFTemplateTataStructured({ invoice, settings, qrCodeDataUrl }: PDFTemplateProps) {
  const isInterState = (settings.companyState || '').toLowerCase().trim() !== (invoice.customerState || '').toLowerCase().trim();

  return (
    <Document>
      <Page size="A4" style={[styles.pageA4, { padding: 20 }]}>
        {renderPDFCancelledBanner(invoice)}
        {/* Title Bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#0f172a', paddingBottom: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0f172a' }}>
            {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
          </Text>
          <Text style={{ fontSize: 8, color: '#475569', fontWeight: 'bold' }}>ORIGINAL FOR RECIPIENT</Text>
        </View>

        {/* Company & Meta Grid */}
        <View style={{ borderWidth: 1, borderColor: '#0f172a', flexDirection: 'row', marginBottom: 8 }}>
          <View style={{ flex: 1.4, padding: 8, borderRightWidth: 1, borderColor: '#0f172a' }}>
            {renderPDFLogo(settings)}
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0f172a' }}>{settings.companyName}</Text>
            <Text style={{ fontSize: 7, color: '#334155', marginTop: 2 }}>
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </Text>
            <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 2 }}>GSTIN: {settings.companyGstin || 'N/A'}</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>Ph: {settings.companyPhone} | {settings.companyEmail}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#0f172a', flex: 1 }}>
              <View style={{ flex: 1, padding: 4, borderRightWidth: 1, borderColor: '#0f172a' }}>
                <Text style={{ fontSize: 6, color: '#64748b' }}>Invoice No:</Text>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={{ flex: 1, padding: 4 }}>
                <Text style={{ fontSize: 6, color: '#64748b' }}>Date:</Text>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{formatDate(invoice.date)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <View style={{ flex: 1, padding: 4, borderRightWidth: 1, borderColor: '#0f172a' }}>
                <Text style={{ fontSize: 6, color: '#64748b' }}>Place of Supply:</Text>
                <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{invoice.customerState || 'State'}</Text>
              </View>
              <View style={{ flex: 1, padding: 4 }}>
                <Text style={{ fontSize: 6, color: '#64748b' }}>Due Date:</Text>
                <Text style={{ fontSize: 7 }}>{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer & Shipping Addresses */}
        <View style={{ borderWidth: 1, borderColor: '#0f172a', flexDirection: 'row', marginBottom: 8, fontSize: 7 }}>
          <View style={{ flex: 1, padding: 6, borderRightWidth: 1, borderColor: '#0f172a' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 6.5, color: '#475569' }}>BILLED TO (RECEIVER):</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 8, marginTop: 1 }}>{invoice.customerName}</Text>
            <Text style={{ color: '#334155' }}>{invoice.customerAddress}</Text>
            <Text style={{ fontWeight: 'bold', marginTop: 2 }}>GSTIN: {invoice.customerGstin || 'URP'}</Text>
            {invoice.customerPhone && <Text>Phone: {invoice.customerPhone}</Text>}
          </View>
          <View style={{ flex: 1, padding: 6, backgroundColor: '#f8fafc' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 6.5, color: '#475569' }}>SHIPPED TO (CONSIGNEE):</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 8, marginTop: 1 }}>{invoice.customerName}</Text>
            <Text style={{ color: '#334155' }}>{invoice.customerAddress}</Text>
            {invoice.customerPhone && <Text>Phone: {invoice.customerPhone}</Text>}
          </View>
        </View>

        {/* Product Table */}
        <View style={[styles.table, { borderColor: '#0f172a', marginBottom: 8 }]}>
          <View style={[styles.tableHeader, { backgroundColor: '#f1f5f9', borderBottomColor: '#0f172a' }]}>
            <Text style={{ flex: 0.5, textAlign: 'center' }}>#</Text>
            <Text style={{ flex: 3 }}>Item Description</Text>
            <Text style={{ flex: 1, textAlign: 'center' }}>HSN</Text>
            <Text style={{ flex: 1.2, textAlign: 'right' }}>Rate</Text>
            <Text style={{ flex: 1, textAlign: 'center' }}>Qty</Text>
            <Text style={{ flex: 1.2, textAlign: 'right' }}>Taxable</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>Tax %</Text>
            <Text style={{ flex: 1.4, textAlign: 'right' }}>Amount</Text>
          </View>
          {invoice.items && invoice.items.map((item, idx) => (
            <View key={idx} style={[styles.tableRow, { borderBottomColor: '#cbd5e1' }]}>
              <Text style={{ flex: 0.5, textAlign: 'center', color: '#64748b' }}>{idx + 1}</Text>
              <View style={{ flex: 3 }}>
                <Text style={{ fontWeight: 'bold' }}>{item.description}</Text>
                {item.modelNumber ? <Text style={{ fontSize: 6, color: '#475569' }}>Model: {item.modelNumber}</Text> : null}
                {item.imeiOrSerialNo ? <Text style={{ fontSize: 6, color: '#d97706' }}>ID: {item.imeiOrSerialNo}</Text> : null}
              </View>
              <Text style={{ flex: 1, textAlign: 'center' }}>{item.hsnCode || '-'}</Text>
              <Text style={{ flex: 1.2, textAlign: 'right' }}>{formatPDFCurrency(item.rate)}</Text>
              <Text style={{ flex: 1, textAlign: 'center' }}>{item.quantity} {item.unit}</Text>
              <Text style={{ flex: 1.2, textAlign: 'right' }}>{formatPDFCurrency(item.taxableAmount)}</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>{item.gstRate}%</Text>
              <Text style={{ flex: 1.4, textAlign: 'right', fontWeight: 'bold' }}>{formatPDFCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Summary & Totals */}
        <View style={{ borderWidth: 1, borderColor: '#0f172a', flexDirection: 'row', marginBottom: 8 }}>
          <View style={{ flex: 1.2, padding: 6, borderRightWidth: 1, borderColor: '#0f172a', fontSize: 7 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 6.5, color: '#475569' }}>AMOUNT IN WORDS:</Text>
            <Text style={{ fontStyle: 'italic', marginTop: 2 }}>{numberToWords(invoice.totalAmount)} Only.</Text>
            {invoice.notes && <Text style={{ color: '#475569', marginTop: 4 }}>Note: {invoice.notes}</Text>}
          </View>
          <View style={{ flex: 0.8, padding: 6, backgroundColor: '#f8fafc', fontSize: 7 }}>
            <View style={styles.summaryRow}><Text>Taxable Value:</Text><Text>{formatPDFCurrency(invoice.subtotal)}</Text></View>
            {isInterState ? (
              <View style={styles.summaryRow}><Text>Integrated Tax (IGST):</Text><Text>{formatPDFCurrency(invoice.igst)}</Text></View>
            ) : (
              <>
                <View style={styles.summaryRow}><Text>Central Tax (CGST):</Text><Text>{formatPDFCurrency(invoice.cgst)}</Text></View>
                <View style={styles.summaryRow}><Text>State Tax (SGST):</Text><Text>{formatPDFCurrency(invoice.sgst)}</Text></View>
              </>
            )}
            {invoice.roundOff !== 0 && <View style={styles.summaryRow}><Text>Round Off:</Text><Text>{formatPDFCurrency(invoice.roundOff)}</Text></View>}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#0f172a', paddingTop: 3, fontWeight: 'bold', fontSize: 8.5 }]}>
              <Text>Total Value:</Text>
              <Text>{formatPDFCurrency(invoice.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Bank & Signature Grid */}
        <View style={{ borderWidth: 1, borderColor: '#0f172a', padding: 6, fontSize: 7, marginTop: 'auto' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flex: 1.2 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 6.5, color: '#475569' }}>BANK DETAILS</Text>
              <Text>Bank: {settings.bankName} | A/C: {settings.bankAccountNumber}</Text>
              <Text>IFSC: {settings.bankIfsc} | Branch: {settings.bankBranch || 'Main'}</Text>
            </View>
            {qrCodeDataUrl && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 }}>
                <Image src={qrCodeDataUrl} style={{ height: 40, width: 40 }} />
                <Text style={{ fontSize: 6, color: '#64748b', marginLeft: 4 }}>Scan UPI</Text>
              </View>
            )}
            <View style={{ textAlign: 'right', minWidth: 100, alignItems: 'flex-end' }}>
              <Text>For {settings.companyName}</Text>
              {renderPDFSignature(settings)}
              <Text style={{ marginTop: 2, color: '#64748b', fontSize: 6 }}>Authorized Signatory</Text>
            </View>
          </View>
          <Text style={{ fontSize: 6.5, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------
// PDF Template Selector
// ----------------------------------------------------
export function PDFTemplateSelector({ templateName, invoice, settings, qrCodeDataUrl }: { templateName: string; invoice: Invoice; settings: AppSettings; qrCodeDataUrl?: string }) {
  switch (templateName) {
    case 'amazon':
      return <PDFTemplateAmazonLike invoice={invoice} settings={settings} qrCodeDataUrl={qrCodeDataUrl} />;
    case 'ltim':
      return <PDFTemplateLTIMindtreeLike invoice={invoice} settings={settings} qrCodeDataUrl={qrCodeDataUrl} />;
    case 'unilever':
      return <PDFTemplateUnileverLike invoice={invoice} settings={settings} qrCodeDataUrl={qrCodeDataUrl} />;
    case 'itc':
      return <PDFTemplateITCLike invoice={invoice} settings={settings} qrCodeDataUrl={qrCodeDataUrl} />;
    case 'bigbazaar':
      return <PDFTemplateBigBazaarLike invoice={invoice} settings={settings} qrCodeDataUrl={qrCodeDataUrl} />;
    case 'premium':
      return <PDFTemplatePremiumDefault invoice={invoice} settings={settings} qrCodeDataUrl={qrCodeDataUrl} />;
    case 'tata':
      return <PDFTemplateTataStructured invoice={invoice} settings={settings} qrCodeDataUrl={qrCodeDataUrl} />;
    default:
      return <PDFTemplatePremiumDefault invoice={invoice} settings={settings} qrCodeDataUrl={qrCodeDataUrl} />;
  }
}
