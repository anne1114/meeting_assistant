import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, User, Calendar, StickyNote, ArrowUpRight } from 'lucide-react';
import { PageHeader, Spinner, EmptyState, StatusBadge, CriticalityBadge } from '../components/ui';
import RepositoryItemModal from '../components/RepositoryItemModal';
import { supabase, asArray } from '../lib/client';
import { uid, nowISO, formatDate, parseCSV } from '../lib/utils';
import type { QuickNote, QuickNoteStatus, Criticality, Meeting, FollowUpStatus } from '../lib/types';

interface NoteForm {
  title: string;
  description: string;
  due_date: string;
  assigned_to: string;
  people_involved: string;
  status: QuickNoteStatus;
  criticality: Criticality;
}

const EMPTY_FORM: NoteForm = {
  title: '',
  description: '',
  due_date: '',
  assigned_to: '',
  people_involved: '',
  status: 'to_do',
  criticality: 'medium',
};

export default function QuickNotes() {
  const [notes, setNotes] = useState<QuickNote[] | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NoteForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [repoNote, setRepoNote] = useState<QuickNote | null>(null);

  const load = useCallback(async () => {
    const [notesRes, meetingsRes] = await Promise.all([
      supabase.from<QuickNote>('quick_notes').select(),
      supabase.from<Meeting>('meetings').select(),
    ]);
    const sorted = asArray(notesRes.data).sort((a, b) => b.created_at.localeCompare(a.created_at));
    setNotes(sorted);
    setMeetings(asArray(meetingsRes.data));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNote = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const row: QuickNote = {
      id: uid(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      people_involved: parseCSV(form.people_involved),
      assigned_to: form.assigned_to.trim() || null,
      status: form.status,
      criticality: form.criticality,
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    await supabase.from<QuickNote>('quick_notes').insert(row);
    setSaving(false);
    setForm(EMPTY_FORM);
    setShowForm(false);
    void load();
  };

  const deleteNote = async (note: QuickNote) => {
    await supabase.from<QuickNote>('quick_notes').delete().eq('id', note.id);
    void load();
  };

  if (!notes) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Quick Notes"
        subtitle="Capture ideas, reminders, and ad-hoc actions that aren't tied to a formal meeting."
        actions={
          <button className={showForm ? 'btn-secondary' : 'btn-primary'} onClick={() => setShowForm((s) => !s)}>
            {showForm ? <Plus size={16} className="rotate-45" /> : <Plus size={16} />}
            {showForm ? 'Close' : 'New Note'}
          </button>
        }
      />

      {showForm && (
        <div className="card mb-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Assigned To</label>
              <input className="input" value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))} />
            </div>
            <div>
              <label className="label">People Involved (comma-separated)</label>
              <input className="input" value={form.people_involved} onChange={(e) => setForm((f) => ({ ...f, people_involved: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as QuickNoteStatus }))}>
                <option value="to_do">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="label">Criticality</label>
              <select className="input" value={form.criticality} onChange={(e) => setForm((f) => ({ ...f, criticality: e.target.value as Criticality }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn-primary" onClick={saveNote} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={24} />}
          title="No quick notes yet"
          message="Capture ideas, reminders, and ad-hoc actions that aren't tied to a formal meeting."
          action={
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} />
              New Note
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div key={note.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                <button className="btn-icon shrink-0 text-red-500 hover:bg-red-50" onClick={() => deleteNote(note)} aria-label="Delete note">
                  <Trash2 size={16} />
                </button>
              </div>
              {note.description && (
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{note.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={note.status} />
                <CriticalityBadge criticality={note.criticality} />
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  {note.assigned_to || 'Unassigned'}
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  {formatDate(note.due_date)}
                </p>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <button className="btn-secondary w-full" onClick={() => setRepoNote(note)}>
                  <ArrowUpRight size={16} />
                  Add to Repository
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {repoNote && (
        <RepositoryItemModal
          open={repoNote !== null}
          onClose={() => setRepoNote(null)}
          meetings={meetings}
          initial={{
            item_title: repoNote.title,
            notes: repoNote.description ?? '',
            assigned_to: repoNote.assigned_to ?? '',
            follow_up_date: repoNote.due_date ?? undefined,
            criticality: repoNote.criticality,
            status: repoNote.status as FollowUpStatus,
            type: 'Follow-up',
          }}
          onSaved={() => undefined}
        />
      )}
    </div>
  );
}