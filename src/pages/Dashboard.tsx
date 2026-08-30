import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ListChecks,
  Clock,
  CalendarDays,
  ShieldAlert,
  ArrowRight,
  ArrowUpRight,
  FolderKanban,
  Plus,
  AlertTriangle,
  CalendarClock,
  FolderOpen,
  Check,
  Loader2,
} from 'lucide-react';
import { PageHeader, EmptyState, Badge, CardHeader } from '../components/ui';
import { supabase, asArray } from '../lib/client';
import { navigate } from '../lib/router';
import { formatDate, isThisWeek, effectiveStatus, initials, dueDateClass, sortByDateDesc, isToday, todayISO } from '../lib/utils';
import type { Meeting, FollowUp } from '../lib/types';

interface DashboardData {
  meetings: Meeting[];
  followUps: FollowUp[];
}

interface Kpi {
  key: string;
  label: string;
  icon: typeof ListChecks;
  tint: string;
  count: number;
  path: string;
}

function StatTile({ kpi, delay }: { kpi: Kpi; delay: number }) {
  const Icon = kpi.icon;
  return (
    <button
      onClick={() => navigate(kpi.path)}
      style={{ animationDelay: `${delay}ms` }}
      className="group flex animate-rise-in items-center gap-4 rounded-2xl border border-stone-200/70 bg-white p-4 text-left opacity-0 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200/80 hover:shadow-lift [animation-fill-mode:forwards]"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${kpi.tint}`}>
        <Icon size={20} strokeWidth={1.6} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="font-display text-3xl font-medium leading-none text-ink tabular-nums">{kpi.count}</p>
        <p className="mt-1.5 text-[12.5px] font-medium text-taupe">{kpi.label}</p>
      </div>
      <ArrowRight
        size={16}
        className="ml-auto -translate-x-1 text-brand-600 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
      />
    </button>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [doneFocusId, setDoneFocusId] = useState<string | null>(null);

  const doneFocus = async (item: FollowUp) => {
    setDoneFocusId(item.id);
    await supabase
      .from<FollowUp>('follow_ups')
      .update({ status: 'completed', completed_on: todayISO() })
      .eq('id', item.id);
    setDoneFocusId(null);
    await load();
  };

  const load = useCallback(async () => {
    const [meetingsRes, followUpsRes] = await Promise.all([
      supabase.from<Meeting>('meetings').select(),
      supabase.from<FollowUp>('follow_ups').select(),
    ]);
    setData({
      meetings: asArray(meetingsRes.data),
      followUps: asArray(followUpsRes.data),
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const items = data?.followUps ?? [];
    const meetings = data?.meetings ?? [];
    const overdueCount = items.filter((i) => effectiveStatus(i) === 'overdue').length;
    const dueToday = items.filter((i) => isToday(i.follow_up_date) && effectiveStatus(i) !== 'completed');
    const openActions = items.filter((i) => i.type === 'Action' && effectiveStatus(i) !== 'completed').length;
    const kpis: Kpi[] = [
      {
        key: 'followups',
        label: 'Pending Follow-ups',
        icon: Clock,
        tint: 'bg-brand-50 text-brand-700 ring-1 ring-brand-900/[0.06]',
        count: items.filter((i) => i.type === 'Follow-up' && effectiveStatus(i) === 'pending').length,
        path: '/repository?type=Follow-up&status=pending',
      },
      {
        key: 'meetings',
        label: 'Meetings This Week',
        icon: CalendarDays,
        tint: 'bg-amber-50 text-amber-700 ring-1 ring-amber-900/[0.06]',
        count: meetings.filter((m) => isThisWeek(m.meeting_date)).length,
        path: '/meetings?week=current',
      },
      {
        key: 'raid',
        label: 'Open RAID Items',
        icon: ShieldAlert,
        tint: 'bg-rose-50 text-rose-700 ring-1 ring-rose-900/[0.06]',
        count: items.filter((i) => i.type === 'RAID' && effectiveStatus(i) !== 'completed').length,
        path: '/repository?type=RAID&statusNot=completed',
      },
    ];
    return { kpis, overdueCount, dueToday, openActions };
  }, [data]);

  const recentMeetings = useMemo(() => {
    const meetings = data?.meetings ?? [];
    return [...meetings].sort(sortByDateDesc).slice(0, 5);
  }, [data]);

  const snapshot = useMemo(() => {
    const items = (data?.followUps ?? []).filter((i) => {
      const eff = effectiveStatus(i);
      return eff === 'pending' || eff === 'overdue';
    });
    const byPerson = new Map<string, FollowUp[]>();
    for (const item of items) {
      const person = item.assigned_to || 'Unassigned';
      byPerson.set(person, [...(byPerson.get(person) ?? []), item]);
    }
    const groups = [...byPerson.entries()]
      .map(([person, list]) => ({ person, items: list }))
      .sort((a, b) => b.items.length - a.items.length);
    return groups;
  }, [data]);

  const focus = useMemo(() => {
    const list = (data?.followUps ?? []).filter((i) => {
      const eff = effectiveStatus(i);
      return eff === 'overdue' || (isToday(i.follow_up_date) && eff !== 'completed');
    });
    return list.sort((a, b) => {
      const aOver = effectiveStatus(a) === 'overdue' ? 0 : 1;
      const bOver = effectiveStatus(b) === 'overdue' ? 0 : 1;
      return aOver - bOver || (a.follow_up_date ?? '').localeCompare(b.follow_up_date ?? '');
    });
  }, [data]);

  if (!data) {
    return (
      <div className="animate-pulse">
        <div className="mb-9">
          <div className="h-3 w-36 rounded-full bg-cream-200" />
          <div className="mt-4 h-9 w-64 rounded-lg bg-cream-200" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-stone-200/60 bg-white p-7 shadow-sm lg:col-span-2">
            <div className="h-3 w-24 rounded-full bg-cream-200" />
            <div className="mt-5 h-12 w-32 rounded-lg bg-cream-200" />
            <div className="mt-3 h-3 w-56 rounded-full bg-cream-200" />
            <div className="mt-10 h-10 w-44 rounded-lg bg-cream-200" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-cream-200" />
                <div className="flex-1">
                  <div className="h-6 w-14 rounded-lg bg-cream-200" />
                  <div className="mt-2 h-3 w-24 rounded-full bg-cream-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-32 p-5">
              <div className="h-4 w-3/4 rounded-full bg-cream-200" />
              <div className="mt-4 h-6 w-16 rounded-lg bg-cream-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Dashboard"
        overline="Workspace overview"
        subtitle="A refined overview of your meetings, actions and follow-ups."
        actions={
          <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
            <Plus size={16} />
            New Meeting
          </button>
        }
      />

      <div className="space-y-6">
      {/* Hero: featured focus panel + premium metric stack, one balanced unit */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <button
          onClick={() => navigate('/repository?type=Action&statusNot=completed')}
          className="group relative flex animate-rise-in flex-col justify-between overflow-hidden rounded-2xl border border-brand-900/[0.08] bg-gradient-to-br from-cream-50 via-white to-brand-50/50 p-6 text-left shadow-soft transition hover:shadow-lift lg:col-span-2 sm:p-7"
        >
          <span className="pointer-events-none absolute -right-10 -top-12 h-56 w-56 rounded-full bg-brand-100/60 blur-2xl" />
          <div className="relative">
            <p className="eyebrow">Primary focus</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-6xl font-medium leading-none text-ink tabular-nums">
                {stats.openActions}
              </span>
              <span className="mb-1 text-sm font-medium text-taupe">open</span>
            </div>
            <p className="mt-3 text-sm text-taupe">Open action items across your meetings</p>
          </div>
          <div className="relative mt-8 flex items-center gap-2.5 text-sm font-semibold text-brand-700">
            View repository
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-brand-600 shadow-sm ring-1 ring-brand-900/[0.06] transition group-hover:translate-x-0.5">
              <ArrowUpRight size={16} strokeWidth={1.6} />
            </span>
          </div>
        </button>

        <div className="grid grid-cols-1 gap-3">
          {stats.kpis.map((kpi, i) => (
            <StatTile key={kpi.key} kpi={kpi} delay={60 * (i + 1)} />
          ))}
        </div>
      </div>

      {focus.length > 0 && (
        <div className="animate-rise-in overflow-hidden rounded-2xl border border-rose-100/80 bg-white shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100/70 bg-gradient-to-r from-rose-50/70 to-cream-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle size={17} strokeWidth={1.6} />
              </span>
              <div>
                <p className="section-title">Needs your attention</p>
                <p className="text-xs font-medium text-taupe">
                  {stats.overdueCount} overdue · {focus.length - stats.overdueCount} due today
                </p>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => navigate('/repository')}>
              View repository
            </button>
          </div>
          <ul className="divide-y divide-stone-100/70">
            {focus.slice(0, 6).map((item) => (
              <li key={item.id} className="transition hover:bg-cream-50/60">
                <div className="group flex w-full items-center gap-3 px-6 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void doneFocus(item);
                    }}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                      doneFocusId === item.id
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-stone-300 hover:border-brand-500 hover:bg-brand-50'
                    }`}
                    aria-label="Mark as done"
                    title="Mark as done"
                  >
                    {doneFocusId === item.id ? (
                      <Loader2 size={14} className="animate-spin text-brand-600" />
                    ) : (
                      <Check size={14} className="text-brand-600 opacity-0 transition group-hover:opacity-100" />
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/repository')}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${effectiveStatus(item) === 'overdue' ? 'bg-rose-500' : 'bg-amber-400'}`}
                    />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{item.item_title}</p>
                    <span className={dueDateClass(item)}>
                      {effectiveStatus(item) === 'overdue' ? 'Overdue' : 'Due today'}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card overflow-hidden lg:col-span-2">
          <CardHeader
            icon={<FolderOpen size={18} strokeWidth={1.6} />}
            title="Recent Meetings"
            subtitle="Latest captured and reviewed sessions"
            actions={
              <button className="btn-ghost text-sm font-semibold text-brand-600" onClick={() => navigate('/meetings')}>
                View all
                <ArrowRight size={15} />
              </button>
            }
          />
          {recentMeetings.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={26} />}
              title="No meetings yet"
              message="Create your first meeting to start generating minutes, action items, and follow-ups."
              action={
                <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
                  <Plus size={16} />
                  New Meeting
                </button>
              }
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-cream-50/40">
                  <th className="th">Meeting</th>
                  <th className="th hidden sm:table-cell">Project / Client</th>
                  <th className="th hidden sm:table-cell">Date</th>
                  <th className="th text-right">Status</th>
                  <th className="th text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {recentMeetings.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/outputs/review/${m.id}`)}
                    className="group cursor-pointer border-b border-stone-100/70 transition hover:bg-cream-50/60"
                  >
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream-200/70 text-taupe transition group-hover:bg-brand-100 group-hover:text-brand-700">
                          <FolderOpen size={15} strokeWidth={1.6} />
                        </span>
                        <span className="font-medium text-ink">{m.title}</span>
                      </div>
                    </td>
                    <td className="td hidden sm:table-cell">{m.project_client}</td>
                    <td className="td hidden sm:table-cell">{formatDate(m.meeting_date)}</td>
                    <td className="td text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          m.status === 'reviewed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-stone-100 text-taupe'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            m.status === 'reviewed' ? 'bg-emerald-500' : 'bg-stone-300'
                          }`}
                        />
                        {m.status === 'reviewed' ? 'Reviewed' : 'Draft'}
                      </span>
                    </td>
                    <td className="td text-right">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cream-200/70 text-taupe opacity-0 transition group-hover:bg-brand-100 group-hover:text-brand-700 group-hover:opacity-100">
                        <ArrowUpRight size={16} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <CardHeader
            title="Follow-up Snapshot"
            subtitle="Pending items by owner"
            actions={
              <button className="btn-icon" onClick={() => navigate('/repository')} aria-label="Open repository" title="Open repository">
                <FolderKanban size={17} strokeWidth={1.6} />
              </button>
            }
          />
          <div className="p-6">
            {stats.dueToday.length > 0 && (
              <div className="animate-rise-in mb-5 flex items-center gap-2.5 rounded-xl border border-rose-100 bg-rose-50/70 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                <CalendarClock size={16} strokeWidth={1.6} />
                {stats.dueToday.length} item{stats.dueToday.length > 1 ? 's' : ''} due today
              </div>
            )}
            {snapshot.length === 0 ? (
              <EmptyState
                icon={<Clock size={24} />}
                title="Nothing pending"
                message="You're all caught up. New follow-ups will appear here as you generate meeting outputs."
              />
            ) : (
              <ul className="space-y-5">
                {snapshot.map((group) => (
                  <li key={group.person}>
                    <button
                      onClick={() => navigate('/repository')}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <span className="avatar bg-brand-50 text-brand-700">{initials(group.person)}</span>
                      <span className="text-sm font-semibold text-ink">{group.person}</span>
                      <span className="ml-auto inline-flex min-w-[22px] items-center justify-center rounded-full bg-brand-600/10 px-2 py-0.5 text-xs font-semibold text-brand-700">
                        {group.items.length}
                      </span>
                    </button>
                    <ul className="mt-2.5 space-y-2 border-l border-stone-200/70 pl-6">
                      {group.items.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          <button onClick={() => navigate('/repository')} className="group w-full text-left">
                            <p className="truncate text-sm text-stone-600 transition group-hover:text-ink">{item.item_title}</p>
                            <p className="mt-1 flex items-center gap-2 text-xs text-taupe-light">
                              {effectiveStatus(item) === 'overdue' && (
                                <Badge className="bg-rose-50 text-rose-700">Overdue</Badge>
                              )}
                              <span className={dueDateClass(item)}>{formatDate(item.follow_up_date)}</span>
                            </p>
                          </button>
                        </li>
                      ))}
                      {group.items.length > 5 && (
                        <li className="text-xs font-medium text-taupe-light">
                          +{group.items.length - 5} more…
                        </li>
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
