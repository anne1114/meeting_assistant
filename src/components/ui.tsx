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

/** Editorial page header: serif display title with optional eyebrow + actions. */
export function PageHeader({
  title,
  subtitle,
  overline,
  actions,
}: {
  title: string;
  subtitle?: string;
  overline?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="animate-rise-in max-w-2xl">
        {overline && <p className="mb-3 eyebrow">{overline}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-2.5 text-[15px] leading-relaxed text-taupe">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/** Consistent card header with a refined title/eyebrow and an action slot. */
export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-100/80 bg-cream-50/40 px-6 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-stone-100">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="section-title truncate">{title}</p>
          {subtitle && <p className="truncate text-xs text-taupe">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
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
    <div className="animate-rise-in flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-brand-600 ring-1 ring-brand-900/[0.06]">
        {icon}
      </span>
      <p className="font-display text-xl font-medium text-ink">{title}</p>
      {message && <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-taupe">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
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
  const cls = STATUS_BADGE_CLASSES[status] ?? 'bg-stone-100 text-stone-600';
  return <Badge className={cls}>{labelFor(status)}</Badge>;
}

export function CriticalityBadge({ criticality }: { criticality: Criticality }) {
  return <Badge className={CRITICALITY_BADGE_CLASSES[criticality]}>{labelFor(criticality)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_BADGE_CLASSES[priority]}>{labelFor(priority)}</Badge>;
}

export function RaidTypeBadge({ type }: { type: string }) {
  const cls = RAID_BADGE_CLASSES[type] ?? 'bg-stone-100 text-stone-600';
  return <Badge className={cls}>{labelFor(type)}</Badge>;
}

export function StatusDot({ status }: { status: 'green' | 'yellow' | 'red' }) {
  const tones = {
    green: { dot: 'bg-emerald-600', text: 'text-emerald-700', pill: 'bg-emerald-50' },
    yellow: { dot: 'bg-amber-500', text: 'text-amber-700', pill: 'bg-amber-50' },
    red: { dot: 'bg-rose-500', text: 'text-rose-700', pill: 'bg-rose-50' },
  };
  const t = tones[status];
  const labels = { green: 'On Track', yellow: 'At Risk', red: 'Off Track' };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${t.pill} ring-1 ring-black/[0.03]`}>
      <span className={`h-2 w-2 rounded-full ${t.dot}`} />
      <span className={`text-[13px] font-medium ${t.text}`}>{labels[status]}</span>
    </span>
  );
}
