import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  ListChecks,
  AlertTriangle,
  ClipboardList,
  Users,
  CalendarDays,
  Search,
  FolderKanban,
  RefreshCw,
  Save,
  Check,
} from 'lucide-react';
import { PageHeader, Spinner } from '../components/ui';
import MinutesTab from '../components/tabs/MinutesTab';
import ActionItemsTab from '../components/tabs/ActionItemsTab';
import RaidTab from '../components/tabs/RaidTab';
import StatusReportTab from '../components/tabs/StatusReportTab';
import { supabase, asArray, asSingle } from '../lib/client';
import { navigate } from '../lib/router';
import { generateAndPersist } from '../lib/generator';
import { formatDate, isThisWeek, todayISO } from '../lib/utils';
import type { Meeting, ActionItem, RaidItem, MeetingMinutes, StatusReport, OutputType } from '../lib/types';

type TabKey = 'minutes' | 'actions' | 'raid' | 'status';

interface ReviewData {
  meeting: Meeting | null;
  minutes: MeetingMinutes | null;
  actions: ActionItem[];
  raid: RaidItem[];
  status: StatusReport | null;
}

export default function OutputReview({ meetingId }: { meetingId: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [tab, setTab] = useState<TabKey>('minutes');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [savingReport, setSavingReport] = useState(false);

  const load = useCallback(async () => {
    let targetId = meetingId;
    if (!targetId) {
      const { data: latest } = await supabase
        .from<Meeting>('meetings')
        .select()
        .order('meeting_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      targetId = asSingle(latest)?.id ?? '';
    }
    if (!targetId) {
      setData({ meeting: null, minutes: null, actions: [], raid: [], status: null });
      return;
    }
    const [meetingRes, minutesRes, actionsRes, raidRes, statusRes, meetingsRes] = await Promise.all([
      supabase.from<Meeting>('meetings').select().eq('id', targetId).maybeSingle(),
      supabase.from<MeetingMinutes>('meeting_minutes').select().eq('meeting_id', targetId).maybeSingle(),
      supabase.from<ActionItem>('action_items').select().eq('meeting_id', targetId),
      supabase.from<RaidItem>('raid_items').select().eq('meeting_id', targetId),
      supabase.from<StatusReport>('status_reports').select().eq('meeting_id', targetId).maybeSingle(),
      supabase.from<Meeting>('meetings').select(),
    ]);
    setData({
      meeting: asSingle(meetingRes.data),
      minutes: asSingle(minutesRes.data),
      actions: asArray(actionsRes.data),
      raid: asArray(raidRes.data),
      status: asSingle(statusRes.data),
    });
    setAllMeetings(asArray(meetingsRes.data));
  }, [meetingId]);

  useEffect(() => {
    setData(null);
    void load();
  }, [load]);

  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allMeetings.filter((m) => {
      const matchesSearch =
        !query ||
        m.title.toLowerCase().includes(query) ||
        m.participants.some((p) => p.toLowerCase().includes(query));
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'week' && isThisWeek(m.meeting_date)) ||
        (dateFilter === 'month' && m.meeting_date.slice(0, 7) === todayISO().slice(0, 7));
      const matchesPerson = !personFilter || m.participants.includes(personFilter);
      return matchesSearch && matchesDate && matchesPerson;
    });
  }, [allMeetings, search, dateFilter, personFilter]);

  const allPeople = useMemo(() => {
    const set = new Set<string>();
    for (const m of allMeetings) for (const p of m.participants) set.add(p);
    return [...set].sort();
  }, [allMeetings]);

  const handleRegenerate = async () => {
    if (!data?.meeting) return;
    setRegenerating(true);
    const selected: OutputType[] =
      data.meeting.selected_outputs.length > 0 ? data.meeting.selected_outputs : ['minutes', 'actions', 'raid', 'status'];
    await generateAndPersist(data.meeting.id, selected);
    setRegenerating(false);
    void load();
  };

  const handleSaveReport = async () => {
    if (!data?.meeting) return;
    setSavingReport(true);
    await supabase
      .from<Meeting>('meetings')
      .update({ report_saved: true, status: 'reviewed' })
      .eq('id', data.meeting.id);
    setSavingReport(false);
    void load();
  };

  const handleMinutesRefined = async (updated: MeetingMinutes) => {
    await supabase
      .from<MeetingMinutes>('meeting_minutes')
      .update({ discussion_summary: updated.discussion_summary, key_decisions: updated.key_decisions })
      .eq('id', updated.id);
    void load();
  };

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const { meeting } = data;

  if (!meeting) {
    return (
      <div className="mx-auto max-w-6xl text-center">
        <PageHeader title="Meeting not found." />
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: typeof FileText; count?: number }> = [
    { key: 'minutes', label: 'Minutes', icon: FileText },
    { key: 'actions', label: 'Action Items', icon: ListChecks, count: data.actions.length },
    { key: 'raid', label: 'RAID', icon: AlertTriangle, count: data.raid.length },
    { key: 'status', label: 'Status Report', icon: ClipboardList },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <button className="btn-ghost mb-4" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
      <PageHeader title="Output Review Workspace" subtitle="Review and refine AI-generated meeting outputs." />

      <div className="card mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="label">Search Meetings</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
              <input
                className="input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or participant…"
              />
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <select className="input min-w-[140px]" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div>
            <label className="label">Person</label>
            <select className="input min-w-[140px]" value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}>
              <option value="">All People</option>
              {allPeople.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(search.trim() || dateFilter !== 'all' || personFilter) && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            {filteredMeetings.length === 0 ? (
              <p className="text-sm text-slate-500">No meetings found</p>
            ) : (
              <ul className="space-y-1">
                {filteredMeetings.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <button
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 ${
                        m.id === meeting.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700'
                      }`}
                      onClick={() => navigate(`/outputs/review/${m.id}`)}
                    >
                      {m.title} <span className="text-xs text-slate-400">· {m.project_client} · {formatDate(m.meeting_date)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{meeting.title}</p>
              <p className="text-sm text-slate-500">
                {meeting.project_client} · {formatDate(meeting.meeting_date)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={14} />
                  Transcript: {meeting.transcript ? 'Yes' : 'No'}
                </span>
                <span>Notes: {meeting.notes ? 'Yes' : 'No'}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {meeting.participants.map((p) => (
                  <span key={p} className="badge bg-slate-100 text-slate-600">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={() => navigate(`/outputs/select/${meeting.id}`)}>
              Edit Input
            </button>
            <button className="btn-secondary" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? <Spinner className="h-4 w-4" /> : <RefreshCw size={16} />}
              {regenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button
              className={meeting.report_saved ? 'btn-secondary' : 'btn-primary'}
              onClick={handleSaveReport}
              disabled={meeting.report_saved || savingReport}
            >
              {savingReport ? <Spinner className="h-4 w-4" /> : meeting.report_saved ? <Check size={16} /> : <Save size={16} />}
              {savingReport ? 'Saving…' : meeting.report_saved ? 'Report Saved' : 'Save Report'}
            </button>
            <button className="btn-secondary" onClick={() => navigate('/repository')}>
              <FolderKanban size={16} />
              Go to Repository
            </button>
          </div>
        </div>
      </div>

      {!meeting.outputs_generated && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Outputs haven't been generated yet. Click Regenerate to create them from the meeting content.
        </div>
      )}

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm ${active ? 'tab-active' : 'tab-inactive'}`}
            >
              <Icon size={16} />
              {t.label}
              {typeof t.count === 'number' && (
                <span className={`badge px-1.5 py-0 text-[10px] ${active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'minutes' && (
        <MinutesTab minutes={data.minutes} transcript={meeting.transcript} onRefined={handleMinutesRefined} />
      )}
      {tab === 'actions' && <ActionItemsTab meeting={meeting} actions={data.actions} onChanged={load} />}
      {tab === 'raid' && <RaidTab meeting={meeting} raid={data.raid} onChanged={load} />}
      {tab === 'status' && <StatusReportTab report={data.status} />}
    </div>
  );
}