import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, ArrowUpRight, RefreshCw, Pencil, Trash2, Plus, ArrowLeft, CalendarDays } from 'lucide-react';
import { PageHeader, Spinner, EmptyState } from '../components/ui';
import Modal from '../components/Modal';
import ConfirmationDialog from '../components/ConfirmationDialog';
import RepositoryItemModal from '../components/RepositoryItemModal';
import { supabase, asArray } from '../lib/client';
import { navigate } from '../lib/router';
import { formatDate, isThisWeek, truncate, parseCSV, joinCSV } from '../lib/utils';
import type { Meeting, ActionItem, RaidItem, MeetingMinutes, StatusReport, FollowUp } from '../lib/types';

const ITEMS_PER_PAGE = 5;

interface EditForm {
  title: string;
  project_client: string;
  meeting_date: string;
  participants: string;
  notes: string;
}

export default function Meetings({ week }: { week: string | null }) {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deleting, setDeleting] = useState<Meeting | null>(null);
  const [regenerating, setRegenerating] = useState<Meeting | null>(null);
  const [addToRepo, setAddToRepo] = useState<Meeting | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from<Meeting>('meetings').select();
    setMeetings(asArray(data));
    setPage(1);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allMeetings = useMemo(
    () => (meetings ?? []).sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)),
    [meetings]
  );

  const isFiltered = week === 'current';
  const visible = isFiltered ? allMeetings.filter((m) => isThisWeek(m.meeting_date)) : allMeetings;
  const totalPages = Math.max(1, Math.ceil(visible.length / ITEMS_PER_PAGE));
  const pageMeetings = visible.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const remarksFor = (m: Meeting) => {
    const lines = m.notes.split('\n').filter(Boolean).slice(0, 2);
    return lines.length > 0 ? truncate(lines.join(' · '), 60) : '';
  };

  const openEdit = (m: Meeting) => {
    setEditing(m);
    setEditForm({
      title: m.title,
      project_client: m.project_client,
      meeting_date: m.meeting_date,
      participants: joinCSV(m.participants),
      notes: m.notes,
    });
  };

  const saveEdit = async () => {
    if (!editing || !editForm) return;
    setBusy(true);
    await supabase
      .from<Meeting>('meetings')
      .update({
        title: editForm.title.trim(),
        project_client: editForm.project_client.trim(),
        meeting_date: editForm.meeting_date,
        participants: parseCSV(editForm.participants),
        notes: editForm.notes,
      })
      .eq('id', editing.id);
    setBusy(false);
    setEditing(null);
    void load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const id = deleting.id;
    await Promise.all([
      supabase.from<ActionItem>('action_items').delete().eq('meeting_id', id),
      supabase.from<RaidItem>('raid_items').delete().eq('meeting_id', id),
      supabase.from<MeetingMinutes>('meeting_minutes').delete().eq('meeting_id', id),
      supabase.from<StatusReport>('status_reports').delete().eq('meeting_id', id),
      supabase.from<FollowUp>('follow_ups').update({ meeting_id: null }).eq('meeting_id', id),
      supabase.from<Meeting>('meetings').delete().eq('id', id),
    ]);
    setBusy(false);
    setDeleting(null);
    void load();
  };

  const confirmRegenerate = () => {
    if (!regenerating) return;
    const id = regenerating.id;
    void supabase
      .from<Meeting>('meetings')
      .update({ outputs_generated: false, selected_outputs: ['minutes', 'actions', 'raid', 'status'] })
      .eq('id', id);
    setRegenerating(null);
    navigate(`/outputs/select/${id}`);
  };

  if (!meetings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Meetings"
        subtitle="View, filter, edit and regenerate meeting outputs."
        actions={
          <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
            <Plus size={16} />
            Add New Meeting
          </button>
        }
      />

      {isFiltered && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <span className="badge bg-brand-50 text-brand-700">Filtered by: Week: Current Week</span>
        </div>
      )}

      {meetings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="No meetings yet"
          message="Create your first meeting to start generating AI-powered outputs."
          action={
            <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
              <Plus size={16} />
              Add New Meeting
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="No meetings this week"
          message="There are no meetings scheduled for the current week."
          action={
            <button className="btn-primary" onClick={() => navigate('/meetings/new')}>
              <Plus size={16} />
              Add New Meeting
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="th">Title</th>
                  <th className="th">People Involved</th>
                  <th className="th">Date</th>
                  <th className="th">Transcript</th>
                  <th className="th">Remarks</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageMeetings.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/outputs/review/${m.id}`)}
                    className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                  >
                    <td className="td">
                      <p className="font-medium text-slate-900">{m.title}</p>
                      <p className="text-xs text-slate-500">{m.project_client}</p>
                    </td>
                    <td className="td">
                      <p className="max-w-[180px] truncate text-xs text-slate-500">{joinCSV(m.participants)}</p>
                    </td>
                    <td className="td whitespace-nowrap">{formatDate(m.meeting_date)}</td>
                    <td className="td">{m.transcript ? 'Yes' : 'No'}</td>
                    <td className="td">
                      <p className="max-w-[200px] truncate text-xs text-slate-500">{remarksFor(m)}</p>
                    </td>
                    <td className="td" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button className="btn-icon" onClick={() => navigate(`/outputs/review/${m.id}`)} aria-label="View outputs" title="View">
                          <Eye size={16} />
                        </button>
                        <button className="btn-icon" onClick={() => setAddToRepo(m)} aria-label="Add to repository" title="Add to Repository">
                          <ArrowUpRight size={16} />
                        </button>
                        <button className="btn-icon" onClick={() => setRegenerating(m)} aria-label="Regenerate outputs" title="Regenerate Outputs">
                          <RefreshCw size={16} />
                        </button>
                        <button className="btn-icon" onClick={() => openEdit(m)} aria-label="Edit meeting" title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-icon text-red-500 hover:bg-red-50" onClick={() => setDeleting(m)} aria-label="Delete meeting" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages} · {visible.length} meeting{visible.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Meeting"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn-primary" onClick={saveEdit} disabled={busy}>
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editForm && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Meeting Title</label>
              <input
                className="input"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => f && { ...f, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Project / Client</label>
              <input
                className="input"
                value={editForm.project_client}
                onChange={(e) => setEditForm((f) => f && { ...f, project_client: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Meeting Date</label>
              <input
                type="date"
                className="input"
                value={editForm.meeting_date}
                onChange={(e) => setEditForm((f) => f && { ...f, meeting_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Participants (comma-separated)</label>
              <input
                className="input"
                value={editForm.participants}
                onChange={(e) => setEditForm((f) => f && { ...f, participants: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => f && { ...f, notes: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        open={deleting !== null}
        title="Delete Meeting?"
        message={`Are you sure you want to delete '${deleting?.title ?? ''}'? All generated outputs will be removed and repository items will become standalone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={busy}
      />

      <ConfirmationDialog
        open={regenerating !== null}
        title="Regenerate Outputs?"
        message={`Regenerate all outputs for '${regenerating?.title ?? ''}' from its current transcript and notes?`}
        confirmLabel="Regenerate"
        onConfirm={confirmRegenerate}
        onCancel={() => setRegenerating(null)}
      />

      {addToRepo && (
        <RepositoryItemModal
          open={addToRepo !== null}
          onClose={() => setAddToRepo(null)}
          meetings={meetings}
          initial={{ meeting_id: addToRepo.id, assigned_to: addToRepo.participants[0] ?? '', type: 'Follow-up' }}
          onSaved={() => undefined}
        />
      )}
    </div>
  );
}