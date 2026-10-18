import type { Invoice, AppSettings } from '@/types';

// Standard 2-digit GST State Codes as mandated by CBIC / GSTN
export const GST_STATE_CODES: Record<string, string> = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  'Punjab': '03',
  'Chandigarh': '04',
  'Uttarakhand': '05',
  'Haryana': '06',
  'Delhi': '07',
  'Rajasthan': '08',
  'Uttar Pradesh': '09',
  'Bihar': '10',
  'Sikkim': '11',
  'Arunachal Pradesh': '12',
  'Nagaland': '13',
  'Manipur': '14',
  'Mizoram': '15',
  'Tripura': '16',
  'Meghalaya': '17',
  'Assam': '18',
  'West Bengal': '19',
  'Jharkhand': '20',
  'Odisha': '21',
  'Chhattisgarh': '22',
  'Madhya Pradesh': '23',
  'Gujarat': '24',
  'Daman and Diu': '26',
  'Dadra and Nagar Haveli': '26',
  'Maharashtra': '27',
  'Andhra Pradesh': '37',
  'Karnataka': '29',
  'Goa': '30',
  'Lakshadweep': '31',
  'Kerala': '32',
  'Tamil Nadu': '33',
  'Puducherry': '34',
  'Andaman and Nicobar Islands': '35',
  'Telangana': '36',
  'Ladakh': '38',
};

export function getStateCode(stateName?: string, gstin?: string): string {
  if (gstin && gstin.trim().length >= 2) {
    const prefix = gstin.trim().slice(0, 2);
    if (/^\d{2}$/.test(prefix)) return prefix;
  }
  if (!stateName) return '08'; // Default Rajasthan
  return GST_STATE_CODES[stateName.trim()] || '08';
}

