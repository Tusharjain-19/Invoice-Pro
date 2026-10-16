'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CalendarClock,
  Send,
  PhoneCall,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MoreVertical,
  X,
  CreditCard,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateWhatsAppEmiMessage, openWhatsAppEmiReminder } from '@/lib/emiAutomation';
import { WhatsAppIcon } from '@/components/shared/WhatsAppIcon';
import { db } from '@/db';
import type { Loan, LoanInstallment, AppSettings } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';

export interface DueEmiItem {
  installmentId: number;
  loanId: number;
  loanNumber: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  installmentNo: number;
  amount: number;
  dueDate: number;
  isToday: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  status: 'pending' | 'paid' | 'overdue' | 'disputed' | 'rescheduled';
}

interface TodayEmiCollectionsCardProps {
  items: DueEmiItem[];
  settings?: AppSettings | null;
  onRefresh?: () => void;
  onRemove?: () => void;
}

export function TodayEmiCollectionsCard({
  items,
  settings,
  onRefresh,
  onRemove,
}: TodayEmiCollectionsCardProps) {
  // Modal states
  const [activeItem, setActiveItem] = useState<DueEmiItem | null>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  // Collect form state
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMode, setCollectMode] = useState<string>('UPI');
  const [collectRef, setCollectRef] = useState<string>('');

  // Reschedule form state
  const [rescheduleDays, setRescheduleDays] = useState<string>('7');

  // Dispute form state
  const [disputeReason, setDisputeReason] = useState<string>('Customer raised product defect/warranty claim');

  // Statistics
  const todayDueItems = items.filter((i) => i.isToday);
  const overdueItems = items.filter((i) => i.isOverdue);
  const totalTodayAmount = todayDueItems.reduce((s, i) => s + i.amount, 0);
  const totalOverdueAmount = overdueItems.reduce((s, i) => s + i.amount, 0);

  // 1. Send WhatsApp message
  const handleSendWhatsApp = (item: DueEmiItem) => {
    const message = generateWhatsAppEmiMessage({
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      loanNumber: item.loanNumber,
      installmentNo: item.installmentNo,
      amountDue: item.amount,
      dueDate: item.dueDate,
      isOverdue: item.isOverdue,
      daysOverdue: item.daysOverdue,
      settings,
    });

    openWhatsAppEmiReminder(item.customerPhone, message);
    toast.success(`Opening WhatsApp reminder for ${item.customerName}`);
  };

  // 2. Open quick collect modal
  const handleOpenCollect = (item: DueEmiItem) => {
    setActiveItem(item);
    setCollectAmount(item.amount.toString());
    setIsCollectModalOpen(true);
  };

  // 3. Submit payment
  const handleConfirmCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    const amount = parseFloat(collectAmount) || 0;
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      // 1. Add payment record
      await db.loanPayments.add({
        loanId: activeItem.loanId,
        paymentDate: Date.now(),
        amountPaid: amount,
        paymentMode: collectMode,
        referenceNumber: collectRef || undefined,
        notes: `EMI #${activeItem.installmentNo} collection via Dashboard`,
        receivedBy: 'Billing Counter',
      });

      // 2. Update installment
      await db.loanInstallments.update(activeItem.installmentId, {
        status: 'paid',
        paidDate: Date.now(),
        paymentMethod: collectMode,
        transactionReference: collectRef,
      });

      // 3. Update loan balances
      const loan = await db.loans.get(activeItem.loanId);
      if (loan) {
        const newPaid = loan.paidAmount + amount;
        const newRemaining = Math.max(0, loan.remainingAmount - amount);
        const isDone = newRemaining <= 0;

        const nextPending = await db.loanInstallments
          .where('loanId')
          .equals(activeItem.loanId)
          .and((i) => i.status !== 'paid')
          .sortBy('dueDate');

        const nextDueDate = nextPending[0] ? nextPending[0].dueDate : null;

        await db.loans.update(activeItem.loanId, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          nextDueDate,
          status: isDone ? 'completed' : 'active',
          updatedAt: Date.now(),
        });
      }

      toast.success(`Payment of ${formatCurrency(amount)} recorded!`);
      setIsCollectModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to collect EMI payment:', err);
      toast.error('Failed to record payment');
    }
  };

  // 4. Mark Defective / Disputed
  const handleMarkDisputed = async () => {
    if (!activeItem) return;
    try {
      await db.loanInstallments.update(activeItem.installmentId, {
        status: 'disputed',
        remarks: disputeReason,
        lateFee: 0,
      });

      // Also flag loan
      await db.loans.update(activeItem.loanId, {
        remarks: `Dispute on EMI #${activeItem.installmentNo}: ${disputeReason}`,
        updatedAt: Date.now(),
      });

      toast.success(`EMI #${activeItem.installmentNo} marked as disputed/under review`);
      setIsDisputeModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update dispute status');
    }
  };

  // 5. Reschedule Due Date
  const handleRescheduleDueDate = async () => {
    if (!activeItem) return;
    try {
      const days = parseInt(rescheduleDays, 10) || 7;
      const newDueDate = activeItem.dueDate + days * 24 * 60 * 60 * 1000;

      await db.loanInstallments.update(activeItem.installmentId, {
        dueDate: newDueDate,
        status: 'rescheduled',
        remarks: `Extended by ${days} days upon customer request`,
      });

      await db.loans.update(activeItem.loanId, {
        nextDueDate: newDueDate,
        updatedAt: Date.now(),
      });

      toast.success(`Due date rescheduled by ${days} days to ${formatDate(newDueDate)}`);
      setIsRescheduleModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reschedule due date');
    }
  };

  // 6. Waive Late Fee
  const handleWaiveLateFee = async (item: DueEmiItem) => {
    try {
      await db.loanInstallments.update(item.installmentId, {
        lateFee: 0,
        remarks: 'Late fee waived by merchant',
      });
      toast.success(`Late fee waived for EMI #${item.installmentNo}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to waive late fee');
    }
  };

  return (
    <Card className="border border-border/50 shadow-sm transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CalendarClock className="h-4.5 w-4.5 text-primary" />
              Today's EMI Collections & Overdue Recovery
            </CardTitle>
            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
              {todayDueItems.length} Due Today · {overdueItems.length} Overdue
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground/80">
            Real-time customer installment scheduler with direct 1-click WhatsApp payment reminders
          </CardDescription>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs font-bold text-primary gap-1">
            <Link href="/loans">
              All Loans <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
              title="Remove widget from dashboard"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* KPI Scorecard Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Due Today
            </span>
            <span className="text-base font-extrabold text-foreground font-mono block mt-0.5">
              {formatCurrency(totalTodayAmount)}
            </span>
            <span className="text-[10px] text-muted-foreground">{todayDueItems.length} installments</span>
          </div>

          <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Overdue Dues
            </span>
            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono block mt-0.5">
              {formatCurrency(totalOverdueAmount)}
            </span>
            <span className="text-[10px] text-muted-foreground">{overdueItems.length} late accounts</span>
          </div>

          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              Total Actionable
            </span>
            <span className="text-base font-extrabold text-foreground font-mono block mt-0.5">
              {formatCurrency(totalTodayAmount + totalOverdueAmount)}
            </span>
            <span className="text-[10px] text-muted-foreground">{items.length} accounts total</span>
          </div>

          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              WhatsApp Engine
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-foreground">Automation Active</span>
            </div>
            <span className="text-[10px] text-muted-foreground">UPI pay links enabled</span>
          </div>
        </div>

        {/* Actionable Installments Feed */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-xs font-bold text-foreground">No EMI payments due today or overdue!</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">All customer loan installments are currently cleared.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 rounded-xl border border-border/40 overflow-hidden bg-card">
              {items.slice(0, 6).map((item) => (
                <div key={item.installmentId} className="p-3 flex items-center justify-between hover:bg-muted/15 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.isOverdue
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      #{item.installmentNo}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">{item.customerName}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{item.loanNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          Due: {formatDate(item.dueDate)}
                        </span>
                        {item.isToday && (
                          <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 py-0">
                            Due Today
                          </Badge>
                        )}
                        {item.isOverdue && (
                          <Badge variant="outline" className="text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 py-0">
                            {item.daysOverdue}d Late
                          </Badge>
                        )}
                        {item.status === 'disputed' && (
                          <Badge variant="outline" className="text-[9px] font-bold bg-purple-500/15 text-purple-600 border-purple-500/20 py-0">
                            Disputed / Paused
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right mr-1">
                      <span className="text-sm font-extrabold font-mono text-foreground block">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>

                    {/* 1-Click WhatsApp Reminder */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendWhatsApp(item)}
                      className="h-8 rounded-xl font-bold text-xs gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-2xs"
                      title="Send WhatsApp payment reminder with UPI link"
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>

                    {/* Quick Call */}
                    {item.customerPhone && (
                      <Button
                        size="icon"
                        variant="ghost"
                        asChild
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary"
                        title={`Call ${item.customerPhone}`}
                      >
                        <a href={`tel:${item.customerPhone}`}>
                          <PhoneCall className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}

                    {/* Mark Payment Done / Collect */}
                    <Button
                      size="sm"
                      onClick={() => handleOpenCollect(item)}
                      className="h-8 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Collect</span>
                    </Button>

                    {/* More Multi-option Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs font-semibold">
                        <DropdownMenuItem
                          onClick={() => {
                            setActiveItem(item);
                            setIsDisputeModalOpen(true);
                          }}
                        >
                          <ShieldAlert className="h-3.5 w-3.5 mr-2 text-purple-500" />
                          Mark Defective / Disputed
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setActiveItem(item);
                            setIsRescheduleModalOpen(true);
                          }}
                        >
                          <Clock className="h-3.5 w-3.5 mr-2 text-amber-500" />
                          Reschedule Due Date
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleWaiveLateFee(item)}>
                          <Sparkles className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                          Waive Late Fee
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/loans" className="flex items-center">
                            <CreditCard className="h-3.5 w-3.5 mr-2" />
                            Open Loan Statement
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* ================= MODALS ================= */}

      {/* 1. Collect EMI Payment Modal */}
      <Dialog open={isCollectModalOpen} onOpenChange={setIsCollectModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-6">
          <form onSubmit={handleConfirmCollect}>
            <DialogHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">Mark EMI Payment Done</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Borrower: <strong className="text-foreground">{activeItem?.customerName}</strong> · EMI #{activeItem?.installmentNo}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Amount Collected (₹) *</Label>
                <Input
                  type="number"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="h-10 rounded-xl text-sm font-mono font-extrabold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Payment Channel</Label>
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
                  placeholder="e.g. UPI Ref / Receipt No"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/40 sm:justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCollectModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                Confirm Payment Done
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Reschedule Due Date Modal */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-5">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-sm font-bold text-foreground">Reschedule EMI Due Date</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Grant grace extension upon customer request
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <Label className="text-xs font-bold text-foreground">Extend Duration</Label>
            <Select value={rescheduleDays} onValueChange={setRescheduleDays}>
              <SelectTrigger className="w-full h-9 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">+7 Days Extension</SelectItem>
                <SelectItem value="15">+15 Days Extension</SelectItem>
                <SelectItem value="30">+30 Days Extension (Next Month)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button size="sm" onClick={handleRescheduleDueDate} className="w-full rounded-xl font-bold">
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Mark Defective / Disputed Modal */}
      <Dialog open={isDisputeModalOpen} onOpenChange={setIsDisputeModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl p-5">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-sm font-bold text-foreground">Mark Defect / Disputed Installment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Temporarily freeze overdue penalties during product defect or dispute review
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <Label className="text-xs font-bold text-foreground">Dispute / Defect Reason</Label>
            <Input
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. Screen defect, awaiting technician replacement"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-border/40 sm:justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsDisputeModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleMarkDisputed} className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white">
              Freeze & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
