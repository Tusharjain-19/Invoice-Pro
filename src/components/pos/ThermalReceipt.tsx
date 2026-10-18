'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Invoice, AppSettings } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ThermalReceiptProps {
  invoice: Invoice;
  settings: AppSettings;
  paperWidth?: '58mm' | '80mm';
  cashTendered?: number;
  changeDue?: number;
  cashierName?: string;
}

export function ThermalReceipt({
  invoice,
  settings,
  paperWidth = '80mm',
  cashTendered = 0,
  changeDue = 0,
  cashierName = 'Counter 1',
}: ThermalReceiptProps) {
  // UPI QR String
  const upiId = settings.upiId || '';
  const upiUrl = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(settings.companyName)}&am=${invoice.totalAmount}&cu=INR`
    : '';

  const totalQty = invoice.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
  const is58 = paperWidth === '58mm';

  return (
    <div
      id="thermal-receipt-container"
      className={`bg-white text-black font-mono text-[11px] leading-tight select-none mx-auto ${
        is58 ? 'w-[58mm] max-w-[58mm] p-1.5' : 'w-[80mm] max-w-[80mm] p-3'
      }`}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-sm font-bold tracking-tight uppercase leading-tight">
          {settings.companyName || 'RETAIL STORE'}
        </h2>
        {settings.companyAddress && (
          <p className="text-[10px] mt-0.5 whitespace-pre-wrap">
            {[settings.companyAddress, settings.companyCity, settings.companyState]
              .filter(Boolean)
              .join(', ')}
            {settings.companyPincode ? ` - ${settings.companyPincode}` : ''}
          </p>
        )}
        {settings.companyPhone && (
          <p className="text-[10px]">Ph: {settings.companyPhone}</p>
        )}
        {settings.companyGstin && (
          <p className="text-[10px] font-bold">GSTIN: {settings.companyGstin}</p>
        )}
      </div>

      <div className="border-t border-dashed border-black my-1" />

      {/* Bill Meta */}
      <div className="text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>BILL NO:</span>
          <span className="font-bold">{invoice.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>DATE & TIME:</span>
          <span>{formatDate(invoice.date)} {new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex justify-between">
          <span>CASHIER:</span>
          <span>{cashierName}</span>
        </div>
        {invoice.customerName && (
          <div className="flex justify-between">
            <span>CUSTOMER:</span>
            <span className="font-semibold truncate max-w-[140px]">{invoice.customerName}</span>
          </div>
        )}
        {invoice.customerPhone && (
          <div className="flex justify-between">
            <span>PHONE:</span>
            <span>{invoice.customerPhone}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Items Header */}
      <div className="flex justify-between text-[10px] font-bold pb-1 border-b border-black">
        <span className="flex-1 text-left">ITEM</span>
        <span className="w-10 text-center">QTY</span>
        <span className="w-14 text-right">RATE</span>
        <span className="w-14 text-right">TOTAL</span>
      </div>

      {/* Item Rows */}
      <div className="divide-y divide-dotted divide-gray-400 py-1 space-y-1">
        {invoice.items?.map((item, idx) => (
          <div key={idx} className="pt-1 text-[10px]">
            <p className="font-medium text-left leading-tight truncate">{item.description}</p>
            <div className="flex justify-between text-gray-700 text-[9.5px]">
              <span className="flex-1 font-mono text-[9px] text-gray-600">
                {item.hsnCode ? `HSN:${item.hsnCode}` : ''}
              </span>
              <span className="w-10 text-center">{item.quantity}</span>
              <span className="w-14 text-right">{item.rate.toFixed(2)}</span>
              <span className="w-14 text-right font-bold text-black">{item.total.toFixed(2)}</span>
            </div>
            {item.imeiOrSerialNo && (
              <p className="text-[8.5px] text-gray-600">SN: {item.imeiOrSerialNo}</p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Totals Section */}
      <div className="text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>TOTAL ITEMS / QTY:</span>
          <span>{invoice.items?.length || 0} / {totalQty}</span>
        </div>
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>₹{invoice.subtotal.toFixed(2)}</span>
        </div>

        {invoice.discount > 0 && (
          <div className="flex justify-between text-gray-800">
            <span>DISCOUNT:</span>
            <span>-₹{invoice.discount.toFixed(2)}</span>
          </div>
        )}

        {invoice.cgst > 0 && (
          <div className="flex justify-between text-[9.5px]">
            <span>CGST:</span>
            <span>₹{invoice.cgst.toFixed(2)}</span>
          </div>
        )}
        {invoice.sgst > 0 && (
          <div className="flex justify-between text-[9.5px]">
            <span>SGST:</span>
            <span>₹{invoice.sgst.toFixed(2)}</span>
          </div>
        )}
        {invoice.igst > 0 && (
          <div className="flex justify-between text-[9.5px]">
            <span>IGST:</span>
            <span>₹{invoice.igst.toFixed(2)}</span>
          </div>
        )}

        {invoice.roundOff !== 0 && (
          <div className="flex justify-between text-[9px] text-gray-600">
            <span>ROUND OFF:</span>
            <span>{invoice.roundOff > 0 ? `+₹${invoice.roundOff.toFixed(2)}` : `-₹${Math.abs(invoice.roundOff).toFixed(2)}`}</span>
          </div>
        )}

        <div className="border-t border-b border-black py-1 my-1 flex justify-between items-center text-xs font-black">
          <span>NET PAYABLE:</span>
          <span className="text-sm font-mono">{formatCurrency(invoice.totalAmount)}</span>
        </div>

        {/* Payment info */}
        <div className="flex justify-between pt-0.5">
          <span>PAY MODE:</span>
          <span className="font-bold">{invoice.paymentMode || 'Cash'}</span>
        </div>
        {cashTendered > 0 && (
          <>
            <div className="flex justify-between">
              <span>CASH RECEIVED:</span>
              <span>₹{cashTendered.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>CHANGE RETURNED:</span>
              <span>₹{changeDue.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Dynamic UPI QR Code */}
      {upiUrl && invoice.balanceDue > 0 && (
        <div className="text-center my-2 pt-2 border-t border-dashed border-black">
          <p className="text-[9px] font-bold uppercase mb-1">Scan QR with any UPI App to Pay</p>
          <div className="inline-block p-1 bg-white border border-black rounded">
            <QRCodeSVG value={upiUrl} size={is58 ? 85 : 105} level="M" />
          </div>
          <p className="text-[8.5px] mt-0.5 text-gray-700">UPI ID: {upiId}</p>
        </div>
      )}

      <div className="border-t border-dashed border-black my-1.5" />

      {/* Footer Notes */}
      <div className="text-center text-[9px] space-y-0.5 leading-tight">
        <p className="font-bold">Thank you for your visit!</p>
        <p>Please check your items before leaving.</p>
        <p className="text-[8px] text-gray-600 mt-1">InvoicePro POS • GST Compliant</p>
      </div>

      {/* Print-only CSS rules */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-container,
          #thermal-receipt-container * {
            visibility: visible;
          }
          #thermal-receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperWidth} !important;
            max-width: ${paperWidth} !important;
            margin: 0 !important;
            padding: 2mm !important;
          }
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
