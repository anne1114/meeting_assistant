import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, ListChecks, AlertTriangle, ClipboardList, Check, Users, CalendarDays } from 'lucide-react';
import { PageHeader, Spinner } from '../components/ui';
import { supabase, asSingle } from '../lib/client';
import { navigate } from '../lib/router';
import { generateAndPersist } from '../lib/generator';
import { formatDate } from '../lib/utils';
import type { Meeting, OutputType } from '../lib/types';

const OUTPUTS: Array<{ key: OutputType; title: string; description: string; icon: typeof FileText; color: string }> = [
  {
    key: 'minutes',
    title: 'Meeting Minutes Generator',
    description: 'Structured minutes with objective, discussion summary, decisions, open points, and next steps.',
    icon: FileText,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'actions',
    title: 'Action Tracker Builder',
    description: 'Extract action items with owners, due dates, priorities, and follow-up notes from the transcript.',
    icon: ListChecks,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    key: 'raid',
    title: 'RAID Extractor',
    description: 'Identify Risks, Assumptions, Issues, and Dependencies with impact and mitigation steps.',
    icon: AlertTriangle,
    color: 'bg-red-50 text-red-600',
  },
  {
    key: 'status',
    title: 'Stakeholder Status Report',
    description: 'Generate a stakeholder-ready report with overall status, progress, risks, and support needed.',
    icon: ClipboardList,
    color: 'bg-amber-50 text-amber-600',
  },
];

export default function OutputSelection({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null | undefined>(undefined);
  const [selected, setSelected] = useState<Set<OutputType>>(new Set());
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (meetingId) {
      const { data } = await supabase.from<Meeting>('meetings').select().eq('id', meetingId).maybeSingle();
      setMeeting(asSingle(data));
      return;
    }
    const { data } = await supabase
      .from<Meeting>('meetings')
      .select()
      .order('meeting_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    setMeeting(asSingle(data));
  }, [meetingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (meeting) {
      const saved = meeting.selected_outputs;
      setSelected(new Set(saved.length > 0 ? saved : (['minutes', 'actions', 'raid', 'status'] as OutputType[])));
    }
  }, [meeting]);

  const toggle = (key: OutputType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setError('');
  };

  const selectedList = useMemo(() => [...selected], [selected]);

  const handleGenerate = async () => {
    if (!meeting) return;
    if (selectedList.length === 0) {
      setError('Select at least one output to generate.');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      await generateAndPersist(meeting.id, selectedList);
      navigate(`/outputs/review/${meeting.id}`);
    } catch {
      setError('Failed to generate outputs. Please try again.');
      setGenerating(false);
    }
  };

  if (meeting === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (meeting === null) {
    return (
      <div className="mx-auto max-w-4xl text-center">
        <PageHeader title="Meeting not found." />
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button className="btn-ghost mb-4" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} />
        Back
      </button>
      <PageHeader
        title="Select Outputs to Generate"
        subtitle="Choose which AI outputs to generate from this meeting's content."
      />

      <div className="mb-6 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow">
        <p className="text-lg font-bold">{meeting.title}</p>
        <p className="text-sm text-brand-100">{meeting.project_client} · {formatDate(meeting.meeting_date)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-brand-100">
          <span className="flex items-center gap-1">
            <Users size={14} />
            {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays size={14} />
            {formatDate(meeting.meeting_date)}
          </span>
          {meeting.participants.map((p) => (
            <span key={p} className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
              {p}
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs font-medium text-brand-100">
          <span>Transcript: {meeting.transcript ? 'Yes' : 'No'}</span>
          <span>Notes: {meeting.notes ? 'Yes' : 'No'}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OUTPUTS.map((output) => {
          const Icon = output.icon;
          const isSelected = selected.has(output.key);
          return (
            <button
              key={output.key}
              onClick={() => toggle(output.key)}
              className={`card relative p-5 text-left transition hover:shadow-md ${
                isSelected ? 'ring-2 ring-brand-600' : ''
              }`}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                  <Check size={14} />
                </span>
              )}
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${output.color}`}>
                <Icon size={20} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{output.title}</p>
              <p className="mt-1 text-xs text-slate-500">{output.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button className="btn-secondary" onClick={() => navigate(`/outputs/review/${meeting.id}`)}>
          Back
        </button>
        <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating…' : `Generate ${selectedList.length} Output${selectedList.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}