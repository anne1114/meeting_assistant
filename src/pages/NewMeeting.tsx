import { useState } from 'react';
import { ArrowLeft, Plus, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { supabase, useRemoteDb } from '../lib/client';
import { aiSummarize } from '../lib/gemini';
import { navigate } from '../lib/router';
import { uid, nowISO, todayISO } from '../lib/utils';
import type { Meeting } from '../lib/types';

export default function NewMeeting() {
  const [title, setTitle] = useState('');
  const [projectClient, setProjectClient] = useState('');
  const [meetingDate, setMeetingDate] = useState(todayISO());
  const [participants, setParticipants] = useState<string[]>(['']);
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const validParticipants = participants.map((p) => p.trim()).filter(Boolean);
  const canContinue = Boolean(title.trim() && projectClient.trim() && meetingDate && validParticipants.length > 0);

  const updateParticipant = (idx: number, value: string) => {
    setParticipants((prev) => prev.map((p, i) => (i === idx ? value : p)));
  };

  const addParticipant = () => setParticipants((prev) => [...prev, '']);
  const removeParticipant = (idx: number) => {
    setParticipants((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']));
  };

  const validate = (): string => {
    if (!title.trim() || !projectClient.trim()) return 'Please fill in the meeting title and project/client.';
    if (validParticipants.length === 0) return 'Add at least one participant.';
    return '';
  };

  const saveMeeting = async (): Promise<Meeting | null> => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return null;
    }
    setError('');
    setSaving(true);
    try {
      const meeting: Meeting = {
        id: uid(),
        title: title.trim(),
        project_client: projectClient.trim(),
        meeting_date: meetingDate,
        participants: validParticipants,
        transcript,
        notes,
        selected_outputs: [],
        outputs_generated: false,
        status: 'draft',
        report_saved: false,
        created_at: nowISO(),
      };
      const { data, error: saveError } = await supabase.from<Meeting>('meetings').insert(meeting);
      if (saveError || !data) {
        setError('Failed to save meeting. Please try again.');
        return null;
      }
      return meeting;
    } catch {
      setError('Failed to save meeting. Please try again.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleAiSummarize = async () => {
    if (!transcript.trim()) {
      setError('Paste a transcript first, then summarize.');
      return;
    }
    setError('');
    setSummarizing(true);
    try {
      const summary = await aiSummarize(transcript, 'summary');
      setNotes((prev) => (prev.trim() ? `${prev.trim()}\n\n${summary}` : summary));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI summarize failed.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleSaveAndView = async () => {
    const saved = await saveMeeting();
    if (saved) navigate('/meetings');
  };

  const handleContinue = async () => {
    const saved = await saveMeeting();
    if (saved) navigate(`/outputs/select/${saved.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <button className="btn-ghost mb-4" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
      <PageHeader
        title="Add New Meeting"
        subtitle="Capture meeting metadata, participants and content."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Basic Info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Meeting Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sprint Planning" />
          </div>
          <div>
            <label className="label">Project / Client</label>
            <input className="input" value={projectClient} onChange={(e) => setProjectClient(e.target.value)} placeholder="e.g. Atlas Migration" />
          </div>
          <div>
            <label className="label">Meeting Date</label>
            <input type="date" className="input" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Participants</h2>
        <div className="space-y-2">
          {participants.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="input"
                value={p}
                onChange={(e) => updateParticipant(idx, e.target.value)}
                placeholder={`Participant ${idx + 1} name`}
              />
              <button className="btn-icon text-red-500 hover:bg-red-50" onClick={() => removeParticipant(idx)} aria-label="Remove participant">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button className="btn-secondary mt-3" onClick={addParticipant}>
          <Plus size={16} />
          Add Participant
        </button>
      </div>

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Transcript & Notes</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="label">Meeting Transcript</label>
            <textarea
              className="input min-h-[140px] font-mono text-xs"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the meeting transcript here…"
            />
            {useRemoteDb && (
              <button
                className="btn-secondary mt-2"
                onClick={handleAiSummarize}
                disabled={summarizing || !transcript.trim()}
              >
                <Sparkles size={14} />
                {summarizing ? 'Summarizing…' : 'Summarize with AI'}
              </button>
            )}
          </div>
          <div>
            <label className="label">Meeting Notes</label>
            <textarea
              className="input min-h-[120px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bullet points or manual notes…"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <div>
            <UploadCloud size={24} className="mx-auto text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-500">File upload coming soon</p>
            <p className="text-xs text-slate-400">This area is a placeholder — paste text above instead.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <button className="btn-secondary" onClick={handleSaveAndView} disabled={saving}>
          {saving ? 'Saving…' : 'Save & View in Meetings'}
        </button>
        <button className="btn-primary" onClick={handleContinue} disabled={!canContinue || saving}>
          {saving ? 'Saving…' : 'Continue to Output Selection'}
        </button>
      </div>
    </div>
  );
}