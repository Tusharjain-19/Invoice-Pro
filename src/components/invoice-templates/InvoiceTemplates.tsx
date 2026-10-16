'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Invoice, AppSettings, InvoiceItem } from '@/types';
import { formatDate, formatCurrency, numberToWords } from '@/lib/utils';
import { BrandTemplateLogo } from '@/components/layout/BrandLogos';

interface TemplateProps {
  invoice: Invoice;
  settings: AppSettings;
}

// Helper for Inter-State GST check
const getGstTaxDetails = (invoice: Invoice, settings: AppSettings) => {
  const isInterState = (settings.companyState || '').toLowerCase().trim() !== (invoice.customerState || '').toLowerCase().trim();
  return {
    isInterState,
    taxLabel: isInterState ? 'IGST' : 'CGST + SGST',
  };
};

// UPI String builder with NPCI ₹1,00,000 regulatory ceiling and Split amount parsing
const getUpiUrl = (invoice: Invoice, settings: AppSettings) => {
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

// Helper to render logo dynamically with authentic corporate brandmarks as default
const renderCompanyLogo = (settings: AppSettings, defaultBrand?: string, customClass = '') => {
  if (settings.showLogo === false) return null;
  let alignClass = 'mr-auto ml-0 block';
  if (settings.logoAlign === 'center') alignClass = 'mx-auto block';
  if (settings.logoAlign === 'right') alignClass = 'ml-auto mr-0 block';

  if (settings.companyLogo) {
    return (
      <img 
        src={settings.companyLogo} 
        alt="Logo" 
        style={{ width: `${settings.logoWidth || 120}px`, height: 'auto' }} 
        className={`object-contain mb-2 ${alignClass} ${customClass}`} 
      />
    );
  }

  if (defaultBrand) {
    return (
      <div className={`mb-2.5 ${alignClass} ${customClass}`}>
        <BrandTemplateLogo templateId={defaultBrand} className="h-8 w-auto max-w-37.5" />
      </div>
    );
  }

  return null;
};

// Helper to render signature dynamically
const renderCompanySignature = (settings: AppSettings, customClass = '') => {
  if (settings.showSignature === false || !settings.companySignature) return null;
  return (
    <img 
      src={settings.companySignature} 
      alt="Signature" 
      style={{ width: `${settings.sigWidth || 120}px`, height: 'auto' }} 
      className={`object-contain mx-auto mb-1 ${customClass}`} 
    />
  );
};

// Helper to render product model & IMEI/serial identification
const renderProductItemIdentity = (item: InvoiceItem) => {
  if (!item.modelNumber && !item.imeiOrSerialNo) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] leading-tight">
      {item.modelNumber && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium border border-slate-200">
          Model: {item.modelNumber}
        </span>
      )}
      {item.imeiOrSerialNo && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-mono font-semibold border border-amber-200">
          IMEI/SN: {item.imeiOrSerialNo}
        </span>
      )}
      <span className="text-[9px] text-emerald-700 font-medium">✓ Sold by us (Verified Device)</span>
    </div>
  );
};

