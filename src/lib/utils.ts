import type { FollowUp, Criticality, Priority, ActionStatus } from './types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayISO(): string {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return iso === todayISO();
}

export function isThisWeek(iso: string | null | undefined, now?: Date): boolean {
  if (!iso) return false;
  const base = now ?? new Date();
  const today = new Date(toISODate(base) + 'T00:00:00');
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const target = new Date(iso + 'T00:00:00');
  return target >= weekStart && target <= weekEnd;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function parseCSV(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinCSV(values: string[]): string {
  return values.join(', ');
}

export function effectiveStatus(item: FollowUp): FollowUp['status'] | 'overdue' {
  if (item.status === 'completed') return 'completed';
  if (item.follow_up_date && item.follow_up_date < todayISO()) return 'overdue';
  return item.status;
}

export function isOverdue(item: FollowUp): boolean {
  return effectiveStatus(item) === 'overdue';
}

export function dueUrgency(item: FollowUp): 'overdue' | 'soon' | 'later' | 'none' {
  if (item.status === 'completed' || !item.follow_up_date) return 'none';
  if (item.follow_up_date < todayISO()) return 'overdue';
  const diff = daysUntil(item.follow_up_date);
  if (diff <= 7) return 'soon';
  return 'later';
}

export function daysUntil(iso: string): number {
  const a = new Date(todayISO() + 'T00:00:00').getTime();
  const b = new Date(iso + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

export function dueDateClass(item: FollowUp): string {
  const u = dueUrgency(item);
  if (u === 'overdue') return 'font-semibold text-red-600';
  if (u === 'soon') return 'font-semibold text-amber-600';
  if (u === 'later') return 'text-emerald-600';
  return 'text-slate-500';
}

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  done: 'bg-emerald-50 text-emerald-700',
  blocked: 'bg-red-50 text-red-700',
  to_do: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
  reviewed: 'bg-emerald-50 text-emerald-700',
};

export const CRITICALITY_BADGE_CLASSES: Record<Criticality, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
};

export const PRIORITY_BADGE_CLASSES: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
};

export const RAID_BADGE_CLASSES: Record<string, string> = {
  risk: 'bg-red-50 text-red-700',
  assumption: 'bg-blue-50 text-blue-700',
  issue: 'bg-amber-50 text-amber-700',
  dependency: 'bg-violet-50 text-violet-700',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
};

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

export function sortByDateDesc(a: { meeting_date: string }, b: { meeting_date: string }): number {
  return b.meeting_date.localeCompare(a.meeting_date);
}