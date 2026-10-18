'use client';

import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Coupon, Customer, AppSettings } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  COUPON_TEMPLATES,
  formatCouponWhatsAppMessage,
  getWhatsAppShareUrl,
  BroadcastRecipient,
  sanitizePhoneNumber,
  parseRecipientsFromExcelData,
  parseRecipientsFromPastedText,
  downloadBroadcastExcelTemplate,
  exportBroadcastAuditReport,
} from '@/lib/couponAutomation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Users,
  FileSpreadsheet,
  User,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Download,
  Upload,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  FastForward,
  Play,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface CouponWhatsAppBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  couponsList: Coupon[];
  customers: Customer[];
  settings?: AppSettings;
  onCouponChange?: (coupon: Coupon) => void;
}

export function CouponWhatsAppBroadcastModal({
  isOpen,
  onClose,
  coupon,
  couponsList,
  customers,
  settings,
  onCouponChange,
}: CouponWhatsAppBroadcastModalProps) {
  // Active Coupon Selection (fallback if opened generally)
  const activeCoupon = coupon || couponsList[0] || null;

  // Workflow Stage: 'setup' (audience & message) or 'queue' (dispatch runner)
  const [stage, setStage] = useState<'setup' | 'queue'>('setup');

  // Targeting Audience Tab: 'single' | 'customers' | 'excel'
  const [audienceMode, setAudienceMode] = useState<'single' | 'customers' | 'excel'>('single');

  // Single Recipient State
  const [singleCustomerId, setSingleCustomerId] = useState<string>('manual');
  const [singlePhone, setSinglePhone] = useState<string>('');
  const [singleName, setSingleName] = useState<string>('');

  // Customer Directory Multi-Select State
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set());

  // Excel / CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelRecipients, setExcelRecipients] = useState<BroadcastRecipient[]>([]);
  const [excelInvalidCount, setExcelInvalidCount] = useState<number>(0);
  const [pasteText, setPasteText] = useState<string>('');
  const [isPasting, setIsPasting] = useState<boolean>(false);

  // Template & Customization State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('special_offer');
  const [customNote, setCustomNote] = useState<string>('');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedNumbers, setCopiedNumbers] = useState(false);

  // Queue Dispatch Runner State
  const [queueRecipients, setQueueRecipients] = useState<BroadcastRecipient[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(0);

  // Filtered Customer Directory
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // Handle Single Customer Selection
  const handleSingleCustomerChange = (val: string) => {
    setSingleCustomerId(val);
    if (val === 'manual') {
      setSinglePhone('');
      setSingleName('');
    } else {
      const cust = customers.find((c) => String(c.id) === val);
      if (cust) {
        setSinglePhone(cust.phone || '');
        setSingleName(cust.name || '');
      }
    }
  };

  // Toggle Single Customer in Multi-Select
  const handleToggleCustomerSelect = (id: number) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select / Deselect All Filtered Customers
  const handleSelectAllFilteredCustomers = () => {
    const validCustomers = filteredCustomers.filter((c) => c.phone && c.phone.trim().length >= 10);
    const allSelected = validCustomers.every((c) => c.id && selectedCustomerIds.has(c.id));

    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        validCustomers.forEach((c) => c.id && next.delete(c.id));
      } else {
        validCustomers.forEach((c) => c.id && next.add(c.id));
      }
      return next;
    });
  };

  // Handle Excel File Upload
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

        if (data.length === 0) {
          toast.error('The uploaded sheet is empty.');
          return;
        }

        const { recipients, invalidCount } = parseRecipientsFromExcelData(data);
        setExcelRecipients(recipients);
        setExcelInvalidCount(invalidCount);

        const validCount = recipients.filter((r) => r.isValidPhone).length;
        toast.success(`Parsed ${recipients.length} contacts (${validCount} valid phone numbers).`);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to parse Excel file. Please ensure it has Name and Phone columns.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be chosen again
    if (e.target) e.target.value = '';
  };

  // Handle Pasted Text Parsing
  const handleParsePastedContacts = () => {
    if (!pasteText.trim()) {
      toast.error('Please paste contacts first.');
      return;
    }
    const parsed = parseRecipientsFromPastedText(pasteText);
    if (parsed.length === 0) {
      toast.error('Could not detect any contacts from pasted text.');
      return;
    }
    setExcelRecipients((prev) => [...prev, ...parsed]);
    setPasteText('');
    setIsPasting(false);
    toast.success(`Added ${parsed.length} contacts from pasted text.`);
  };

  // Remove recipient from Excel list
  const handleRemoveExcelRecipient = (id: string) => {
    setExcelRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  // Generate Personalized WhatsApp Message for any recipient
  const getPersonalizedMessage = (recipientName?: string) => {
    if (!activeCoupon) return '';
    return formatCouponWhatsAppMessage({
      coupon: activeCoupon,
      storeName: settings?.companyName || 'InvoicePro Store',
      customerName: recipientName?.trim() || undefined,
      customNote: customNote.trim() || undefined,
      templateId: selectedTemplateId,
    });
  };

  // Live Preview Message (using current context)
  const currentPreviewMessage = useMemo(() => {
    const sampleName =
      audienceMode === 'single'
        ? singleName
        : audienceMode === 'customers'
        ? customers.find((c) => c.id && selectedCustomerIds.has(c.id))?.name || 'Rahul Sharma'
        : excelRecipients[0]?.name || 'Rahul Sharma';

    return getPersonalizedMessage(sampleName);
  }, [activeCoupon, settings, singleName, selectedTemplateId, customNote, audienceMode, selectedCustomerIds, customers, excelRecipients]);

  // Execute Single Send
  const handleSendSingleWhatsApp = () => {
    if (!activeCoupon) return;
    const msg = getPersonalizedMessage(singleName);
    const url = getWhatsAppShareUrl(singlePhone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('WhatsApp opened! Ready to send promotional voucher.');
  };

  // Copy Single WhatsApp Message
  const handleCopySingleMessage = () => {
    navigator.clipboard.writeText(currentPreviewMessage);
    setCopiedMsg(true);
    toast.success('Message template copied to clipboard!');
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  // Build Queue for Multiple Recipients & Switch to Queue Stage
  const handleLaunchQueue = () => {
    if (!activeCoupon) {
      toast.error('Please select an active coupon first.');
      return;
    }

    let recipientsToQueue: BroadcastRecipient[] = [];

    if (audienceMode === 'customers') {
      const selected = customers.filter((c) => c.id && selectedCustomerIds.has(c.id));
      if (selected.length === 0) {
        toast.error('Please select at least 1 customer from the list.');
        return;
      }
      recipientsToQueue = selected.map((c) => {
        const { cleanNumber, isValid, displayFormatted } = sanitizePhoneNumber(c.phone);
        return {
          id: `cust-${c.id}`,
          name: c.name,
          phone: cleanNumber,
          displayPhone: isValid ? displayFormatted : (c.phone || 'No Phone'),
          isValidPhone: isValid,
          source: 'customer',
          status: 'pending',
          city: c.city,
        };
      });
    } else if (audienceMode === 'excel') {
      if (excelRecipients.length === 0) {
        toast.error('Please import an Excel file or paste contacts first.');
        return;
      }
      recipientsToQueue = [...excelRecipients];
    }

    if (recipientsToQueue.length === 0) {
      toast.error('No recipients found to dispatch.');
      return;
    }

    setQueueRecipients(recipientsToQueue);
    setActiveQueueIndex(0);
    setStage('queue');
    toast.success(`Broadcast queue created with ${recipientsToQueue.length} recipients!`);
  };

  // Dispatch Action: Open WhatsApp for Specific Recipient
  const handleDispatchRecipient = (idx: number) => {
    const r = queueRecipients[idx];
    if (!r) return;

    const msg = getPersonalizedMessage(r.name);
    const url = getWhatsAppShareUrl(r.phone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');

    // Update status to 'sent'
    setQueueRecipients((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'sent', sentAt: Date.now() };
      return updated;
    });

    // Advance queue cursor to next pending
    const nextPendingIdx = queueRecipients.findIndex((rec, i) => i > idx && rec.status === 'pending');
    if (nextPendingIdx !== -1) {
      setActiveQueueIndex(nextPendingIdx);
    } else {
      // Loop or find any remaining pending
      const anyPending = queueRecipients.findIndex((rec) => rec.status === 'pending' && rec.id !== r.id);
      if (anyPending !== -1) setActiveQueueIndex(anyPending);
    }

    toast.success(`WhatsApp opened for ${r.name}! Marked as sent.`);
  };

  // Skip Recipient in Queue
  const handleSkipRecipient = (idx: number) => {
    const r = queueRecipients[idx];
    if (!r) return;

    setQueueRecipients((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'skipped' };
      return updated;
    });

    // Advance cursor to next pending
    const nextPendingIdx = queueRecipients.findIndex((rec, i) => i > idx && rec.status === 'pending');
    if (nextPendingIdx !== -1) {
      setActiveQueueIndex(nextPendingIdx);
    } else {
      const anyPending = queueRecipients.findIndex((rec) => rec.status === 'pending');
      if (anyPending !== -1) setActiveQueueIndex(anyPending);
    }

    toast.info(`Skipped ${r.name}.`);
  };

  // Mark Recipient as Sent Manually
  const handleMarkSentManually = (idx: number) => {
    setQueueRecipients((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'sent', sentAt: Date.now() };
      return updated;
    });
    toast.success('Marked as sent.');
  };

  // Reset Queue
  const handleResetQueue = () => {
    setQueueRecipients((prev) =>
      prev.map((r) => ({ ...r, status: 'pending', sentAt: undefined }))
    );
    setActiveQueueIndex(0);
    toast.info('Broadcast queue reset back to initial state.');
  };

  // Copy All Queue Numbers
  const handleCopyAllNumbers = () => {
    const numbers = queueRecipients
      .filter((r) => r.isValidPhone)
      .map((r) => r.phone)
      .join(', ');

    if (!numbers) {
      toast.error('No valid phone numbers in queue.');
      return;
    }

    navigator.clipboard.writeText(numbers);
    setCopiedNumbers(true);
    toast.success(`Copied ${queueRecipients.length} phone numbers to clipboard!`);
    setTimeout(() => setCopiedNumbers(false), 2000);
  };

  // Export Campaign Report
  const handleExportCampaignReport = () => {
    if (!activeCoupon) return;
    exportBroadcastAuditReport(queueRecipients, activeCoupon.code, settings?.companyName);
    toast.success('Campaign broadcast audit report downloaded.');
  };

  // Queue Statistics
  const queueStats = useMemo(() => {
    const total = queueRecipients.length;
    const sent = queueRecipients.filter((r) => r.status === 'sent').length;
    const skipped = queueRecipients.filter((r) => r.status === 'skipped').length;
    const pending = queueRecipients.filter((r) => r.status === 'pending').length;
    const progressPct = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, skipped, pending, progressPct };
  }, [queueRecipients]);

  const activeRecipient = queueRecipients[activeQueueIndex] || null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header Strip */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#25D366]/15 text-[#25D366]">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    WhatsApp Promo & Broadcast Automation
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Dispatch personalized promotional vouchers to 1 customer or broadcast in bulk via Customer Directory or Excel import.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Coupon Selector Badge / Switcher */}
            {couponsList.length > 0 && (
              <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-xs shrink-0">
                <span className="text-[11px] font-bold text-muted-foreground px-1">Coupon:</span>
                {coupon ? (
                  <Badge className="font-mono text-xs font-black bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                    {coupon.code} (
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}% OFF`
                      : `₹${coupon.discountValue} OFF`}
                    )
                  </Badge>
                ) : (
                  <Select
                    value={activeCoupon?.code}
                    onValueChange={(val) => {
                      const found = couponsList.find((c) => c.code === val);
                      if (found && onCouponChange) onCouponChange(found);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs font-mono font-bold w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {couponsList.map((c) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.code} ({c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Modal Body: Stage 1 (Setup) vs Stage 2 (Dispatch Queue) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {stage === 'setup' ? (
            /* ========================================================= */
            /* STAGE 1: AUDIENCE TARGETING & MESSAGE CONFIGURATION       */
            /* ========================================================= */
            <div className="space-y-6">
              {/* Audience Mode Switcher */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Step 1: Choose Target Audience & Method
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {audienceMode === 'single'
                      ? 'Targeting 1 Customer'
                      : audienceMode === 'customers'
                      ? `${selectedCustomerIds.size} Customers Selected`
                      : `${excelRecipients.length} Imported Contacts`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Mode 1: Single Recipient */}
                  <button
                    type="button"
                    onClick={() => setAudienceMode('single')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      audienceMode === 'single'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                        : 'border-border/70 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        audienceMode === 'single' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Single Customer</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Send to 1 specific customer or custom number
                      </div>
                    </div>
                  </button>

                  {/* Mode 2: Multi-select from Customers Directory */}
                  <button
                    type="button"
                    onClick={() => setAudienceMode('customers')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      audienceMode === 'customers'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                        : 'border-border/70 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        audienceMode === 'customers' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        Customer Book
                        {selectedCustomerIds.size > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                            {selectedCustomerIds.size}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Select multiple saved clients from directory
                      </div>
                    </div>
                  </button>

                  {/* Mode 3: Import Excel / CSV */}
                  <button
                    type="button"
                    onClick={() => setAudienceMode('excel')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      audienceMode === 'excel'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                        : 'border-border/70 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        audienceMode === 'excel' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        Import Excel / CSV
                        {excelRecipients.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                            {excelRecipients.length}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Upload spreadsheet or paste phone numbers
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mode Specific Audience Selection Views */}
              <div className="p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs space-y-4">
                {/* 1. SINGLE CUSTOMER VIEW */}
                {audienceMode === 'single' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Pick From Saved Customers</Label>
                        <Select value={singleCustomerId} onValueChange={handleSingleCustomerChange}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select a customer..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">-- Custom / Walk-in Recipient --</SelectItem>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name} {c.phone ? `(${c.phone})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">WhatsApp Phone Number</Label>
                        <Input
                          value={singlePhone}
                          onChange={(e) => setSinglePhone(e.target.value)}
                          placeholder="e.g. 9876543210 (10 digits)"
                          className="text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Recipient Customer Name (for Greeting)</Label>
                      <Input
                        value={singleName}
                        onChange={(e) => setSingleName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 2. CUSTOMER DIRECTORY MULTI-SELECT VIEW */}
                {audienceMode === 'customers' && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search customer by name, mobile, city..."
                          className="text-xs pl-8 h-8"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllFilteredCustomers}
                          className="h-8 text-xs gap-1.5 font-semibold"
                        >
                          <CheckSquare className="h-3.5 w-3.5 text-primary" />
                          {filteredCustomers.every((c) => c.id && selectedCustomerIds.has(c.id))
                            ? 'Deselect All'
                            : `Select All (${filteredCustomers.length})`}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomerIds(new Set())}
                          disabled={selectedCustomerIds.size === 0}
                          className="h-8 text-xs text-muted-foreground"
                        >
                          Clear ({selectedCustomerIds.size})
                        </Button>
                      </div>
                    </div>

                    {/* Scrollable Customer Table */}
                    <div className="border border-border/60 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-background/50">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                          No matching customers found.
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold sticky top-0 border-b border-border/40">
                            <tr>
                              <th className="p-2.5 text-left w-10">Select</th>
                              <th className="p-2.5 text-left">Customer Name</th>
                              <th className="p-2.5 text-left">WhatsApp Phone</th>
                              <th className="p-2.5 text-left">Location</th>
                              <th className="p-2.5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {filteredCustomers.map((cust) => {
                              const isSelected = cust.id ? selectedCustomerIds.has(cust.id) : false;
                              const hasValidPhone = cust.phone && cust.phone.replace(/[^0-9]/g, '').length >= 10;

                              return (
                                <tr
                                  key={cust.id}
                                  onClick={() => cust.id && hasValidPhone && handleToggleCustomerSelect(cust.id)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary/10 hover:bg-primary/15'
                                      : !hasValidPhone
                                      ? 'opacity-50 cursor-not-allowed bg-muted/10'
                                      : 'hover:bg-muted/30'
                                  }`}
                                >
                                  <td className="p-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={!hasValidPhone}
                                      onChange={() => cust.id && handleToggleCustomerSelect(cust.id)}
                                      className="rounded border-border text-primary h-3.5 w-3.5 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-2.5 font-bold text-foreground">{cust.name}</td>
                                  <td className="p-2.5 font-mono text-muted-foreground">
                                    {cust.phone ? (
                                      cust.phone
                                    ) : (
                                      <span className="text-destructive font-sans">No Phone</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-muted-foreground">{cust.city || '—'}</td>
                                  <td className="p-2.5 text-right">
                                    {hasValidPhone ? (
                                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/5">
                                        Ready
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/20 bg-rose-500/5">
                                        Missing Phone
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. EXCEL / CSV IMPORT VIEW */}
                {audienceMode === 'excel' && (
                  <div className="space-y-4">
                    {/* Action Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".xlsx,.xls,.csv"
                          onChange={handleExcelFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 text-xs gap-1.5 font-semibold bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload Excel / CSV File
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPasting(!isPasting)}
                          className="h-8 text-xs gap-1.5 font-semibold"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {isPasting ? 'Close Quick Paste' : 'Quick Paste Numbers'}
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={downloadBroadcastExcelTemplate}
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-500" />
                        Download Sample Excel Template
                      </Button>
                    </div>

                    {/* Quick Paste Area */}
                    {isPasting && (
                      <div className="p-3 border border-border/80 rounded-xl bg-muted/20 space-y-2">
                        <Label className="text-xs font-bold">Paste contacts (Format: Name, Phone per line):</Label>
                        <textarea
                          rows={3}
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          placeholder="Rahul Sharma, 9876543210&#10;Priya Patel, 9823456781&#10;9711223344"
                          className="w-full text-xs font-mono p-2 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={handleParsePastedContacts}
                            className="h-7 text-xs font-bold"
                          >
                            Parse & Add to List
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Imported Preview Table */}
                    {excelRecipients.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            Parsed Contacts ({excelRecipients.length} total •{' '}
                            {excelRecipients.filter((r) => r.isValidPhone).length} valid numbers)
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExcelRecipients([])}
                            className="h-6 text-[11px] text-destructive hover:text-destructive"
                          >
                            Clear List
                          </Button>
                        </div>

                        <div className="border border-border/60 rounded-xl overflow-hidden max-h-[180px] overflow-y-auto bg-background/50">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold sticky top-0 border-b border-border/40">
                              <tr>
                                <th className="p-2 text-left">#</th>
                                <th className="p-2 text-left">Name</th>
                                <th className="p-2 text-left">WhatsApp Phone</th>
                                <th className="p-2 text-left">City / Note</th>
                                <th className="p-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {excelRecipients.map((rec, idx) => (
                                <tr key={rec.id} className="hover:bg-muted/30">
                                  <td className="p-2 font-mono text-muted-foreground">{idx + 1}</td>
                                  <td className="p-2 font-semibold text-foreground">{rec.name}</td>
                                  <td className="p-2 font-mono">
                                    {rec.isValidPhone ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                        {rec.displayPhone}
                                      </span>
                                    ) : (
                                      <span className="text-rose-500 font-sans font-bold flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> {rec.displayPhone}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-muted-foreground">{rec.city || rec.notes || '—'}</td>
                                  <td className="p-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExcelRecipient(rec.id)}
                                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center space-y-2">
                        <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto" />
                        <div className="text-xs font-bold text-foreground">
                          Upload an Excel or CSV file with Name and Phone columns
                        </div>
                        <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                          Supports columns like: <code>Name</code>, <code>Phone / Mobile</code>, <code>City</code>, and{' '}
                          <code>Notes</code>. We auto-detect Indian 10-digit mobile numbers.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Promotional Message Template & Live Preview */}
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Step 2: Message Template & Personalization
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Select Template</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUPON_TEMPLATES.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Custom Store Remark / Extra Note (Optional)</Label>
                    <Input
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="e.g. Valid only on new smartphone purchases"
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Live WhatsApp Bubble Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Live WhatsApp Preview ({audienceMode === 'single' ? 'Single Recipient' : 'Dynamic Per Customer'}):
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopySingleMessage}
                      className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {copiedMsg ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copiedMsg ? 'Copied' : 'Copy Message'}
                    </Button>
                  </div>

                  <div className="bg-[#EFEAE2] dark:bg-slate-900/90 rounded-2xl p-4 border border-border shadow-inner font-sans">
                    <div className="max-w-[92%] bg-white dark:bg-[#1f2c34] text-slate-800 dark:text-slate-100 p-3.5 rounded-xl rounded-tl-xs shadow-xs text-xs whitespace-pre-wrap leading-relaxed border border-emerald-500/20">
                      {currentPreviewMessage}
                      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-400">
                        <span>Just now</span>
                        <span className="text-[#53bdeb]">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* STAGE 2: BROADCAST QUEUE & INTERACTIVE EXECUTION RUNNER   */
            /* ========================================================= */
            <div className="space-y-5">
              {/* Top Navigation & KPI Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStage('setup')}
                  className="gap-1.5 text-xs font-semibold self-start"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Audience Setup
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAllNumbers}
                    className="h-8 text-xs gap-1.5 font-semibold"
                  >
                    <Copy className="h-3.5 w-3.5 text-primary" />
                    {copiedNumbers ? 'Copied!' : 'Copy All Numbers'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportCampaignReport}
                    className="h-8 text-xs gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Audit Report
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetQueue}
                    title="Restart broadcast queue from beginning"
                    className="h-8 text-xs text-muted-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/70 bg-card">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Queue</div>
                  <div className="text-xl font-black font-mono text-foreground mt-0.5">{queueStats.total}</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">Sent Successfully</div>
                  <div className="text-xl font-black font-mono mt-0.5">{queueStats.sent}</div>
                </div>
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">Pending In Queue</div>
                  <div className="text-xl font-black font-mono mt-0.5">{queueStats.pending}</div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-card">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Skipped</div>
                  <div className="text-xl font-black font-mono text-muted-foreground mt-0.5">{queueStats.skipped}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Broadcast Progress</span>
                  <span className="font-mono text-foreground font-bold">{queueStats.progressPct}% Complete</span>
                </div>
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 to-[#25D366] transition-all duration-300"
                    style={{ width: `${queueStats.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Up Next Focus Card (One-Click Auto-Advancer) */}
              {activeRecipient ? (
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-linear-to-br from-emerald-500/10 via-card to-card shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                        {activeRecipient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Play className="h-3 w-3 fill-current" /> Up Next to Send ({activeQueueIndex + 1} of{' '}
                          {queueRecipients.length})
                        </div>
                        <div className="text-base font-extrabold text-foreground flex items-center gap-2">
                          {activeRecipient.name}
                          <span className="text-xs font-mono font-normal text-muted-foreground">
                            ({activeRecipient.displayPhone})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSkipRecipient(activeQueueIndex)}
                        className="h-9 text-xs gap-1 font-semibold"
                      >
                        <FastForward className="h-3.5 w-3.5 text-muted-foreground" /> Skip
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkSentManually(activeQueueIndex)}
                        className="h-9 text-xs gap-1 font-semibold text-emerald-600"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark Sent
                      </Button>
                      <Button
                        type="button"
                        className="h-9 font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs gap-2 px-4"
                        onClick={() => handleDispatchRecipient(activeQueueIndex)}
                      >
                        <Send className="h-4 w-4" /> Open WhatsApp & Next
                      </Button>
                    </div>
                  </div>

                  {/* Snippet preview */}
                  <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40 truncate">
                    <strong>Message Preview:</strong> {getPersonalizedMessage(activeRecipient.name).replace(/\n/g, ' ')}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <div className="text-sm font-bold text-foreground">
                    All Recipients In Queue Have Been Dispatched! 🎉
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You have successfully completed this WhatsApp broadcast campaign for voucher{' '}
                    <strong>{activeCoupon?.code}</strong>.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportCampaignReport}
                    className="mt-2 text-xs font-bold gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Campaign Summary
                  </Button>
                </div>
              )}

              {/* Full Queue Table with Row-Level Actions */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recipients Broadcast Roster ({queueRecipients.length})
                </Label>

                <div className="border border-border/60 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto bg-background/50">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold sticky top-0 border-b border-border/40">
                      <tr>
                        <th className="p-2.5 text-left w-10">#</th>
                        <th className="p-2.5 text-left">Status</th>
                        <th className="p-2.5 text-left">Customer Name</th>
                        <th className="p-2.5 text-left">Phone Number</th>
                        <th className="p-2.5 text-left">Source</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {queueRecipients.map((rec, idx) => {
                        const isActive = idx === activeQueueIndex;

                        return (
                          <tr
                            key={rec.id}
                            className={`transition-colors ${
                              isActive
                                ? 'bg-primary/10'
                                : rec.status === 'sent'
                                ? 'bg-emerald-500/5'
                                : rec.status === 'skipped'
                                ? 'opacity-60 bg-muted/20'
                                : 'hover:bg-muted/30'
                            }`}
                          >
                            <td className="p-2.5 font-mono text-muted-foreground">{idx + 1}</td>
                            <td className="p-2.5">
                              {rec.status === 'sent' ? (
                                <Badge className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  ✓ Sent
                                </Badge>
                              ) : rec.status === 'skipped' ? (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  Skipped
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] font-mono">
                                  Pending
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 font-bold text-foreground">
                              {rec.name}
                              {isActive && (
                                <span className="ml-1.5 text-[10px] text-primary font-normal">◀ Current</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-muted-foreground">{rec.displayPhone}</td>
                            <td className="p-2.5 text-muted-foreground text-[11px]">
                              {rec.source === 'customer' ? 'Customer Book' : 'Excel Import'}
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDispatchRecipient(idx)}
                                  className="h-7 px-2 text-xs text-[#25D366] hover:text-[#1EBE5D] hover:bg-[#25D366]/10 gap-1 font-semibold"
                                >
                                  <Send className="h-3 w-3" /> Send
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>

          {stage === 'setup' ? (
            <div className="flex items-center gap-2">
              {audienceMode === 'single' ? (
                <Button
                  type="button"
                  className="gap-2 font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs"
                  onClick={handleSendSingleWhatsApp}
                >
                  <Send className="h-4 w-4" /> Send on WhatsApp
                </Button>
              ) : (
                <Button
                  type="button"
                  className="gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                  onClick={handleLaunchQueue}
                >
                  <ArrowRight className="h-4 w-4" />
                  Proceed to Broadcast Queue (
                  {audienceMode === 'customers' ? selectedCustomerIds.size : excelRecipients.length} Recipients)
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCampaignReport}
                className="text-xs font-semibold"
              >
                Download Audit Excel
              </Button>
              <Button
                type="button"
                className="gap-2 font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs"
                onClick={() => activeRecipient && handleDispatchRecipient(activeQueueIndex)}
                disabled={!activeRecipient}
              >
                <Send className="h-4 w-4" /> Next Recipient on WhatsApp
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