export function formatGstDate(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Generates official E-Way Bill JSON schema accepted by https://ewaybillgst.gov.in
 */
export function generateEWayBillJSON(invoice: Invoice, settings?: AppSettings | null) {
  const fromStateCodeStr = getStateCode(settings?.companyState, settings?.companyGstin);
  const toStateCodeStr = getStateCode(invoice.customerState, invoice.customerGstin);

  const fromStateCode = parseInt(fromStateCodeStr, 10) || 8;
  const toStateCode = parseInt(toStateCodeStr, 10) || 8;

  const userGstin = settings?.companyGstin?.trim() || 'URP';
  const customerGstin = invoice.customerGstin?.trim() || 'URP';

  const itemList = (invoice.items || []).map((item, idx) => {
    const qty = item.quantity || 1;
    const taxable = Number((item.taxableAmount || item.total).toFixed(2));
    const rate = item.gstRate || 0;
    const isInterState = invoice.igst > 0;

    return {
      itemNo: idx + 1,
      productName: item.description?.slice(0, 50) || 'Product',
      productDesc: item.description?.slice(0, 100) || 'Product',
      hsnCode: parseInt(item.hsnCode?.replace(/\D/g, '') || '9999', 10) || 9999,
      quantity: qty,
      qtyUnit: item.unit?.slice(0, 3)?.toUpperCase() || 'NOS',
      taxableAmount: taxable,
      cgstRate: isInterState ? 0 : Number((rate / 2).toFixed(2)),
      sgstRate: isInterState ? 0 : Number((rate / 2).toFixed(2)),
      igstRate: isInterState ? Number(rate.toFixed(2)) : 0,
      cessRate: 0,
    };
  });

  const payload = {
    version: '1.0.0421',
    billLists: [
      {
        userGstin,
        supplyType: 'O',
        subSupplyType: '1',
        docType: invoice.invoiceType === 'tax_invoice' ? 'INV' : invoice.invoiceType === 'delivery_challan' ? 'CHL' : 'BIL',
        docNo: invoice.invoiceNumber,
        docDate: formatGstDate(invoice.date),
        fromGstin: userGstin,
        fromTrdName: settings?.companyName || 'Supplier Business',
        fromAddr1: settings?.companyAddress?.slice(0, 50) || 'Address Line',
        fromAddr2: '',
        fromPlace: settings?.companyCity || 'City',
        fromPincode: parseInt(settings?.companyPincode?.replace(/\D/g, '') || '302001', 10) || 302001,
        fromStateCode,
        actFromStateCode: fromStateCode,
        toGstin: customerGstin,
        toTrdName: invoice.customerName || 'Customer',
        toAddr1: invoice.customerAddress?.slice(0, 50) || 'Customer Address',
        toAddr2: '',
        toPlace: invoice.customerState || 'Destination City',
        toPincode: 302001,
        toStateCode,
        actToStateCode: toStateCode,
        totalValue: Number(invoice.taxableAmount.toFixed(2)),
        cgstValue: Number(invoice.cgst.toFixed(2)),
        sgstValue: Number(invoice.sgst.toFixed(2)),
        igstValue: Number(invoice.igst.toFixed(2)),
        cessValue: 0,
        totInvValue: Number(invoice.totalAmount.toFixed(2)),
        transDistance: '50',
        transMode: '1',
        transId: '',
        transName: '',
        transDocNo: '',
        transDocDate: '',
        vehNo: '',
        vehType: 'R',
        itemList,
      },
    ],
  };

  return payload;
}

/**
 * Generates official E-Invoice (IRN) schema accepted by https://einvoice1.gst.gov.in
 */
export function generateEInvoiceJSON(invoice: Invoice, settings?: AppSettings | null) {
  const fromStateCode = getStateCode(settings?.companyState, settings?.companyGstin);
  const toStateCode = getStateCode(invoice.customerState, invoice.customerGstin);

  const itemList = (invoice.items || []).map((item, idx) => {
    const isInterState = invoice.igst > 0;
    const rate = item.gstRate || 0;
    const taxable = Number((item.taxableAmount || item.total).toFixed(2));
    const cgst = isInterState ? 0 : Number(((taxable * (rate / 2)) / 100).toFixed(2));
    const sgst = isInterState ? 0 : Number(((taxable * (rate / 2)) / 100).toFixed(2));
    const igst = isInterState ? Number(((taxable * rate) / 100).toFixed(2)) : 0;

    return {
      SlNo: (idx + 1).toString(),
      PrdDesc: item.description?.slice(0, 100) || 'Goods',
      IsServc: 'N',
      HsnCd: item.hsnCode || '9999',
      Qty: item.quantity || 1,
      Unit: item.unit?.slice(0, 3)?.toUpperCase() || 'NOS',
      UnitPrice: Number(item.rate.toFixed(2)),
      TotAmt: Number((item.quantity * item.rate).toFixed(2)),
      Discount: Number((item.discount || 0).toFixed(2)),
      AssAmt: taxable,
      GstRt: rate,
      IgstAmt: igst,
      CgstAmt: cgst,
      SgstAmt: sgst,
      CesRt: 0,
      CesAmt: 0,
      TotItemVal: Number(item.total.toFixed(2)),
    };
  });

  const payload = [
    {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: invoice.customerGstin ? 'B2B' : 'B2C',
        RegRev: invoice.isReverseCharge ? 'Y' : 'N',
        EcmGstin: null,
        IgstOnIntra: 'N',
      },
      DocDtls: {
        Typ: 'INV',
        No: invoice.invoiceNumber,
        Dt: formatGstDate(invoice.date),
      },
      SellerDtls: {
        Gstin: settings?.companyGstin || '08AAAAA0000A1Z5',
        LglNm: settings?.companyName || 'Business Name',
        TrdNm: settings?.companyName || 'Business Name',
        Addr1: settings?.companyAddress || 'Office Address',
        Loc: settings?.companyCity || 'City',
        Pin: parseInt(settings?.companyPincode?.replace(/\D/g, '') || '302001', 10) || 302001,
        Stcd: fromStateCode,
        Ph: settings?.companyPhone || null,
        Em: settings?.companyEmail || null,
      },
      BuyerDtls: {
        Gstin: invoice.customerGstin || 'URP',
        LglNm: invoice.customerName || 'Customer Name',
        TrdNm: invoice.customerName || 'Customer Name',
        Pos: toStateCode,
        Addr1: invoice.customerAddress || 'Customer Address',
        Loc: invoice.customerState || 'City',
        Pin: 302001,
        Stcd: toStateCode,
        Ph: invoice.customerPhone || null,
      },
      ItemList: itemList,
      ValDtls: {
        AssVal: Number(invoice.taxableAmount.toFixed(2)),
        CgstVal: Number(invoice.cgst.toFixed(2)),
        SgstVal: Number(invoice.sgst.toFixed(2)),
        IgstVal: Number(invoice.igst.toFixed(2)),
        CesVal: 0,
        StCesVal: 0,
        RndOffAmt: Number(invoice.roundOff.toFixed(2)),
        TotInvVal: Number(invoice.totalAmount.toFixed(2)),
      },
    },
  ];

  return payload;
}

export function downloadJsonFile(data: any, fileName: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
