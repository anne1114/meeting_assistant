import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  STATUS_BADGE_CLASSES,
  CRITICALITY_BADGE_CLASSES,
  PRIORITY_BADGE_CLASSES,
  RAID_BADGE_CLASSES,
} from '../lib/utils';
import type { Criticality, Priority } from '../lib/types';

export function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} aria-label="Loading" />;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

export function labelFor(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASSES[status] ?? 'bg-slate-100 text-slate-600';
  return <Badge className={cls}>{labelFor(status)}</Badge>;
}

export function CriticalityBadge({ criticality }: { criticality: Criticality }) {
  return <Badge className={CRITICALITY_BADGE_CLASSES[criticality]}>{labelFor(criticality)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_BADGE_CLASSES[priority]}>{labelFor(priority)}</Badge>;
}

export function RaidTypeBadge({ type }: { type: string }) {
  const cls = RAID_BADGE_CLASSES[type] ?? 'bg-slate-100 text-slate-600';
  return <Badge className={cls}>{labelFor(type)}</Badge>;
}

export function StatusDot({ status }: { status: 'green' | 'yellow' | 'red' }) {
  const colors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  };
  const labels = { green: 'On Track', yellow: 'At Risk', red: 'Off Track' };
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${colors[status]}`} />
      <span className="font-semibold">{labels[status]}</span>
    </span>
  );
}