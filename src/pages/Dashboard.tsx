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
} from 'lucide-react';
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import { supabase, asArray } from '../lib/client';
import { navigate } from '../lib/router';
import { formatDate, isThisWeek, effectiveStatus, initials, dueDateClass, sortByDateDesc, isToday } from '../lib/utils';
import type { Meeting, FollowUp } from '../lib/types';

interface DashboardData {
  meetings: Meeting[];
  followUps: FollowUp[];
}

interface Kpi {
  key: string;
  label: string;
  icon: typeof ListChecks;
  color: string;
  count: number;
  path: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

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
    const kpis: Kpi[] = [
      {
        key: 'actions',
        label: 'Open Action Items',
        icon: ListChecks,
        color: 'bg-emerald-50 text-emerald-600',
        count: items.filter((i) => i.type === 'Action' && effectiveStatus(i) !== 'completed').length,
        path: '/repository?type=Action&statusNot=completed',
      },
      {
        key: 'followups',
        label: 'Pending Follow-ups',
        icon: Clock,
        color: 'bg-brand-50 text-brand-600',
        count: items.filter((i) => i.type === 'Follow-up' && effectiveStatus(i) === 'pending').length,
        path: '/repository?type=Follow-up&status=pending',
      },
      {
        key: 'meetings',
        label: 'Meetings This Week',
        icon: CalendarDays,
        color: 'bg-violet-50 text-violet-600',
        count: meetings.filter((m) => isThisWeek(m.meeting_date)).length,
        path: '/meetings?week=current',
      },
      {
        key: 'raid',
        label: 'Open RAID Items',
        icon: ShieldAlert,
        color: 'bg-red-50 text-red-600',
        count: items.filter((i) => i.type === 'RAID' && effectiveStatus(i) !== 'completed').length,
        path: '/repository?type=RAID&statusNot=completed',
      },
    ];
    return { kpis, overdueCount, dueToday };
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

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of meetings, actions and follow-ups."
        actions={
          <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
            <Plus size={16} />
            New Meeting
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.key}
              onClick={() => navigate(kpi.path)}
              className="card group flex flex-col items-start gap-3 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.color}`}>
                <Icon size={20} />
              </div>
              <div className="w-full">
                <p className="text-3xl font-bold text-slate-900">{kpi.count}</p>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-500">
                  {kpi.label}
                  <ArrowRight size={14} className="opacity-0 transition group-hover:opacity-100" />
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {stats.overdueCount > 0 && (
        <button
          onClick={() => navigate('/repository')}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left transition hover:bg-red-100"
        >
          <AlertTriangle size={18} className="text-red-600" />
          <p className="text-sm font-semibold text-red-700">
            {stats.overdueCount} overdue follow-up item{stats.overdueCount > 1 ? 's' : ''} — click to review.
          </p>
        </button>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Meetings</h2>
            <button className="btn-ghost text-sm text-brand-600" onClick={() => navigate('/meetings')}>
              View all
            </button>
          </div>
          {recentMeetings.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<FolderOpen size={24} />}
                title="No meetings yet"
                message="Create your first meeting to start generating minutes, action items, and follow-ups."
                action={
                  <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
                    <Plus size={16} />
                    New Meeting
                  </button>
                }
              />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="th">Meeting Title</th>
                  <th className="th">Project / Client</th>
                  <th className="th">Date</th>
                  <th className="th text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {recentMeetings.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/outputs/review/${m.id}`)}
                    className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                  >
                    <td className="td font-medium text-slate-900">{m.title}</td>
                    <td className="td">{m.project_client}</td>
                    <td className="td">{formatDate(m.meeting_date)}</td>
                    <td className="td text-right">
                      <button
                        className="btn-ghost p-1 text-brand-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/outputs/review/${m.id}`);
                        }}
                        aria-label="View meeting"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Follow-up Snapshot</h2>
            <button className="btn-ghost p-1 text-brand-600" onClick={() => navigate('/repository')} aria-label="Open repository">
              <FolderKanban size={18} />
            </button>
          </div>
          <div className="p-5">
            {stats.dueToday.length > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                <CalendarClock size={16} />
                {stats.dueToday.length} item{stats.dueToday.length > 1 ? 's' : ''} due today
              </div>
            )}
            {snapshot.length === 0 ? (
              <EmptyState icon={<Clock size={24} />} title="No pending items" />
            ) : (
              <ul className="space-y-4">
                {snapshot.map((group) => (
                  <li key={group.person}>
                    <button
                      onClick={() => navigate('/repository')}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {initials(group.person)}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{group.person}</span>
                      <Badge className="ml-auto bg-brand-50 text-brand-700">{group.items.length}</Badge>
                    </button>
                    <ul className="mt-2 space-y-1.5">
                      {group.items.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          <button onClick={() => navigate('/repository')} className="w-full text-left">
                            <p className="truncate text-sm text-slate-600">{item.item_title}</p>
                            <p className="flex items-center gap-2 text-xs text-slate-400">
                              {effectiveStatus(item) === 'overdue' && (
                                <Badge className="bg-red-50 text-red-700">Overdue</Badge>
                              )}
                              <span className={dueDateClass(item)}>{formatDate(item.follow_up_date)}</span>
                            </p>
                          </button>
                        </li>
                      ))}
                      {group.items.length > 5 && (
                        <li className="text-xs font-medium text-slate-400">
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
  );
}