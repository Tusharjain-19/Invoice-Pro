'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, PlusCircle, FileCheck, CircleAlert, BadgeDollarSign, DatabaseBackup } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface ActivityItem {
  id: string;
  title: string;
  desc: string;
  time: number;
  type: 'invoice' | 'product' | 'expense' | 'stock' | 'backup';
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileCheck className="h-4 w-4" />;
      case 'product':
        return <PlusCircle className="h-4 w-4" />;
      case 'expense':
        return <BadgeDollarSign className="h-4 w-4" />;
      case 'stock':
        return <CircleAlert className="h-4 w-4" />;
      case 'backup':
        return <DatabaseBackup className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/25';
      case 'product':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';
      case 'expense':
        return 'bg-red-500/10 text-red-500 border-red-500/25';
      case 'stock':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/25';
      case 'backup':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/25';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/25';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">Activity Timeline</CardTitle>
            <p className="text-[11px] text-muted-foreground/80 font-medium">Real-time ledger events and operations</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 relative px-5 pb-6">
        {activities.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-xs font-semibold">No recent activity detected</p>
          </div>
        ) : (
          <div className="relative border-l border-border/60 pl-6 ml-3 space-y-6">
            {activities.map((act) => (
              <div key={act.id} className="relative group">
                {/* Bullet */}
                <div className={`absolute -left-9.25 top-0.5 flex h-7.5 w-7.5 items-center justify-center rounded-xl border shadow-sm ${getColorClass(act.type)}`}>
                  {getIcon(act.type)}
                </div>
                
                {/* Content */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">{act.title}</span>
                    <span className="text-[10px] text-muted-foreground/75 font-medium ml-auto">
                      {formatDateTime(act.time)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/90 font-medium leading-relaxed">
                    {act.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
