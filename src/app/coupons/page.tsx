'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Coupon, Customer } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  COUPON_TEMPLATES,
  formatCouponWhatsAppMessage,
  getWhatsAppShareUrl,
  generateRandomCouponCode,
} from '@/lib/couponAutomation';
import { CouponWhatsAppBroadcastModal } from '@/components/coupons/CouponWhatsAppBroadcastModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Ticket,
  Plus,
  Search,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Send,
  MessageSquare,
  Trash2,
  Edit2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Users,
  CheckCircle2,
  Percent,
  IndianRupee,
  RefreshCw,
  Gift,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CouponsPage() {
  const coupons = useLiveQuery(() => db.coupons.toArray()) ?? [];
  const customers = useLiveQuery(() => db.customers.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'amount'>('all');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderValue, setMinOrderValue] = useState<number>(500);
  const [maxDiscount, setMaxDiscount] = useState<number | undefined>(250);
  const [expiryDateString, setExpiryDateString] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [usageLimit, setUsageLimit] = useState<number | undefined>(100);
  const [isActive, setIsActive] = useState<boolean>(true);

  // WhatsApp Automation Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedCouponForShare, setSelectedCouponForShare] = useState<Coupon | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  // Open Create Dialog
  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode(generateRandomCouponCode('SAVE'));
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setMinOrderValue(500);
    setMaxDiscount(250);
    setExpiryDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setUsageLimit(100);
    setIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDescription(coupon.description || '');
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue);
    setMinOrderValue(coupon.minOrderValue || 0);
    setMaxDiscount(coupon.maxDiscount);
    setExpiryDateString(new Date(coupon.expiryDate).toISOString().slice(0, 10));
    setUsageLimit(coupon.usageLimit);
    setIsActive(coupon.isActive);
    setIsModalOpen(true);
  };

  // Quick Days Adder for Expiry
  const handleSetQuickExpiry = (days: number) => {
    const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setExpiryDateString(target.toISOString().slice(0, 10));
  };

  // Save Coupon (Create or Update)
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error('Coupon code is required.');
      return;
    }

    if (discountValue <= 0) {
      toast.error('Discount value must be greater than zero.');
      return;
    }

    if (discountType === 'percentage' && discountValue > 100) {
      toast.error('Percentage discount cannot exceed 100%.');
      return;
    }

    const expiryTimestamp = new Date(expiryDateString).getTime() + (23 * 60 + 59) * 60 * 1000;
    if (isNaN(expiryTimestamp)) {
      toast.error('Invalid expiry date.');
      return;
    }

    // Check code uniqueness
    const existing = coupons.find(
      c => c && c.code && c.code.toLowerCase() === trimmedCode.toLowerCase() && c.id !== editingCoupon?.id
    );
    if (existing) {
      toast.error(`A coupon with code "${trimmedCode}" already exists.`);
      return;
    }

    const couponPayload: Omit<Coupon, 'id'> = {
      code: trimmedCode,
      description: description.trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscount: discountType === 'percentage' && maxDiscount ? Number(maxDiscount) : undefined,
      expiryDate: expiryTimestamp,
      usageLimit: usageLimit && usageLimit > 0 ? Number(usageLimit) : undefined,
      timesUsed: editingCoupon ? editingCoupon.timesUsed : 0,
      isActive,
      createdAt: editingCoupon ? editingCoupon.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (editingCoupon && editingCoupon.id) {
        await db.coupons.update(editingCoupon.id, couponPayload);
        toast.success(`Coupon "${trimmedCode}" updated successfully.`);
      } else {
        await db.coupons.add(couponPayload as Coupon);
        toast.success(`Coupon "${trimmedCode}" created successfully.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save coupon.');
    }
  };

  // Toggle Active State
  const handleToggleActive = async (coupon: Coupon) => {
    if (!coupon.id) return;
    try {
      await db.coupons.update(coupon.id, {
        isActive: !coupon.isActive,
        updatedAt: Date.now(),
      });
      toast.success(
        `Coupon "${coupon.code}" is now ${!coupon.isActive ? 'active' : 'disabled'}.`
      );
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!coupon.id) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`);
    if (!confirmDelete) return;

    try {
      await db.coupons.delete(coupon.id);
      toast.success(`Coupon "${coupon.code}" deleted.`);
    } catch (err) {
      toast.error('Failed to delete coupon.');
    }
  };

  // Copy Code to Clipboard
  const handleCopyCode = (coupon: Coupon) => {
    navigator.clipboard.writeText(coupon.code);
    setCopiedCodeId(coupon.id || null);
    toast.success(`Copied code "${coupon.code}" to clipboard!`);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Open WhatsApp Share / Broadcast Modal
  const handleOpenWhatsAppModal = (coupon?: Coupon) => {
    setSelectedCouponForShare(coupon || (coupons.length > 0 ? coupons[0] : null));
    setIsWhatsAppModalOpen(true);
  };

  // KPI Calculations
  const now = Date.now();
  const kpis = useMemo(() => {
    const validCoupons = coupons.filter(c => c && c.code);
    const total = validCoupons.length;
    const active = validCoupons.filter(c => c.isActive && c.expiryDate && c.expiryDate >= now).length;
    const expired = validCoupons.filter(c => c.expiryDate && c.expiryDate < now).length;
    const totalRedemptions = validCoupons.reduce((sum, c) => sum + (c.timesUsed || 0), 0);
    return { total, active, expired, totalRedemptions };
  }, [coupons, now]);

  // Filtered Coupons
  const filteredCoupons = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return coupons.filter(coupon => {
      if (!coupon || !coupon.code) return false;

      // Search
      const codeStr = (coupon.code || '').toLowerCase();
      const descStr = (coupon.description || '').toLowerCase();
      const matchesSearch = !q || codeStr.includes(q) || descStr.includes(q);

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === 'active') {
        if (!coupon.isActive || (coupon.expiryDate && coupon.expiryDate < now)) return false;
      } else if (statusFilter === 'expired') {
        if (!coupon.expiryDate || coupon.expiryDate >= now) return false;
      }

      // Type Filter
      if (typeFilter !== 'all' && coupon.discountType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [coupons, searchQuery, statusFilter, typeFilter, now]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Ticket className="h-6 w-6" />
              </span>
              Coupons & Promotional Offers
            </h1>
            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
              {coupons.length} Vouchers
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Create discount promo codes with expiry limits, configure rules, and broadcast vouchers directly to customers via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {coupons.length > 0 && (
            <Button
              variant="outline"
              className="gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold"
              onClick={() => handleOpenWhatsAppModal(coupons[0])}
            >
              <Send className="h-4 w-4" />
              WhatsApp Broadcast Campaign
            </Button>
          )}
          <Button onClick={handleOpenCreateModal} className="gap-2 font-bold shadow-xs">
            <Plus className="h-4 w-4" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-linear-to-br from-card to-muted/20 border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Coupons</p>
              <h3 className="text-2xl font-black mt-0.5">{kpis.total}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">All campaigns</p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Active & Redeemable</p>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                {kpis.active}
              </h3>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Ready for billing</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Expired Vouchers</p>
              <h3 className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
                {kpis.expired}
              </h3>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Need validity renewal</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Total Redemptions</p>
              <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-0.5">
                {kpis.totalRedemptions}
              </h3>
              <p className="text-[11px] text-blue-600/80 mt-0.5">Used across invoices</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Gift className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({coupons.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'active'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active ({kpis.active})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'expired'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Expired ({kpis.expired})
            </button>
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue placeholder="Discount Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="amount">Flat Amount (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Coupons List / Grid */}
      {filteredCoupons.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Ticket className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">No coupon codes found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            {searchQuery
              ? `No coupons match "${searchQuery}". Try adjusting your search query.`
              : 'Create your first discount coupon to start offering promotional incentives to customers.'}
          </p>
          <Button onClick={handleOpenCreateModal} className="gap-2 font-bold shadow-xs">
            <Plus className="h-4 w-4" />
            Create First Coupon
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map(coupon => {
            const isExpired = coupon.expiryDate < now;
            const daysLeft = Math.ceil((coupon.expiryDate - now) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = !isExpired && daysLeft <= 7;
            const usagePercent =
              coupon.usageLimit && coupon.usageLimit > 0
                ? Math.min(100, Math.round((coupon.timesUsed / coupon.usageLimit) * 100))
                : 0;

            return (
              <div
                key={coupon.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden group hover:shadow-md ${
                  !coupon.isActive
                    ? 'bg-muted/30 border-muted opacity-75'
                    : isExpired
                    ? 'bg-card border-red-200 dark:border-red-900/40'
                    : 'bg-card border-border hover:border-primary/50'
                }`}
              >
                {/* Perforated Ticket Top Header */}
                <div className="p-4 pb-3 border-b border-dashed border-border/80 bg-muted/20">
                  <div className="flex items-start justify-between gap-2">
                    {/* Discount badge */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1 rounded-lg font-black text-xs flex items-center gap-1 shadow-xs ${
                          coupon.discountType === 'percentage'
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {coupon.discountType === 'percentage' ? (
                          <>
                            <Percent className="h-3 w-3" />
                            {coupon.discountValue}% OFF
                          </>
                        ) : (
                          <>
                            <IndianRupee className="h-3 w-3" />
                            FLAT {coupon.discountValue} OFF
                          </>
                        )}
                      </div>

                      {/* Status Badges */}
                      {!coupon.isActive ? (
                        <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Disabled
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Expired
                        </Badge>
                      ) : isExpiringSoon ? (
                        <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                          Expires in {daysLeft}d
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                          Active
                        </Badge>
                      )}
                    </div>

                    {/* Actions menu */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Edit Coupon"
                        onClick={() => handleOpenEditModal(coupon)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete Coupon"
                        onClick={() => handleDeleteCoupon(coupon)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Coupon Code Big Box with 1-click Copy */}
                  <div className="mt-3 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-background border border-dashed border-primary/40 font-mono">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-black text-sm tracking-widest text-primary">
                        {coupon.code}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs font-semibold gap-1 bg-muted/40 hover:bg-primary hover:text-white transition-colors"
                      onClick={() => handleCopyCode(coupon)}
                    >
                      {copiedCodeId === coupon.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Voucher Body & Rules */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground font-medium line-clamp-2">
                        {coupon.description}
                      </p>
                    )}

                    <div className="space-y-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Min Order Value:</span>
                        <span className="font-semibold text-foreground">
                          {coupon.minOrderValue > 0 ? formatCurrency(coupon.minOrderValue) : 'No Minimum'}
                        </span>
                      </div>

                      {coupon.discountType === 'percentage' && coupon.maxDiscount && (
                        <div className="flex items-center justify-between">
                          <span>Max Discount Cap:</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(coupon.maxDiscount)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span>Valid Until:</span>
                        <span className={`font-semibold ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                          {formatDate(coupon.expiryDate)}
                        </span>
                      </div>

                      {/* Usage counter */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span>Redemptions:</span>
                          <span className="font-mono font-bold text-foreground">
                            {coupon.timesUsed} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : 'used'}
                          </span>
                        </div>
                        {coupon.usageLimit && coupon.usageLimit > 0 && (
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                usagePercent >= 100
                                  ? 'bg-destructive'
                                  : usagePercent > 75
                                  ? 'bg-amber-500'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coupon)}
                      className={`text-[11px] font-semibold underline-offset-4 hover:underline ${
                        coupon.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {coupon.isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    {/* WhatsApp Promotional Send Button */}
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs"
                      onClick={() => handleOpenWhatsAppModal(coupon)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send via WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT COUPON MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              {editingCoupon ? 'Edit Coupon Code' : 'Create New Coupon'}
            </DialogTitle>
            <DialogDescription>
              Set up discount parameters, minimum order requirements, and expiry limits for this promotional code.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCoupon} className="space-y-4 py-2">
            {/* Code & Random Generator */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Coupon Code</Label>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE20"
                  className="font-mono font-bold uppercase tracking-wider text-sm"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCode(generateRandomCouponCode('OFFER'))}
                  title="Generate Random Code"
                  className="gap-1 text-xs shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Random
                </Button>
              </div>
            </div>

            {/* Campaign Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description / Campaign Purpose</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Festival clearance sale for regular customers"
                className="text-xs"
              />
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Discount Type</Label>
                <Select
                  value={discountType}
                  onValueChange={(val: 'percentage' | 'amount') => setDiscountType(val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="amount">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Discount Value {discountType === 'percentage' ? '(%)' : '(₹)'}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={discountType === 'percentage' ? '100' : undefined}
                  value={discountValue}
                  onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* Min Order & Max Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Min Order Value (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={minOrderValue}
                  onChange={e => setMinOrderValue(parseFloat(e.target.value) || 0)}
                  placeholder="0 for none"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Max Discount Cap (₹)
                  {discountType !== 'percentage' && (
                    <span className="text-[10px] text-muted-foreground ml-1">(N/A for flat)</span>
                  )}
                </Label>
                <Input
                  type="number"
                  min="0"
                  disabled={discountType !== 'percentage'}
                  value={maxDiscount ?? ''}
                  onChange={e =>
                    setMaxDiscount(e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="Optional cap"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Expiry Date & Quick Shortcuts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Expiry Date
                </Label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleSetQuickExpiry(7)}
                    className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-foreground"
                  >
                    +7d
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickExpiry(15)}
                    className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-foreground"
                  >
                    +15d
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickExpiry(30)}
                    className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-foreground"
                  >
                    +30d
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickExpiry(60)}
                    className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-foreground"
                  >
                    +60d
                  </button>
                </div>
              </div>
              <Input
                type="date"
                value={expiryDateString}
                onChange={e => setExpiryDateString(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            {/* Usage Limit & Active toggle */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Usage Limit (Redemptions)</Label>
                <Input
                  type="number"
                  min="1"
                  value={usageLimit ?? ''}
                  onChange={e =>
                    setUsageLimit(e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                  placeholder="Unlimited if empty"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status</Label>
                <div className="flex items-center h-9">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="rounded border-border text-primary h-4 w-4"
                    />
                    Enable this coupon
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-bold">
                {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* WHATSAPP BROADCAST AUTOMATION MODAL */}
      <CouponWhatsAppBroadcastModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        coupon={selectedCouponForShare}
        couponsList={coupons.filter(c => c && c.code)}
        customers={customers}
        settings={settings}
        onCouponChange={(c) => setSelectedCouponForShare(c)}
      />
    </div>
  );
}