// ----------------------------------------------------
// Template 1: Amazon-Like Layout
// ----------------------------------------------------
export function InvoiceTemplateAmazonLike({ invoice, settings }: TemplateProps) {
  const { isInterState } = getGstTaxDetails(invoice, settings);
  const upiString = getUpiUrl(invoice, settings);

  return (
    <div className="w-full bg-white text-slate-800 p-8 border border-slate-200 shadow-md font-sans max-w-200 mx-auto min-h-282.5 flex flex-col justify-between" id="invoice-print-area">
      <div>
        {/* Amazon Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-5 mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-light tracking-wide text-slate-800 uppercase">
              {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
            </h1>
            <div className="text-xs text-slate-600 space-y-1">
              <p><span className="font-semibold text-slate-800">Invoice Number:</span> <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
              <p><span className="font-semibold text-slate-800">Invoice Date:</span> {formatDate(invoice.date)}</p>
              {invoice.dueDate && <p><span className="font-semibold text-slate-800">Due Date:</span> {formatDate(invoice.dueDate)}</p>}
              <p><span className="font-semibold text-slate-800">Place of Supply:</span> {invoice.customerState || 'Rajasthan'}</p>
              <p><span className="font-semibold text-slate-800">Payment Mode:</span> <span className="font-semibold text-slate-950">{invoice.paymentMode}</span></p>
            </div>
          </div>
          <div className="text-right">
            {renderCompanyLogo(settings, 'amazon')}
            {!settings.companyLogo && (
              <h2 className="text-xl font-bold text-slate-900">{settings.companyName}</h2>
            )}
            <div className="text-[11px] text-slate-500 leading-relaxed text-right mt-1 max-w-62.5 ml-auto">
              <p className="font-bold text-slate-800">{settings.companyName}</p>
              <p>{settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}</p>
              <p>Ph: {settings.companyPhone} | {settings.companyEmail}</p>
              <p className="font-semibold text-slate-700 mt-1">GSTIN: {settings.companyGstin || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Addresses Box */}
        <div className="grid grid-cols-2 gap-8 mb-6 text-xs leading-relaxed">
          <div className="border border-slate-200 rounded p-4 bg-slate-50/50">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">Billing Address</h3>
            <p className="font-bold text-slate-900 text-sm">{invoice.customerName}</p>
            <p className="text-slate-600 mt-1 whitespace-pre-wrap">{invoice.customerAddress}</p>
            <p className="mt-2 font-semibold text-slate-700">GSTIN: <span className="font-mono">{invoice.customerGstin || 'N/A'}</span></p>
            {invoice.customerPhone && <p className="text-slate-500">Phone: {invoice.customerPhone}</p>}
          </div>
          <div className="border border-slate-200 rounded p-4 bg-slate-50/50">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">Shipping Address</h3>
            <p className="font-bold text-slate-900 text-sm">{invoice.customerName}</p>
            <p className="text-slate-600 mt-1 whitespace-pre-wrap">{invoice.customerAddress}</p>
            {invoice.customerPhone && <p className="text-slate-500 mt-4">Phone: {invoice.customerPhone}</p>}
          </div>
        </div>

        {/* Product Table */}
        <table className="w-full text-xs font-sans text-left border-collapse mb-6">
          <thead>
            <tr className="border-t border-t-slate-200 border-b-2 border-b-slate-800 bg-slate-50 text-[10px] uppercase tracking-wider font-semibold text-slate-600">
              <th className="px-3 py-3 w-8 text-center">#</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3 text-center w-16">HSN</th>
              <th className="px-3 py-3 text-right w-20">Unit Price</th>
              <th className="px-3 py-3 text-center w-12">Qty</th>
              <th className="px-3 py-3 text-right w-16">Discount</th>
              <th className="px-3 py-3 text-center w-12">Tax Rate</th>
              <th className="px-3 py-3 text-right w-24">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items && invoice.items.map((item, idx) => {
              const itemTax = item.cgst + item.sgst + item.igst;
              return (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900">{item.description}</p>
                    {renderProductItemIdentity(item)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-slate-500">{item.hsnCode || '-'}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(item.rate)}</td>
                  <td className="px-3 py-2.5 text-center">{item.quantity} {item.unit}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                    {item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono">{item.gstRate}%</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900">{formatCurrency(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Notes, Terms & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <div className="text-xs space-y-4">
            <div>
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-1">Amount in Words</h4>
              <p className="italic text-slate-800 border border-slate-200 rounded p-2.5 bg-slate-50/50 leading-tight">
                {numberToWords(invoice.totalAmount)}
              </p>
            </div>
            {invoice.notes && (
              <div>
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-1">Remarks</h4>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.isReverseCharge && (
              <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded px-2.5 py-1 w-fit">
                * Reverse Charge Applicable
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                <tr className="pb-2">
                  <td className="py-2 text-slate-500">Subtotal:</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.discount > 0 && (
                  <tr>
                    <td className="py-2 text-slate-500">Discount:</td>
                    <td className="py-2 text-right font-mono text-destructive">-{formatCurrency(invoice.discount)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 text-slate-500">Taxable Value:</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(invoice.taxableAmount)}</td>
                </tr>
                {isInterState ? (
                  <tr>
                    <td className="py-2 text-slate-500">IGST Total:</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(invoice.igst)}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className="py-2 text-slate-500">CGST Total:</td>
                      <td className="py-2 text-right font-mono">{formatCurrency(invoice.cgst)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-500">SGST Total:</td>
                      <td className="py-2 text-right font-mono">{formatCurrency(invoice.sgst)}</td>
                    </tr>
                  </>
                )}
                {invoice.roundOff !== 0 && (
                  <tr>
                    <td className="py-2 text-slate-500">Round Off:</td>
                    <td className="py-2 text-right font-mono">{invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</td>
                  </tr>
                )}
                <tr className="font-bold text-sm border-t border-slate-300">
                  <td className="py-3 text-slate-900">Grand Total:</td>
                  <td className="py-3 text-right font-mono text-base text-amber-700">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
                <tr className="text-[10px] text-slate-500">
                  <td className="py-1.5">Amount Paid:</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(invoice.paidAmount)}</td>
                </tr>
                <tr className="font-semibold text-rose-600 text-[10px]">
                  <td className="py-1.5">Balance Due:</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(invoice.balanceDue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Amazon Footer */}
      <div className="border-t border-slate-200 pt-6 mt-8 text-xs font-sans">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="flex gap-3 items-center">
            {upiString && (
              <div className="border border-slate-200 p-1.5 bg-white rounded shadow-sm shrink-0">
                <QRCodeSVG value={upiString} size={54} />
              </div>
            )}
            <div>
              <p className="font-bold text-slate-700 uppercase text-[9px] mb-0.5">UPI Quick Pay</p>
              <p className="text-[10px] text-slate-500 font-mono truncate w-36">{settings.upiId || 'N/A'}</p>
              <p className="text-[9px] text-slate-400">Scan to pay via UPI</p>
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-700 uppercase text-[9px] mb-0.5">Bank Information</p>
            <p className="text-[10px] text-slate-500 leading-tight">
              Bank: {settings.bankName || 'N/A'}<br />
              Account: {settings.bankAccountNumber || 'N/A'}<br />
              IFSC: {settings.bankIfsc || 'N/A'}
            </p>
          </div>
          <div className="text-right space-y-4">
            <div className="inline-block border-b border-slate-200 pb-1 text-center min-w-30">
              {renderCompanySignature(settings)}
              {!settings.companySignature && <div className="h-6" />}
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Authorized Signatory</p>
          </div>
        </div>
        
        <div className="border-t border-slate-100 mt-4 pt-3 text-[9px] text-slate-400 text-center">
          <p>{settings.invoiceFooterNotes || 'This is a computer-generated tax invoice and requires no physical signatures.'}</p>
          <p className="text-[8px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Template 2: LTIMindtree-Like Layout
// ----------------------------------------------------
export function InvoiceTemplateLTIMindtreeLike({ invoice, settings }: TemplateProps) {
  const { isInterState } = getGstTaxDetails(invoice, settings);
  const upiString = getUpiUrl(invoice, settings);

  return (
    <div className="w-full bg-white text-slate-800 p-8 border border-slate-200 shadow-md font-sans max-w-200 mx-auto min-h-282.5 flex flex-col justify-between" id="invoice-print-area">
      <div>
        {/* Sleek Enterprise Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {renderCompanyLogo(settings, 'ltim')}
            {!settings.companyLogo && (
              <div className="h-10 w-10 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-xl mb-2">
                {settings.companyName?.charAt(0) || 'C'}
              </div>
            )}
            <h2 className="text-base font-bold text-slate-900 font-display">{settings.companyName}</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-70 mt-0.5">
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">GSTIN: {settings.companyGstin || 'N/A'}</p>
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase font-display">
              {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
            </h1>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-right text-slate-600 ml-auto w-52">
              <span className="font-semibold text-slate-700">Invoice No:</span>
              <span className="font-mono font-bold text-slate-950">{invoice.invoiceNumber}</span>
              <span className="font-semibold text-slate-700">Date:</span>
              <span>{formatDate(invoice.date)}</span>
              {invoice.dueDate && (
                <>
                  <span className="font-semibold text-slate-700">Due Date:</span>
                  <span className="text-rose-600 font-medium">{formatDate(invoice.dueDate)}</span>
                </>
              )}
              <span className="font-semibold text-slate-700">Payment:</span>
              <span className="uppercase font-bold text-slate-800">{invoice.paymentMode}</span>
            </div>
          </div>
        </div>

        {/* Addresses Section */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
          <div className="border-l-4 border-slate-900 pl-4 py-1">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-display">Customer / Billed To</h3>
            <p className="font-bold text-slate-900 text-sm font-display">{invoice.customerName}</p>
            <p className="text-slate-600 whitespace-pre-wrap mt-0.5">{invoice.customerAddress}</p>
            <p className="mt-1 font-semibold text-slate-700">GSTIN: <span className="font-mono">{invoice.customerGstin || 'N/A'}</span></p>
            {invoice.customerPhone && <p className="text-slate-500">Phone: {invoice.customerPhone}</p>}
          </div>
          <div className="border-l-4 border-slate-400 pl-4 py-1">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-display">Shipping Details</h3>
            <p className="font-bold text-slate-900 text-sm font-display">{invoice.customerName}</p>
            <p className="text-slate-600 whitespace-pre-wrap mt-0.5">{invoice.customerAddress}</p>
          </div>
        </div>

        {/* Product Table */}
        <table className="w-full text-xs text-left mb-6 border border-slate-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-semibold">
              <th className="px-4 py-3 w-8 text-center">#</th>
              <th className="px-4 py-3">Item Name & Details</th>
              <th className="px-4 py-3 text-center w-16">HSN</th>
              <th className="px-4 py-3 text-right w-20">Rate</th>
              <th className="px-4 py-3 text-center w-12">Qty</th>
              <th className="px-4 py-3 text-right w-16">Discount</th>
              <th className="px-4 py-3 text-center w-12">GST</th>
              <th className="px-4 py-3 text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items && invoice.items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-4 py-2.5 text-center text-slate-400">{idx + 1}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-900">{item.description}</p>
                  {renderProductItemIdentity(item)}
                </td>
                <td className="px-4 py-2.5 text-center font-mono text-slate-500">{item.hsnCode || '-'}</td>
                <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(item.rate)}</td>
                <td className="px-4 py-2.5 text-center">{item.quantity} {item.unit}</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                  {item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)) : '-'}
                </td>
                <td className="px-4 py-2.5 text-center font-mono">{item.gstRate}%</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* GST Split & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="text-xs space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] leading-relaxed">
              <h4 className="font-bold text-slate-700 uppercase text-[9px] mb-1.5 border-b pb-1 font-display">Tax Analysis</h4>
              <div className="flex justify-between font-semibold text-slate-500 pb-1 mb-1 border-b">
                <span>Component</span>
                <span>Rate</span>
                <span>Taxable Val</span>
                <span>Tax Amt</span>
              </div>
              {isInterState ? (
                <div className="flex justify-between font-mono">
                  <span>Integrated GST (IGST)</span>
                  <span>-</span>
                  <span>{formatCurrency(invoice.taxableAmount)}</span>
                  <span>{formatCurrency(invoice.igst)}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between font-mono">
                    <span>Central GST (CGST)</span>
                    <span>9%</span>
                    <span>{formatCurrency(invoice.taxableAmount)}</span>
                    <span>{formatCurrency(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>State GST (SGST)</span>
                    <span>9%</span>
                    <span>{formatCurrency(invoice.taxableAmount)}</span>
                    <span>{formatCurrency(invoice.sgst)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-1 mt-1 font-mono text-slate-800">
                <span>Total GST</span>
                <span></span>
                <span></span>
                <span>{formatCurrency(invoice.totalTax)}</span>
              </div>
            </div>
            {invoice.notes && (
              <div>
                <p className="font-bold text-slate-600 text-[10px] uppercase font-display">Remarks:</p>
                <p className="text-slate-500 italic mt-0.5">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs self-start">
            <table className="w-full">
              <tbody>
                <tr className="text-slate-600">
                  <td className="py-1">Subtotal:</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.discount > 0 && (
                  <tr className="text-slate-600">
                     <td className="py-1">Discount:</td>
                     <td className="py-1 text-right font-mono text-destructive">-{formatCurrency(invoice.discount)}</td>
                  </tr>
                )}
                <tr className="text-slate-600">
                  <td className="py-1">Taxable base value:</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.taxableAmount)}</td>
                </tr>
                <tr className="text-slate-600">
                  <td className="py-1">GST Tax amount:</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.totalTax)}</td>
                </tr>
                {invoice.roundOff !== 0 && (
                  <tr className="text-slate-600">
                    <td className="py-1">Round-off:</td>
                    <td className="py-1 text-right font-mono">{invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</td>
                  </tr>
                )}
                <tr className="border-t border-slate-200 font-extrabold text-slate-900 text-sm pt-2">
                  <td className="py-2">Grand Total:</td>
                  <td className="py-2 text-right font-mono text-base text-slate-950">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
                <tr className="border-t border-slate-200/50 text-[10px] text-slate-500">
                  <td className="py-1">Received (Paid):</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.paidAmount)}</td>
                </tr>
                <tr className="text-[10px] font-bold text-destructive">
                  <td className="py-1">Remaining Balance:</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.balanceDue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LTIMindtree Footer */}
      <div className="border-t border-slate-200 pt-6 mt-8 text-xs">
        <div className="flex justify-between items-end">
          <div className="w-[60%] space-y-4">
            <div className="flex gap-4 items-center">
              {upiString && (
                <div className="border border-slate-200 p-1 bg-white rounded">
                  <QRCodeSVG value={upiString} size={54} />
                </div>
              )}
              <div>
                <p className="font-bold text-slate-850 text-[10px] uppercase">UPI Payment QR</p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  ID: <span className="font-mono font-medium">{settings.upiId || 'N/A'}</span><br />
                  Name: {settings.bankAccountName || settings.companyName}
                </p>
              </div>
            </div>
            <div>
              <p className="font-bold text-slate-600 text-[10px] uppercase">Bank Transfer Details</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Bank: {settings.bankName || 'N/A'} | Branch: {settings.bankBranch || 'N/A'}<br />
                A/C No: {settings.bankAccountNumber || 'N/A'} | IFSC: {settings.bankIfsc || 'N/A'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block text-center border-t border-slate-300 pt-2 min-w-35">
              {renderCompanySignature(settings)}
              {!settings.companySignature && <div className="h-10" />}
              <p className="font-bold text-slate-800 text-[10px] uppercase">{settings.companyName}</p>
              <p className="text-[9px] text-slate-400">Authorized Official</p>
            </div>
          </div>
        </div>
        <div className="text-center text-[9px] text-slate-400 mt-6 font-mono">
          <p>{settings.invoiceFooterNotes || 'Designed via InvoicePro.'}</p>
          <p className="text-[8px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Template 3: Unilever-Like Layout (Data-dense grid)
// ----------------------------------------------------
export function InvoiceTemplateUnileverLike({ invoice, settings }: TemplateProps) {
  const { isInterState } = getGstTaxDetails(invoice, settings);
  const upiString = getUpiUrl(invoice, settings);

  return (
    <div className="w-full bg-white text-slate-900 p-6 border-2 border-slate-800 shadow-none font-sans max-w-200 mx-auto min-h-282.5 flex flex-col justify-between" id="invoice-print-area">
      <div>
        {/* Boxed Grid Header */}
        <div className="border border-slate-800 grid grid-cols-3 divide-x divide-slate-800 mb-4 text-xs">
          <div className="p-3 col-span-2 space-y-1">
            {renderCompanyLogo(settings, 'unilever')}
            <h2 className="font-bold text-base uppercase">{settings.companyName}</h2>
            <p className="text-[10px] text-slate-600 leading-tight">
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </p>
            <p className="text-[10px] font-bold text-slate-700">GSTIN: <span className="font-mono">{settings.companyGstin || 'N/A'}</span></p>
          </div>
          <div className="p-3 space-y-1 text-right bg-slate-50/50">
            <span className="inline-block border border-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase bg-white">
              Original for Recipient
            </span>
            <h1 className="font-black text-slate-800 text-sm mt-2 uppercase">
              {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
            </h1>
            <p className="text-[10px]"><span className="font-bold">No:</span> <span className="font-mono font-bold">{invoice.invoiceNumber}</span></p>
            <p className="text-[10px]"><span className="font-bold">Date:</span> {formatDate(invoice.date)}</p>
            <p className="text-[10px]"><span className="font-bold">Payment:</span> {invoice.paymentMode}</p>
          </div>
        </div>

        {/* Dispatch details compartement */}
        <div className="border border-slate-800 grid grid-cols-2 divide-x divide-slate-800 mb-4 text-[10px] leading-relaxed">
          <div className="p-3">
            <h3 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-0.5 mb-1">Details of Receiver (Billed To)</h3>
            <p className="font-bold text-slate-900 text-xs">{invoice.customerName}</p>
            <p className="text-slate-600 whitespace-pre-wrap">{invoice.customerAddress}</p>
            <p className="mt-2 font-bold">GSTIN: <span className="font-mono">{invoice.customerGstin || 'N/A'}</span></p>
            <p>State: {invoice.customerState || 'Rajasthan'}</p>
          </div>
          <div className="p-3">
            <h3 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-0.5 mb-1">Details of Consignee (Shipped To)</h3>
            <p className="font-bold text-slate-900 text-xs">{invoice.customerName}</p>
            <p className="text-slate-600 whitespace-pre-wrap">{invoice.customerAddress}</p>
            {invoice.customerPhone && <p className="mt-2">Phone: {invoice.customerPhone}</p>}
          </div>
        </div>

        {/* Product Table (Fully Boxed) */}
        <table className="w-full text-[10px] font-sans border-collapse border border-slate-800 mb-4 text-center">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-800 font-bold uppercase text-[9px]">
              <th className="border border-slate-800 p-1 w-6">#</th>
              <th className="border border-slate-800 p-1 text-left">Description of Goods</th>
              <th className="border border-slate-800 p-1 w-12">HSN</th>
              <th className="border border-slate-800 p-1 text-right w-14">Qty</th>
              <th className="border border-slate-800 p-1 text-right w-16">Rate</th>
              <th className="border border-slate-800 p-1 text-right w-16">Disc</th>
              <th className="border border-slate-800 p-1 text-right w-20">Taxable Val</th>
              <th className="border border-slate-800 p-1 w-14">GST Rate</th>
              <th className="border border-slate-800 p-1 text-right w-20">Tax Amt</th>
              <th className="border border-slate-800 p-1 text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.map((item, idx) => {
              const itemTax = item.cgst + item.sgst + item.igst;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="border border-slate-800 p-1">{idx + 1}</td>
                  <td className="border border-slate-800 p-1 text-left">
                    <p className="font-bold text-slate-800">{item.description}</p>
                    {renderProductItemIdentity(item)}
                  </td>
                  <td className="border border-slate-800 p-1 font-mono">{item.hsnCode || '-'}</td>
                  <td className="border border-slate-800 p-1 text-right">{item.quantity} {item.unit}</td>
                  <td className="border border-slate-800 p-1 text-right font-mono">{formatCurrency(item.rate)}</td>
                  <td className="border border-slate-800 p-1 text-right font-mono">
                    {item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)) : '-'}
                  </td>
                  <td className="border border-slate-800 p-1 text-right font-mono">{formatCurrency(item.taxableAmount)}</td>
                  <td className="border border-slate-800 p-1 font-mono">{item.gstRate}%</td>
                  <td className="border border-slate-800 p-1 text-right font-mono">{formatCurrency(itemTax)}</td>
                  <td className="border border-slate-800 p-1 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* GST Breakup details table */}
        <div className="mb-4">
          <table className="w-full text-[9px] font-sans border-collapse border border-slate-800 text-center">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-800 uppercase font-bold text-[8px]">
                <th className="border border-slate-800 p-1" rowSpan={2}>HSN/SAC</th>
                <th className="border border-slate-800 p-1" rowSpan={2}>Taxable Value</th>
                <th className="border border-slate-800 p-1" colSpan={2}>Central Tax (CGST)</th>
                <th className="border border-slate-800 p-1" colSpan={2}>State Tax (SGST)</th>
                <th className="border border-slate-800 p-1" colSpan={2}>Integrated Tax (IGST)</th>
                <th className="border border-slate-800 p-1" rowSpan={2}>Total Tax</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-800 text-[8px]">
                <th className="border border-slate-800 p-1">Rate</th>
                <th className="border border-slate-800 p-1">Amount</th>
                <th className="border border-slate-800 p-1">Rate</th>
                <th className="border border-slate-800 p-1">Amount</th>
                <th className="border border-slate-800 p-1">Rate</th>
                <th className="border border-slate-800 p-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && Array.from(new Set(invoice.items.map(item => item.hsnCode || 'N/A'))).map((hsn, idx) => {
                const filtered = invoice.items.filter(item => (item.hsnCode || 'N/A') === hsn);
                const taxableVal = filtered.reduce((sum, item) => sum + item.taxableAmount, 0);
                const cgstVal = filtered.reduce((sum, item) => sum + item.cgst, 0);
                const sgstVal = filtered.reduce((sum, item) => sum + item.sgst, 0);
                const igstVal = filtered.reduce((sum, item) => sum + item.igst, 0);
                const totalTax = cgstVal + sgstVal + igstVal;
                const gstRate = filtered[0]?.gstRate || 0;

                return (
                  <tr key={idx}>
                    <td className="border border-slate-800 p-1 font-mono">{hsn}</td>
                    <td className="border border-slate-800 p-1 font-mono">{formatCurrency(taxableVal)}</td>
                    <td className="border border-slate-800 p-1">{isInterState ? '0%' : `${gstRate / 2}%`}</td>
                    <td className="border border-slate-800 p-1 font-mono">{formatCurrency(cgstVal)}</td>
                    <td className="border border-slate-800 p-1">{isInterState ? '0%' : `${gstRate / 2}%`}</td>
                    <td className="border border-slate-800 p-1 font-mono">{formatCurrency(sgstVal)}</td>
                    <td className="border border-slate-800 p-1">{isInterState ? `${gstRate}%` : '0%'}</td>
                    <td className="border border-slate-800 p-1 font-mono">{formatCurrency(igstVal)}</td>
                    <td className="border border-slate-800 p-1 font-mono font-bold">{formatCurrency(totalTax)}</td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-slate-50">
                <td className="border border-slate-800 p-1">Total</td>
                <td className="border border-slate-800 p-1 font-mono">{formatCurrency(invoice.taxableAmount)}</td>
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1 font-mono">{formatCurrency(invoice.cgst)}</td>
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1 font-mono">{formatCurrency(invoice.sgst)}</td>
                <td className="border border-slate-800 p-1"></td>
                <td className="border border-slate-800 p-1 font-mono">{formatCurrency(invoice.igst)}</td>
                <td className="border border-slate-800 p-1 font-mono">{formatCurrency(invoice.totalTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="grid grid-cols-2 border border-slate-800 divide-x divide-slate-800 mb-4 text-[10px] leading-relaxed">
          <div className="p-3 space-y-2">
            <div>
              <span className="font-bold text-slate-700 block uppercase text-[8px] mb-0.5">Amount in Words:</span>
              <p className="italic text-slate-800 leading-tight">{numberToWords(invoice.totalAmount)}</p>
            </div>
            {invoice.notes && (
              <div>
                <span className="font-bold text-slate-700 block uppercase text-[8px] mb-0.5">Special Notes:</span>
                <p className="text-slate-600 font-mono text-[9px] leading-tight">{invoice.notes}</p>
              </div>
            )}
          </div>
          <div className="p-3 bg-slate-50/50">
            <table className="w-full text-right font-medium">
              <tbody>
                <tr>
                  <td className="pb-1 text-slate-500">Subtotal:</td>
                  <td className="pb-1 font-mono font-semibold">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.discount > 0 && (
                  <tr>
                    <td className="py-1 text-slate-500">Total Discount:</td>
                    <td className="py-1 font-mono text-destructive">-{formatCurrency(invoice.discount)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 text-slate-500">Total GST Tax:</td>
                  <td className="py-1 font-mono font-semibold">{formatCurrency(invoice.totalTax)}</td>
                </tr>
                {invoice.roundOff !== 0 && (
                  <tr>
                    <td className="py-1 text-slate-500">Round Off Margin:</td>
                    <td className="py-1 font-mono font-semibold">{invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</td>
                  </tr>
                )}
                <tr className="border-t border-slate-800 font-bold text-xs pt-1.5 text-slate-900">
                  <td className="pt-2">Net Amount Payable:</td>
                  <td className="pt-2 font-mono text-base font-extrabold text-slate-950">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Unilever Footer */}
      <div className="border border-slate-800 p-3 text-[10px] leading-tight">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1 border-r border-slate-200 pr-2">
            <p className="font-bold uppercase text-[8px] text-slate-700">Bank Details</p>
            <p className="text-[9px] text-slate-600 leading-normal font-medium">
              Bank: {settings.bankName || 'N/A'}<br />
              Account: {settings.bankAccountNumber || 'N/A'}<br />
              IFSC: {settings.bankIfsc || 'N/A'}<br />
              Holder: {settings.bankAccountName || settings.companyName}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-bold uppercase text-[8px] text-slate-700">Terms of Sale</p>
            <p className="text-[8px] text-slate-400 leading-tight whitespace-pre-wrap">
              {invoice.termsAndConditions || settings.termsAndConditions}
            </p>
          </div>
          <div className="text-right flex flex-col justify-between items-end min-h-18.75">
            {upiString && (
              <div className="flex items-center gap-1.5 border p-1 rounded bg-slate-50/50 mb-1">
                <QRCodeSVG value={upiString} size={42} />
                <div className="text-[7px] text-slate-400 text-left">
                  <p className="font-bold text-slate-700">Scan UPI</p>
                  <p className="truncate w-14 font-mono">{settings.upiId}</p>
                </div>
              </div>
            )}
            <div className="text-center min-w-30">
              {renderCompanySignature(settings)}
              {!settings.companySignature && <div className="h-6" />}
              <p className="text-[8px] font-bold text-slate-800 uppercase mt-0.5">For {settings.companyName}</p>
              <p className="text-[8px] text-slate-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
        <p className="text-[8px] text-slate-400 font-semibold tracking-wider uppercase mt-3 text-center">
          Powered by InvoicePro • Professional GST Billing & Inventory Management
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Template 4: ITC-Like Layout (Enterprise Logistics)
// ----------------------------------------------------
export function InvoiceTemplateITCLike({ invoice, settings }: TemplateProps) {
  const { isInterState } = getGstTaxDetails(invoice, settings);
  const upiString = getUpiUrl(invoice, settings);

  return (
    <div className="w-full bg-white text-slate-800 p-8 border border-slate-300 shadow-md font-sans max-w-200 mx-auto min-h-282.5 flex flex-col justify-between" id="invoice-print-area">
      <div>
        {/* Header with Top-Right Acknowledgment QR */}
        <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-6">
          <div className="space-y-1.5">
            {renderCompanyLogo(settings, 'itc', 'mb-2')}
            <h2 className="text-base font-extrabold text-slate-950 uppercase">{settings.companyName}</h2>
            <p className="text-xs text-slate-500 max-w-80 leading-snug">
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </p>
            <p className="text-xs font-bold text-slate-700">GSTIN: <span className="font-mono">{settings.companyGstin || 'N/A'}</span></p>
            {settings.companyPhone && <p className="text-xs text-slate-500">Phone: {settings.companyPhone}</p>}
          </div>
          <div className="flex gap-4 items-center">
            {upiString && (
              <div className="border border-slate-300 p-1.5 bg-slate-50/50 rounded flex flex-col items-center">
                <QRCodeSVG value={upiString} size={60} />
                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1">E-Way / Payment QR</span>
              </div>
            )}
            <div className="text-right">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
              </h1>
              <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                <p><span className="font-semibold text-slate-800">Invoice No:</span> <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
                <p><span className="font-semibold text-slate-800">Date:</span> {formatDate(invoice.date)}</p>
                {invoice.dueDate && <p><span className="font-semibold text-slate-800">Due Date:</span> {formatDate(invoice.dueDate)}</p>}
                <p><span className="font-semibold text-slate-800">Reverse Charge:</span> {invoice.isReverseCharge ? 'Yes' : 'No'}</p>
                <p><span className="font-semibold text-slate-800">Payment Mode:</span> {invoice.paymentMode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logistics Metadata Grid */}
        <div className="border border-slate-300 grid grid-cols-4 divide-x divide-slate-300 mb-6 text-[10px] leading-relaxed bg-slate-50/30">
          <div className="p-2.5">
            <span className="text-slate-400 uppercase text-[8px] font-bold block">Vehicle Number</span>
            <span className="font-mono font-bold text-slate-800">DL-3C-YA-1204</span>
          </div>
          <div className="p-2.5">
            <span className="text-slate-400 uppercase text-[8px] font-bold block">E-Way Bill No</span>
            <span className="font-mono font-bold text-slate-800">381029481023</span>
          </div>
          <div className="p-2.5">
            <span className="text-slate-400 uppercase text-[8px] font-bold block">Date of Supply</span>
            <span className="font-mono text-slate-800">{formatDate(invoice.date)}</span>
          </div>
          <div className="p-2.5">
            <span className="text-slate-400 uppercase text-[8px] font-bold block">Place of Supply</span>
            <span className="font-semibold text-slate-800">{invoice.customerState || 'Rajasthan'}</span>
          </div>
        </div>

        {/* Customer Box */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
          <div className="border border-slate-200 rounded p-4">
            <h3 className="font-bold text-[9px] uppercase tracking-wider text-slate-500 mb-1">Buyer (Billed To)</h3>
            <p className="font-bold text-slate-900 text-sm">{invoice.customerName}</p>
            <p className="text-slate-600 whitespace-pre-wrap mt-0.5">{invoice.customerAddress}</p>
            <p className="mt-2 font-bold">GSTIN: <span className="font-mono">{invoice.customerGstin || 'N/A'}</span></p>
            {invoice.customerPhone && <p className="text-slate-500">Phone: {invoice.customerPhone}</p>}
          </div>
          <div className="border border-slate-200 rounded p-4">
            <h3 className="font-bold text-[9px] uppercase tracking-wider text-slate-500 mb-1">Consignee (Shipped To)</h3>
            <p className="font-bold text-slate-900 text-sm">{invoice.customerName}</p>
            <p className="text-slate-600 whitespace-pre-wrap mt-0.5">{invoice.customerAddress}</p>
          </div>
        </div>

        {/* Product Table */}
        <table className="w-full text-xs text-left border-collapse border border-slate-300 mb-6">
          <thead>
            <tr className="bg-slate-950 text-white text-[10px] uppercase font-bold tracking-wide">
              <th className="border border-slate-300 px-3 py-2 w-8 text-center">#</th>
              <th className="border border-slate-300 px-3 py-2">Item Description</th>
              <th className="border border-slate-300 px-3 py-2 text-center w-16">HSN</th>
              <th className="border border-slate-300 px-3 py-2 text-right w-20">Rate</th>
              <th className="border border-slate-300 px-3 py-2 text-center w-12">Qty</th>
              <th className="border border-slate-300 px-3 py-2 text-right w-16">Taxable Val</th>
              <th className="border border-slate-300 px-3 py-2 text-center w-12">GST</th>
              <th className="border border-slate-300 px-3 py-2 text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items && invoice.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="border border-slate-300 px-3 py-2 text-center">{idx + 1}</td>
                <td className="border border-slate-300 px-3 py-2">
                  <p className="font-bold text-slate-800">{item.description}</p>
                  {renderProductItemIdentity(item)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center font-mono text-slate-600">{item.hsnCode || '-'}</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono">{formatCurrency(item.rate)}</td>
                <td className="border border-slate-300 px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono">{formatCurrency(item.taxableAmount)}</td>
                <td className="border border-slate-300 px-3 py-2 text-center font-mono">{item.gstRate}%</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
          <div className="space-y-4">
            <div>
              <p className="font-bold text-slate-700 uppercase text-[9px] mb-1">Amount in Words:</p>
              <p className="italic text-slate-800 leading-tight bg-slate-50 p-2 border border-slate-200 rounded">{numberToWords(invoice.totalAmount)}</p>
            </div>
            {invoice.notes && (
              <div>
                <p className="font-bold text-slate-600 uppercase text-[9px]">Logistics Remarks:</p>
                <p className="text-slate-500 whitespace-pre-wrap italic mt-0.5">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="border border-slate-300 rounded p-4 bg-slate-50/20">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1 text-slate-500">Subtotal:</td>
                  <td className="py-1 text-right font-mono font-semibold">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.discount > 0 && (
                  <tr>
                    <td className="py-1 text-slate-500">Discount:</td>
                    <td className="py-1 text-right font-mono text-destructive">-{formatCurrency(invoice.discount)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 text-slate-500">Taxable Value:</td>
                  <td className="py-1 text-right font-mono font-semibold">{formatCurrency(invoice.taxableAmount)}</td>
                </tr>
                {isInterState ? (
                  <tr>
                    <td className="py-1 text-slate-500">IGST (Inter-State):</td>
                    <td className="py-1 text-right font-mono font-semibold">{formatCurrency(invoice.igst)}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className="py-1 text-slate-500">CGST (9.0%):</td>
                      <td className="py-1 text-right font-mono font-semibold">{formatCurrency(invoice.cgst)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">SGST (9.0%):</td>
                      <td className="py-1 text-right font-mono font-semibold">{formatCurrency(invoice.sgst)}</td>
                    </tr>
                  </>
                )}
                {invoice.roundOff !== 0 && (
                  <tr>
                    <td className="py-1 text-slate-500">Round Off:</td>
                    <td className="py-1 text-right font-mono font-semibold">{invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</td>
                  </tr>
                )}
                <tr className="border-t border-slate-300 font-extrabold text-slate-900 text-sm pt-2">
                  <td className="py-2">Net Payable:</td>
                  <td className="py-2 text-right font-mono text-base font-extrabold text-slate-950">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ITC Footer */}
      <div className="border-t border-slate-300 pt-6 mt-8 text-xs font-sans">
        <div className="grid grid-cols-3 gap-6 items-end">
          <div>
            <p className="font-bold text-slate-700 uppercase text-[9px] mb-0.5">Remittance Info</p>
            <p className="text-[10px] text-slate-500 font-mono leading-tight font-medium">
              Bank: {settings.bankName || 'N/A'}<br />
              Account: {settings.bankAccountNumber}<br />
              IFSC: {settings.bankIfsc}
            </p>
          </div>
          <div>
            <p className="font-bold text-slate-600 uppercase text-[9px] mb-0.5">Terms & Conditions</p>
            <p className="text-[8px] text-slate-400 whitespace-pre-wrap leading-tight">
              {invoice.termsAndConditions || settings.termsAndConditions}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block text-center border-t border-slate-300 pt-1.5 min-w-32.5">
              {renderCompanySignature(settings)}
              {!settings.companySignature && <div className="h-6" />}
              <p className="text-[8px] font-bold uppercase text-slate-800">{settings.companyName}</p>
              <p className="text-[8px] text-slate-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
        <p className="text-[8px] text-slate-400 font-semibold tracking-wider uppercase mt-3 text-center">
          Powered by InvoicePro • Professional GST Billing & Inventory Management
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Template 5: Big Bazaar-Like Layout (Retail Supermarket)
// ----------------------------------------------------
export function InvoiceTemplateBigBazaarLike({ invoice, settings }: TemplateProps) {
  const { isInterState } = getGstTaxDetails(invoice, settings);
  const upiString = getUpiUrl(invoice, settings);

  return (
    <div className="w-full bg-white text-slate-800 p-8 border border-slate-300 shadow-md font-sans max-w-200 mx-auto min-h-282.5 flex flex-col justify-between" id="invoice-print-area">
      <div>
        {/* Retail Centered Header */}
        <div className="text-center border-b-2 border-dashed border-slate-300 pb-4 mb-6">
          {renderCompanyLogo(settings, 'bigbazaar', 'mx-auto')}
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">{settings.companyName || 'SUPERMARKET OUTLET'}</h1>
          <p className="text-xs text-slate-500 leading-tight">
            {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
          </p>
          <p className="text-xs font-mono font-bold text-slate-600 mt-1">GSTIN: {settings.companyGstin || 'N/A'}</p>
        </div>

        {/* Customer & Invoice Meta Row */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-xs leading-relaxed border-b border-slate-100 pb-4">
          <div>
            <span className="font-bold text-slate-400 uppercase text-[8px] tracking-wider block">Customer Details</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{invoice.customerName}</p>
            <p className="text-slate-500">{invoice.customerAddress}</p>
            {invoice.customerPhone && <p className="text-slate-500 mt-1">Phone: {invoice.customerPhone}</p>}
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-400 uppercase text-[8px] tracking-wider block">Transaction Info</span>
            <p className="mt-0.5 font-semibold text-slate-800"><span className="text-slate-400">Bill No:</span> <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
            <p className="text-slate-500"><span className="text-slate-400">Date:</span> {formatDate(invoice.date)}</p>
            <p className="text-slate-500"><span className="text-slate-400">Cashier:</span> Store Terminal</p>
            <p className="text-slate-500"><span className="text-slate-400">Payment:</span> {invoice.paymentMode}</p>
          </div>
        </div>

        {/* High Density Product Table */}
        <table className="w-full text-xs font-sans text-left border-collapse mb-6">
          <thead>
            <tr className="border-t border-b-2 border-slate-800 bg-slate-50 text-[10px] uppercase font-bold text-slate-700">
              <th className="px-3 py-2 w-8 text-center">#</th>
              <th className="px-3 py-2">Item Name</th>
              <th className="px-3 py-2 text-center w-16">HSN</th>
              <th className="px-3 py-2 text-right w-16">Price</th>
              <th className="px-3 py-2 text-center w-12">Qty</th>
              <th className="px-3 py-2 text-right w-16">Discount</th>
              <th className="px-3 py-2 text-center w-12">GST %</th>
              <th className="px-3 py-2 text-right w-24">Net Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items && invoice.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-bold text-slate-950">{item.description}</p>
                  {renderProductItemIdentity(item)}
                </td>
                <td className="px-3 py-2 text-center font-mono text-slate-500">{item.hsnCode || '-'}</td>
                <td className="px-3 py-2 text-right font-mono">{formatCurrency(item.rate)}</td>
                <td className="px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-500">
                  {item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)) : '-'}
                </td>
                <td className="px-3 py-2 text-center font-mono">{item.gstRate}%</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs pt-4 border-t-2 border-dashed border-slate-300">
          <div className="space-y-4">
            <div>
              <p className="font-bold text-slate-500 uppercase text-[8px] mb-0.5">Amount in Words:</p>
              <p className="italic text-slate-800 border border-slate-100 p-2 rounded bg-slate-50 font-medium">{numberToWords(invoice.totalAmount)}</p>
            </div>
            {invoice.notes && (
              <div>
                <p className="font-bold text-slate-500 uppercase text-[8px] mb-0.5">Cashier Remarks:</p>
                <p className="text-slate-600 mt-0.5 italic">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-4 self-start">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-1.5 text-slate-500">Items Gross Total:</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.discount > 0 && (
                  <tr>
                    <td className="py-1.5 text-slate-500">Promo Discount:</td>
                    <td className="py-1.5 text-right font-mono text-destructive">-{formatCurrency(invoice.discount)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1.5 text-slate-500">Taxable amount:</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(invoice.taxableAmount)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-500">VAT/GST Tax Total:</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(invoice.totalTax)}</td>
                </tr>
                {invoice.roundOff !== 0 && (
                  <tr>
                    <td className="py-1.5 text-slate-500">Round Off offset:</td>
                    <td className="py-1.5 text-right font-mono">{invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-400 font-black text-slate-900 text-sm pt-2">
                  <td className="py-2 text-slate-950 uppercase tracking-wide">Net Total:</td>
                  <td className="py-2 text-right font-mono text-lg font-black text-slate-950">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Big Bazaar Footer */}
      <div className="border-t-2 border-dashed border-slate-300 pt-6 mt-8 text-xs font-sans">
        <div className="grid grid-cols-3 gap-6 items-end">
          <div className="flex gap-3 items-center">
            {upiString && (
              <div className="border border-slate-200 p-1 bg-white rounded shadow-sm shrink-0">
                <QRCodeSVG value={upiString} size={54} />
              </div>
            )}
            <div>
              <p className="font-bold text-slate-700 uppercase text-[8px] mb-0.5">Quick Counter Pay</p>
              <p className="text-[10px] text-slate-500 font-mono truncate w-36">{settings.upiId || 'N/A'}</p>
              <p className="text-[9px] text-slate-400">Scan to pay instantly</p>
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-600 uppercase text-[8px] mb-0.5">Store Policy</p>
            <p className="text-[8px] text-slate-400 leading-tight">
              {invoice.termsAndConditions || settings.termsAndConditions}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block text-center border-t border-slate-300 pt-1.5 min-w-30">
              {renderCompanySignature(settings)}
              {!settings.companySignature && <div className="h-6" />}
              <p className="text-[8px] font-bold text-slate-800 uppercase">{settings.companyName}</p>
              <p className="text-[8px] text-slate-400">Billing Counter Seal</p>
            </div>
          </div>
        </div>
        <p className="text-[8px] text-slate-400 font-semibold tracking-wider uppercase mt-3 text-center">
          Powered by InvoicePro • Professional GST Billing & Inventory Management
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Template 6: Premium Default Layout
// ----------------------------------------------------
export function InvoiceTemplatePremiumDefault({ invoice, settings }: TemplateProps) {
  const { isInterState } = getGstTaxDetails(invoice, settings);
  const upiString = getUpiUrl(invoice, settings);

  return (
    <div className="w-full bg-white text-slate-800 p-8 border border-slate-200 shadow-lg font-sans max-w-200 mx-auto min-h-282.5 flex flex-col justify-between rounded-2xl relative overflow-hidden" id="invoice-print-area">
      {/* Decorative top colored line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900 dark:bg-slate-800" />
      
      <div>
        {/* Header section with brand feel */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6 mt-2">
          <div>
            {renderCompanyLogo(settings, 'premium')}
            {!settings.companyLogo && (
              <div className="h-10 w-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl mb-3">
                {settings.companyName?.charAt(0) || 'C'}
              </div>
            )}
            <h1 className="text-lg font-bold text-slate-900 tracking-tight font-display">{settings.companyName}</h1>
            <p className="text-xs text-slate-500 leading-normal max-w-xs mt-1 whitespace-pre-wrap">
              {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">GSTIN: {settings.companyGstin || 'N/A'}</p>
          </div>
 
          <div className="text-right">
            <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-slate-850 select-none font-display">
              {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'Tax Invoice'}
            </span>
            <div className="mt-4 text-xs space-y-1 text-slate-600 ml-auto w-52">
              <p><span className="font-semibold text-slate-700">Invoice No:</span> <span className="font-mono font-bold text-slate-950">{invoice.invoiceNumber}</span></p>
              <p><span className="font-semibold text-slate-700">Date:</span> {formatDate(invoice.date)}</p>
              {invoice.dueDate && <p><span className="font-semibold text-slate-700">Due Date:</span> {formatDate(invoice.dueDate)}</p>}
              <p><span className="font-semibold text-slate-700">Payment Mode:</span> <span className="font-semibold text-slate-950">{invoice.paymentMode}</span></p>
              <p><span className="font-semibold text-slate-700">Status:</span> <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase text-[9px]">{invoice.status}</span></p>
            </div>
          </div>
        </div>
 
        {/* Client & Billing Info cards */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
            <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-100 pb-1 font-display">Billed To</h3>
            <p className="font-bold text-slate-900 text-sm font-display">{invoice.customerName}</p>
            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed mt-1">{invoice.customerAddress}</p>
            <div className="flex gap-4 mt-2 pt-2 border-t border-slate-100/50 text-slate-700">
              {invoice.customerGstin && (
                <p>GSTIN: <span className="font-mono font-semibold">{invoice.customerGstin}</span></p>
              )}
              {invoice.customerPhone && (
                <p>Phone: <span className="font-semibold">{invoice.customerPhone}</span></p>
              )}
            </div>
          </div>
 
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-100 pb-1 font-display">Origin Details</h3>
              <p className="font-medium text-slate-850 font-display">{settings.companyName}</p>
              <p className="text-slate-500 mt-1">Ph: {settings.companyPhone}</p>
              <p className="text-slate-500">Mail: {settings.companyEmail}</p>
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-2">
              PAN: <span className="font-mono">{settings.companyPan || 'N/A'}</span>
            </div>
          </div>
        </div>
 
        {/* Product Table */}
        <table className="w-full text-xs text-left mb-6 border border-slate-150 rounded-xl overflow-hidden shadow-sm">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wide">
              <th className="px-4 py-3 w-8 text-center">#</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-center w-16">HSN</th>
              <th className="px-4 py-3 text-right w-20">Rate</th>
              <th className="px-4 py-3 text-center w-12">Qty</th>
              <th className="px-4 py-3 text-right w-16">Discount</th>
              <th className="px-4 py-3 text-center w-12">GST</th>
              <th className="px-4 py-3 text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items && invoice.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{item.description}</p>
                  {renderProductItemIdentity(item)}
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-500">{item.hsnCode || '-'}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.rate)}</td>
                <td className="px-4 py-3 text-center">{item.quantity} {item.unit}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-500">
                  {item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)) : '-'}
                </td>
                <td className="px-4 py-3 text-center font-mono">{item.gstRate}%</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
 
        {/* Calculations Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-xs">
          <div>
            <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-2 font-display">GST Analysis</h4>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-600">
              <div className="flex justify-between border-b pb-1 font-bold">
                <span>Tax Component</span>
                <span>Taxable Amt</span>
                <span>Tax Amt</span>
              </div>
              {isInterState ? (
                <div className="flex justify-between font-mono mt-1">
                  <span>Integrated GST (IGST)</span>
                  <span>{formatCurrency(invoice.taxableAmount)}</span>
                  <span>{formatCurrency(invoice.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between font-mono mt-1">
                    <span>Central GST (CGST) 9%</span>
                    <span>{formatCurrency(invoice.taxableAmount)}</span>
                    <span>{formatCurrency(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between font-mono mt-0.5">
                    <span>State GST (SGST) 9%</span>
                    <span>{formatCurrency(invoice.taxableAmount)}</span>
                    <span>{formatCurrency(invoice.sgst)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t pt-1 mt-1 font-bold text-slate-800">
                <span>Total Tax Collected</span>
                <span></span>
                <span>{formatCurrency(invoice.totalTax)}</span>
              </div>
            </div>
            {invoice.notes && (
              <div className="mt-3 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-700">Remarks:</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-linear-to-br from-slate-50 to-slate-100/50 border border-slate-100 rounded-xl p-4 text-xs font-semibold self-start">
            <table className="w-full">
              <tbody>
                <tr className="text-slate-500">
                  <td className="py-1">Subtotal:</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.discount > 0 && (
                  <tr className="text-slate-500">
                    <td className="py-1">Discount applied:</td>
                    <td className="py-1 text-right font-mono text-destructive">-{formatCurrency(invoice.discount)}</td>
                  </tr>
                )}
                <tr className="text-slate-500">
                  <td className="py-1">Taxable base value:</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.taxableAmount)}</td>
                </tr>
                <tr className="text-slate-500">
                  <td className="py-1">Tax amount (GST):</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.totalTax)}</td>
                </tr>
                {invoice.roundOff !== 0 && (
                  <tr className="text-slate-500">
                    <td className="py-1">Round-off offset:</td>
                    <td className="py-1 text-right font-mono">{invoice.roundOff > 0 ? '+' : ''}{formatCurrency(invoice.roundOff)}</td>
                  </tr>
                )}
                <tr className="border-t border-slate-200 font-black text-slate-900 text-sm mt-2">
                  <td className="py-2 text-slate-900">Total Net Payable:</td>
                  <td className="py-2 text-right font-mono text-base text-slate-950">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
                <tr className="border-t border-slate-200/50 text-[10px] text-slate-500">
                  <td className="py-1">Received payment:</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.paidAmount)}</td>
                </tr>
                <tr className="text-[10px] font-bold text-rose-600">
                  <td className="py-1">Unpaid Balance Due:</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(invoice.balanceDue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modern Footer with QR, T&C & Signature */}
      <div className="border-t border-slate-100 pt-6 mt-8 text-xs">
        <div className="flex justify-between items-end">
          <div className="w-[60%] space-y-4">
            <div className="flex gap-4 items-center">
              {upiString && (
                <div className="border border-slate-200 p-1.5 bg-slate-50 rounded-xl">
                  <QRCodeSVG value={upiString} size={54} />
                </div>
              )}
              <div>
                <p className="font-bold text-slate-800 text-[9px] uppercase">Bank Account Details</p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  Holder: {settings.bankAccountName || settings.companyName}<br />
                  A/c: {settings.bankAccountNumber} | IFSC: {settings.bankIfsc}<br />
                  Bank: {settings.bankName || 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <p className="font-bold text-slate-600 text-[9px] uppercase">Terms and Conditions</p>
              <p className="text-[8px] text-slate-400 whitespace-pre-wrap leading-tight mt-0.5">
                {invoice.termsAndConditions || settings.termsAndConditions}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block text-center border border-slate-100 bg-slate-50/50 p-3 rounded-xl min-w-35">
              {renderCompanySignature(settings)}
              {!settings.companySignature && <div className="h-10" />}
              <p className="font-bold text-slate-800 text-[9px] uppercase">{settings.companyName}</p>
              <p className="text-[8px] text-slate-400">Authorized Official</p>
            </div>
          </div>
        </div>
        <div className="text-center text-[9px] text-slate-400 mt-6 font-mono">
          <p>{settings.invoiceFooterNotes || 'Modern layout. Designed dynamically in web app.'}</p>
          <p className="text-[8px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
            Powered by InvoicePro • Professional GST Billing & Inventory Management
          </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Template 7: Tata-Like Layout (Structured Industrial & Heavy Engineering)
// ----------------------------------------------------
export function InvoiceTemplateTataStructured({ invoice, settings }: TemplateProps) {
  const { isInterState } = getGstTaxDetails(invoice, settings);
  const upiString = getUpiUrl(invoice, settings);

  // Group items by HSN for the standard GST summary table
  const hsnSummary = (invoice.items || []).reduce<Record<string, { hsn: string; taxable: number; gstRate: number; cgst: number; sgst: number; igst: number; totalTax: number }>>((acc, it) => {
    const key = `${it.hsnCode || 'N/A'}_${it.gstRate}`;
    if (!acc[key]) {
      acc[key] = {
        hsn: it.hsnCode || 'N/A',
        taxable: 0,
        gstRate: it.gstRate,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
      };
    }
    acc[key].taxable += it.taxableAmount || 0;
    acc[key].cgst += it.cgst || 0;
    acc[key].sgst += it.sgst || 0;
    acc[key].igst += it.igst || 0;
    acc[key].totalTax += (it.cgst || 0) + (it.sgst || 0) + (it.igst || 0);
    return acc;
  }, {});

  const totalItemsCount = (invoice.items || []).length;
  const totalQtyCount = (invoice.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);

  return (
    <div className="w-full bg-white text-slate-900 border border-slate-900 shadow-md font-sans max-w-200 mx-auto min-h-282.5 flex flex-col justify-between text-xs" id="invoice-print-area">
      <div>
        {/* Top Title Bar */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-slate-900 font-bold bg-slate-50/70">
          <span className="text-xs uppercase tracking-widest text-slate-800 font-black">
            {invoice.invoiceType ? invoice.invoiceType.replace('_', ' ') : 'TAX INVOICE'}
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wide text-slate-600 bg-white px-2 py-0.5 border border-slate-300 rounded">
            ORIGINAL FOR RECIPIENT
          </span>
        </div>

        {/* Company & Meta Grid */}
        <div className="grid grid-cols-12 border-b border-slate-900">
          <div className="col-span-7 p-3.5 border-r border-slate-900 flex items-start gap-3">
            {renderCompanyLogo(settings, 'tata', 'max-h-16')}
            <div className="space-y-0.5">
              <h2 className="text-sm font-black text-slate-950 uppercase tracking-tight">{settings.companyName || 'INDUSTRIAL ENTERPRISES'}</h2>
              <p className="font-semibold text-slate-700">GSTIN: <span className="font-mono">{settings.companyGstin || 'N/A'}</span></p>
              <p className="text-[11px] text-slate-600 leading-tight">
                {settings.companyAddress}, {settings.companyCity}, {settings.companyState} - {settings.companyPincode}
              </p>
              <p className="text-[11px] text-slate-600">Mobile: {settings.companyPhone} | Email: {settings.companyEmail}</p>
            </div>
          </div>
          <div className="col-span-5 flex flex-col justify-between">
            <div className="grid grid-cols-2 border-b border-slate-900 flex-1">
              <div className="p-2.5 border-r border-slate-900">
                <span className="text-[9px] text-slate-500 font-bold uppercase block">Invoice No:</span>
                <span className="font-mono font-bold text-slate-950 text-xs">{invoice.invoiceNumber}</span>
              </div>
              <div className="p-2.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase block">Invoice Date:</span>
                <span className="font-semibold text-slate-900 text-xs">{formatDate(invoice.date)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 flex-1">
              <div className="p-2.5 border-r border-slate-900">
                <span className="text-[9px] text-slate-500 font-bold uppercase block">Place of Supply:</span>
                <span className="font-semibold text-slate-900 text-xs">{invoice.customerState || settings.companyState || 'State'}</span>
              </div>
              <div className="p-2.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase block">Due Date:</span>
                <span className="font-semibold text-slate-900 text-xs">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Shipping Addresses */}
        <div className="grid grid-cols-12 border-b border-slate-900 text-xs">
          <div className="col-span-7 p-3.5 border-r border-slate-900 space-y-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Details of Receiver (Billed To):</span>
            <p className="font-bold text-slate-950 text-sm">{invoice.customerName}</p>
            <p className="text-slate-600 leading-tight whitespace-pre-wrap">{invoice.customerAddress}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-1 text-slate-700">
              <p className="font-semibold">GSTIN: <span className="font-mono">{invoice.customerGstin || 'URP'}</span></p>
              {invoice.customerPhone && <p>Ph: {invoice.customerPhone}</p>}
              <p>State: {invoice.customerState || 'N/A'}</p>
            </div>
          </div>
          <div className="col-span-5 p-3.5 space-y-1 bg-slate-50/40">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Details of Consignee (Shipped To):</span>
            <p className="font-bold text-slate-950 text-sm">{invoice.customerName}</p>
            <p className="text-slate-600 leading-tight whitespace-pre-wrap">{invoice.customerAddress}</p>
            {invoice.customerPhone && <p className="text-slate-700 pt-1">Ph: {invoice.customerPhone}</p>}
          </div>
        </div>

        {/* Structured Items Table with full vertical dividing rules */}
        <table className="w-full text-xs text-left border-collapse border-b border-slate-900">
          <thead>
            <tr className="border-b border-slate-900 bg-slate-100/90 text-[10px] uppercase font-bold text-slate-800">
              <th className="px-2.5 py-2 w-8 text-center border-r border-slate-900">#</th>
              <th className="px-3 py-2 border-r border-slate-900">Item & Description</th>
              <th className="px-2 py-2 text-center w-16 border-r border-slate-900">HSN/SAC</th>
              <th className="px-2.5 py-2 text-right w-20 border-r border-slate-900">Rate</th>
              <th className="px-2 py-2 text-center w-14 border-r border-slate-900">Qty</th>
              <th className="px-2.5 py-2 text-right w-20 border-r border-slate-900">Taxable</th>
              <th className="px-2.5 py-2 text-right w-20 border-r border-slate-900">Tax Amt</th>
              <th className="px-3 py-2 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items && invoice.items.map((item, idx) => {
              const itemTax = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
              return (
                <tr key={idx} className="align-top hover:bg-slate-50/50">
                  <td className="px-2.5 py-2 text-center text-slate-500 border-r border-slate-900 font-mono text-[11px]">{idx + 1}</td>
                  <td className="px-3 py-2 border-r border-slate-900">
                    <p className="font-bold text-slate-900">{item.description}</p>
                    {renderProductItemIdentity(item)}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-900">{item.hsnCode || '-'}</td>
                  <td className="px-2.5 py-2 text-right font-mono border-r border-slate-900">{formatCurrency(item.rate)}</td>
                  <td className="px-2 py-2 text-center font-mono border-r border-slate-900">{item.quantity} {item.unit}</td>
                  <td className="px-2.5 py-2 text-right font-mono border-r border-slate-900">{formatCurrency(item.taxableAmount)}</td>
                  <td className="px-2.5 py-2 text-right font-mono border-r border-slate-900">
                    <div>{formatCurrency(itemTax)}</div>
                    <div className="text-[9px] text-slate-500">({item.gstRate}%)</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-950">{formatCurrency(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Items Summary & Net Amount Row */}
        <div className="grid grid-cols-12 border-b border-slate-900">
          <div className="col-span-7 p-3.5 border-r border-slate-900 flex items-center justify-between font-semibold text-slate-700 bg-slate-50/40">
            <span>Total Items: <strong className="font-mono text-slate-900">{totalItemsCount}</strong></span>
            <span>Total Quantity: <strong className="font-mono text-slate-900">{totalQtyCount}</strong></span>
          </div>
          <div className="col-span-5 p-3.5 space-y-1.5 bg-slate-50/20">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Taxable Value:</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {isInterState ? (
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Integrated GST (IGST):</span>
                <span className="font-mono text-slate-900">{formatCurrency(invoice.igst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Central Tax (CGST):</span>
                  <span className="font-mono text-slate-900">{formatCurrency(invoice.cgst)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">State Tax (SGST):</span>
                  <span className="font-mono text-slate-900">{formatCurrency(invoice.sgst)}</span>
                </div>
              </>
            )}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Round Off:</span>
                <span className="font-mono text-slate-900">{formatCurrency(invoice.roundOff)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-900 font-bold text-sm">
              <span className="text-slate-900 uppercase">Total Invoice Value:</span>
              <span className="font-mono text-slate-950 font-black">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Amount in words */}
        <div className="px-4 py-2 border-b border-slate-900 bg-slate-50/50 text-xs">
          <span className="font-bold text-slate-700">Total Amount in Words: </span>
          <span className="font-semibold italic text-slate-900">{numberToWords(invoice.totalAmount)} Only.</span>
        </div>

        {/* Full GST HSN Summary Table */}
        <div className="border-b border-slate-900">
          <div className="px-3.5 py-1.5 bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300">
            Tax Breakdown by HSN / SAC
          </div>
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-[9px] uppercase font-bold text-slate-600">
                <th className="py-1 px-2 border-r border-slate-200">HSN/SAC</th>
                <th className="py-1 px-2 border-r border-slate-200 text-right">Taxable Value</th>
                {isInterState ? (
                  <>
                    <th className="py-1 px-2 border-r border-slate-200">IGST Rate</th>
                    <th className="py-1 px-2 border-r border-slate-200 text-right">IGST Amt</th>
                  </>
                ) : (
                  <>
                    <th className="py-1 px-2 border-r border-slate-200">CGST Rate</th>
                    <th className="py-1 px-2 border-r border-slate-200 text-right">CGST Amt</th>
                    <th className="py-1 px-2 border-r border-slate-200">SGST Rate</th>
                    <th className="py-1 px-2 border-r border-slate-200 text-right">SGST Amt</th>
                  </>
                )}
                <th className="py-1 px-2 text-right">Total Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(hsnSummary).map((row, i) => (
                <tr key={i} className="border-b border-slate-100 font-mono text-[10px]">
                  <td className="py-1 px-2 border-r border-slate-200 font-semibold">{row.hsn}</td>
                  <td className="py-1 px-2 border-r border-slate-200 text-right">{formatCurrency(row.taxable)}</td>
                  {isInterState ? (
                    <>
                      <td className="py-1 px-2 border-r border-slate-200">{row.gstRate}%</td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right">{formatCurrency(row.igst)}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-1 px-2 border-r border-slate-200">{(row.gstRate / 2).toFixed(1)}%</td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right">{formatCurrency(row.cgst)}</td>
                      <td className="py-1 px-2 border-r border-slate-200">{(row.gstRate / 2).toFixed(1)}%</td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right">{formatCurrency(row.sgst)}</td>
                    </>
                  )}
                  <td className="py-1 px-2 text-right font-bold">{formatCurrency(row.totalTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Banking, UPI, and Official Signatory */}
        <div className="grid grid-cols-12 border-b border-slate-900 text-xs">
          <div className="col-span-5 p-3.5 border-r border-slate-900 space-y-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Company Bank Details:</span>
            <p className="font-semibold text-slate-900">Bank: {settings.bankName || 'HDFC Bank'}</p>
            <p className="font-mono text-slate-800">A/C No: {settings.bankAccountNumber || 'N/A'}</p>
            <p className="font-mono text-slate-800">IFSC: {settings.bankIfsc || 'N/A'}</p>
            <p className="text-slate-600">Branch: {settings.bankBranch || 'Main Branch'}</p>
          </div>
          <div className="col-span-3 p-3.5 border-r border-slate-900 flex flex-col items-center justify-center text-center">
            {upiString ? (
              <div className="p-1.5 border border-slate-300 rounded bg-white shadow-xs">
                <QRCodeSVG value={upiString} size={50} />
              </div>
            ) : (
              <div className="h-12 w-12 border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400">UPI QR</div>
            )}
            <span className="text-[9px] text-slate-500 font-mono mt-1 font-semibold">Scan & Pay via UPI</span>
          </div>
          <div className="col-span-4 p-3.5 flex flex-col justify-between text-right">
            <p className="text-[10px] font-bold text-slate-800 uppercase">For {settings.companyName || 'INDUSTRIAL ENTERPRISES'}</p>
            <div className="my-2">
              {renderCompanySignature(settings)}
              {!settings.companySignature && <div className="h-8" />}
            </div>
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Authorized Signatory</p>
          </div>
        </div>

        {/* Terms and Footnotes */}
        <div className="grid grid-cols-2 p-3 text-[10px] text-slate-600 border-b border-slate-900">
          <div className="pr-3 border-r border-slate-300">
            <span className="font-bold text-slate-800 uppercase text-[9px] block mb-0.5">Notes:</span>
            <p>{invoice.notes || settings.invoiceFooterNotes || 'Goods dispatched in standard industrial packaging. Check seals prior to receipt.'}</p>
          </div>
          <div className="pl-3">
            <span className="font-bold text-slate-800 uppercase text-[9px] block mb-0.5">Terms and Conditions:</span>
            <p className="whitespace-pre-wrap">{invoice.termsAndConditions || settings.termsAndConditions || '1. Interest @18% p.a. charged after due date.\n2. Subject to local jurisdiction.'}</p>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div className="p-2 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-500 font-mono">
        <span>This is a computer-generated tax invoice verified under GST Laws.</span>
        <span className="font-bold uppercase tracking-wider text-slate-600">Powered by InvoicePro • Professional GST Billing & Inventory Management</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Core Selector Component
// ----------------------------------------------------
export function InvoiceTemplateSelector({ templateName, invoice, settings }: { templateName: string; invoice: Invoice; settings: AppSettings }) {
  const renderTemplate = () => {
    switch (templateName) {
      case 'amazon':
        return <InvoiceTemplateAmazonLike invoice={invoice} settings={settings} />;
      case 'ltim':
        return <InvoiceTemplateLTIMindtreeLike invoice={invoice} settings={settings} />;
      case 'unilever':
        return <InvoiceTemplateUnileverLike invoice={invoice} settings={settings} />;
      case 'itc':
        return <InvoiceTemplateITCLike invoice={invoice} settings={settings} />;
      case 'bigbazaar':
        return <InvoiceTemplateBigBazaarLike invoice={invoice} settings={settings} />;
      case 'premium':
        return <InvoiceTemplatePremiumDefault invoice={invoice} settings={settings} />;
      case 'tata':
        return <InvoiceTemplateTataStructured invoice={invoice} settings={settings} />;
      default:
        return <InvoiceTemplatePremiumDefault invoice={invoice} settings={settings} />;
    }
  };

  if (invoice.status === 'cancelled') {
    return (
      <div className="relative">
        {/* Prominent Cancelled Watermark Banner */}
        <div className="mb-4 p-3.5 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded text-xs font-black tracking-widest bg-rose-600 text-white uppercase shadow-xs">
              CANCELLED BILL
            </span>
            <span className="text-xs font-semibold">
              This invoice has been voided &amp; cancelled. Retained for GST tax audit records.
            </span>
          </div>
          {invoice.cancellationReason && (
            <div className="text-xs bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-md border border-rose-200 dark:border-rose-900 font-medium">
              <span className="font-bold text-rose-600">Reason:</span> {invoice.cancellationReason}
            </div>
          )}
        </div>
        <div className="opacity-90 relative">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 select-none overflow-hidden">
            <span className="text-7xl sm:text-9xl font-black text-rose-500/10 -rotate-12 uppercase tracking-widest border-4 border-dashed border-rose-500/15 p-6 rounded-3xl">
              CANCELLED
            </span>
          </div>
          {renderTemplate()}
        </div>
      </div>
    );
  }

  return renderTemplate();
}
