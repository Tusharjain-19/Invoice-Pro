import { Invoice, AppSettings } from '@/types';
import { formatCurrency, formatDate, numberToWords } from '@/lib/utils';

export function renderHtmlInvoice(templateHtml: string, invoice: Invoice, settings: AppSettings, qrCodeUrl?: string): string {
  let html = templateHtml;

  // 1. Process Items Loop
  // Find the table row containing {{ITEM_NAME}}
  const itemRowRegex = /<tr[^>]*>[\s\S]*?{{ITEM_NAME}}[\s\S]*?<\/tr>/i;
  const itemRowMatch = html.match(itemRowRegex);
  
  if (itemRowMatch && invoice.items) {
    const itemRowTemplate = itemRowMatch[0];
    let itemsHtml = '';
    
    invoice.items.forEach((item, index) => {
      let rowHtml = itemRowTemplate
        .replace(/{{INDEX}}/g, (index + 1).toString())
        .replace(/{{ITEM_INDEX}}/g, (index + 1).toString())
        .replace(/{{ITEM_NAME}}/g, item.description || '')
        .replace(/{{ITEM_DESCRIPTION_LINE_1}}/g, '')
        .replace(/{{ITEM_DESCRIPTION_LINE_2}}/g, '')
        .replace(/{{ITEM_VARIANTS_OR_DETAILS}}/g, '')
        .replace(/{{ITEM_HSN}}/g, item.hsnCode || '-')
        .replace(/{{ITEM_RATE}}/g, formatCurrency(item.rate))
        .replace(/{{ITEM_QTY}}/g, `${item.quantity} ${item.unit || ''}`)
        .replace(/{{ITEM_DISCOUNT}}/g, formatCurrency(item.discount || 0))
        .replace(/{{ITEM_TAXABLE_VAL}}/g, formatCurrency(item.total - (item.discount || 0)))
        .replace(/{{ITEM_TAX_PCT}}/g, (item.gstRate || 0).toString())
        .replace(/{{ITEM_TAX_AMT}}/g, formatCurrency((item.rate * item.quantity - (item.discount || 0)) * (item.gstRate || 0) / 100))
        .replace(/{{ITEM_PER}}/g, item.unit || '')
        .replace(/{{ITEM_TOTAL}}/g, formatCurrency(item.total));
      itemsHtml += rowHtml;
    });
    
    html = html.replace(itemRowRegex, itemsHtml);
  }

  // 2. Process Tax/HSN Loop
  const taxRowRegex = /<tr[^>]*>[\s\S]*?{{TAX_HSN}}[\s\S]*?<\/tr>/i;
  const taxRowMatch = html.match(taxRowRegex);
  
  if (taxRowMatch && invoice.items) {
    const taxRowTemplate = taxRowMatch[0];
    let taxesHtml = '';
    
    // Group by HSN and Tax Rate
    const taxGroups: Record<string, { taxable: number, taxRate: number }> = {};
    invoice.items.forEach(item => {
      const key = `${item.hsnCode || 'Misc'}-${item.gstRate || 0}`;
      if (!taxGroups[key]) {
        taxGroups[key] = { taxable: 0, taxRate: item.gstRate || 0 };
      }
      taxGroups[key].taxable += (item.rate * item.quantity) - (item.discount || 0);
    });

    Object.entries(taxGroups).forEach(([key, group]) => {
      const hsn = key.split('-')[0];
      const taxAmt = group.taxable * (group.taxRate / 100);
      const isInterState = settings.companyState?.toLowerCase() !== invoice.customerState?.toLowerCase();
      
      let rowHtml = taxRowTemplate
        .replace(/{{TAX_HSN}}/g, hsn)
        .replace(/{{TAX_TAXABLE_VAL}}/g, formatCurrency(group.taxable))
        .replace(/{{TAX_RATE_PCT}}/g, group.taxRate.toString())
        .replace(/{{TAX_AMT}}/g, formatCurrency(taxAmt))
        .replace(/{{TAX_TOTAL}}/g, formatCurrency(taxAmt));
        
      if (!isInterState) {
         rowHtml = rowHtml
           .replace(/{{TAX_CGST_RATE}}/g, `${group.taxRate / 2}%`)
           .replace(/{{TAX_CGST_AMT}}/g, formatCurrency(taxAmt / 2))
           .replace(/{{TAX_SGST_RATE}}/g, `${group.taxRate / 2}%`)
           .replace(/{{TAX_SGST_AMT}}/g, formatCurrency(taxAmt / 2));
      } else {
         rowHtml = rowHtml
           .replace(/{{TAX_CGST_RATE}}/g, `-`)
           .replace(/{{TAX_CGST_AMT}}/g, `-`)
           .replace(/{{TAX_SGST_RATE}}/g, `-`)
           .replace(/{{TAX_SGST_AMT}}/g, `-`);
      }
      taxesHtml += rowHtml;
    });
    
    html = html.replace(taxRowRegex, taxesHtml);
  }

  // 3. Process Global Placeholders
  const isInterState = settings.companyState?.toLowerCase() !== invoice.customerState?.toLowerCase();

  const replacements: Record<string, string> = {
    '{{APP_LOGO_URL}}': settings.companyLogo || '',
    '{{SHOW_LOGO}}': settings.showLogo && settings.companyLogo ? 'block' : 'none',
    '{{COMPANY_NAME}}': settings.companyName || '',
    '{{COMPANY_ADDRESS}}': `${settings.companyAddress || ''}, ${settings.companyCity || ''}, ${settings.companyState || ''} - ${settings.companyPincode || ''}`,
    '{{COMPANY_GSTIN}}': settings.companyGstin || 'N/A',
    '{{COMPANY_MOBILE}}': settings.companyPhone || 'N/A',
    '{{COMPANY_PHONE}}': settings.companyPhone || 'N/A',
    '{{COMPANY_EMAIL}}': settings.companyEmail || 'N/A',
    '{{COMPANY_PAN}}': settings.companyPan || 'N/A',
    
    '{{RECIPIENT_TYPE}}': invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'Tax Invoice',
    '{{RECIPIENT_LABEL}}': invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'Tax Invoice',
    '{{INVOICE_NUMBER}}': invoice.invoiceNumber || '',
    '{{INVOICE_DATE}}': formatDate(invoice.date || Date.now()),
    '{{DUE_DATE}}': invoice.dueDate ? formatDate(invoice.dueDate) : 'On Receipt',
    '{{PLACE_OF_SUPPLY}}': invoice.customerState || '',
    '{{PAYMENT_MODE}}': invoice.paymentMode || 'Cash',
    '{{STATUS}}': invoice.status || 'Paid',
    
    '{{CUSTOMER_NAME}}': invoice.customerName || 'Walk-in Customer',
    '{{BILLING_ADDRESS_LINE_1}}': invoice.customerAddress || '',
    '{{BILLING_ADDRESS_LINE_2}}': invoice.customerState || '',
    '{{BILLING_ADDRESS}}': `${invoice.customerAddress || ''} ${invoice.customerState || ''}`,
    '{{SHIPPING_ADDRESS_LINE_1}}': invoice.customerAddress || '',
    '{{SHIPPING_ADDRESS_LINE_2}}': invoice.customerState || '',
    '{{SHIPPING_ADDRESS}}': `${invoice.customerAddress || ''} ${invoice.customerState || ''}`,
    '{{CUSTOMER_PHONE}}': invoice.customerPhone || 'N/A',
    '{{CUSTOMER_GSTIN}}': invoice.customerGstin || 'N/A',

    '{{TOTAL_ITEMS}}': (invoice.items?.length || 0).toString(),
    '{{TOTAL_QTY}}': invoice.items?.reduce((sum, item) => sum + item.quantity, 0).toString() || '0',
    '{{SUBTOTAL}}': formatCurrency(invoice.subtotal || 0),
    '{{TOTAL_TAXABLE_AMOUNT}}': formatCurrency(invoice.taxableAmount || invoice.subtotal || 0),
    '{{TOTAL_DISCOUNT}}': formatCurrency(invoice.discount || 0),
    
    '{{TAX_LABEL_1}}': isInterState ? 'IGST' : 'CGST',
    '{{TAX_AMOUNT_1}}': formatCurrency(isInterState ? (invoice.igst || 0) : (invoice.cgst || 0)),
    '{{TAX_LABEL_2}}': isInterState ? '' : 'SGST',
    '{{TAX_AMOUNT_2}}': formatCurrency(isInterState ? 0 : (invoice.sgst || 0)),
    '{{TOTAL_TAX_AMOUNT}}': formatCurrency(invoice.totalTax || 0),
    
    '{{SUM_TAXABLE_VAL}}': formatCurrency(invoice.taxableAmount || invoice.subtotal || 0),
    '{{SUM_CGST_AMT}}': formatCurrency(invoice.cgst || 0),
    '{{SUM_SGST_AMT}}': formatCurrency(invoice.sgst || 0),
    '{{SUM_TAX_AMT}}': formatCurrency(invoice.totalTax || 0),
    '{{SUM_TOTAL_TAX}}': formatCurrency(invoice.totalTax || 0),
    
    '{{ROUND_OFF}}': formatCurrency(invoice.roundOff || 0),
    '{{GRAND_TOTAL}}': formatCurrency(invoice.totalAmount || 0),
    '{{AMOUNT_IN_WORDS}}': numberToWords(invoice.totalAmount || 0),

    '{{SHOW_PAID_STATUS}}': invoice.status === 'paid' ? 'block' : 'none',
    '{{PAID_AMOUNT_META}}': formatCurrency(invoice.totalAmount || 0),
    '{{PAID_METHOD}}': invoice.paymentMode || 'Cash',
    '{{PAID_DATE}}': formatDate(invoice.date || Date.now()),

    '{{BANK_NAME}}': settings.bankName || 'N/A',
    '{{BANK_ACCOUNT}}': settings.bankAccountNumber || 'N/A',
    '{{BANK_IFSC}}': settings.bankIfsc || 'N/A',
    '{{BANK_BRANCH}}': settings.bankBranch || 'N/A',
    '{{BANK_HOLDER}}': settings.bankAccountName || settings.companyName || 'N/A',
    
    '{{SHOW_QR}}': qrCodeUrl ? 'block' : 'none',
    '{{QR_CODE_URL}}': qrCodeUrl || '',
    '{{UPI_ID}}': settings.upiId || 'N/A',
    
    '{{SIGNATURE_URL}}': settings.companySignature || '',
    '{{SHOW_SIGNATURE}}': settings.showSignature && settings.companySignature ? 'block' : 'none',
    
    '{{NOTES_TEXT}}': invoice.notes || 'Thanks for doing business with us.',
    '{{TERMS_TEXT}}': invoice.termsAndConditions || settings.termsAndConditions || '',
    '{{TERM_1}}': 'All disputes are subject to local jurisdiction.',
    '{{TERM_2}}': 'Goods once sold will not be taken back.',
    '{{TERM_3}}': 'Interest @ 18% p.a. will be charged if payment is delayed.',
    '{{TERM_4}}': 'E. & O.E.'
  };

  Object.entries(replacements).forEach(([key, value]) => {
    // Escape string for regex creation just in case
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeKey, 'g');
    html = html.replace(regex, value);
  });

  return html;
}
