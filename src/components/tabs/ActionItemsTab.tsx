import { useState } from 'react';
import { ArrowUpRight, Pencil, Plus, Trash2, ListChecks } from 'lucide-react';
import Modal from '../Modal';
import { EmptyState, PriorityBadge, StatusBadge } from '../ui';
import { useToast } from '../Toast';
import { supabase } from '../../lib/client';
import { saveActionToRepository } from '../../lib/generator';
import { uid, nowISO, formatDate } from '../../lib/utils';
import { ACTION_STATUS_LABELS } from '../../lib/utils';
import type { ActionItem, Priority, Criticality, ActionStatus, Meeting } from '../../lib/types';

interface ActionItemsTabProps {
  meeting: Meeting;
  actions: ActionItem[];
  onChanged: () => void;
}

interface ActionForm {
  title: string;
  owner: string;
  due_date: string;
  priority: Priority;
  criticality: Criticality;
  status: ActionStatus;
  follow_up_note: string;
}

const EMPTY_FORM: ActionForm = {
  title: '',
  owner: '',
  due_date: '',
  priority: 'medium',
  criticality: 'medium',
  status: 'open',
  follow_up_note: '',
};

export default function ActionItemsTab({ meeting, actions, onChanged }: ActionItemsTabProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<ActionItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ActionForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: ActionItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      owner: item.owner,
      due_date: item.due_date ?? '',
      priority: item.priority,
      criticality: item.criticality,
      status: item.status,
      follow_up_note: item.follow_up_note,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      owner: form.owner,
      due_date: form.due_date || null,
      priority: form.priority,
      criticality: form.criticality,
      status: form.status,
      follow_up_note: form.follow_up_note,
    };
    if (editing) {
      await supabase.from<ActionItem>('action_items').update(payload).eq('id', editing.id);
    } else {
      const row: ActionItem = {
        id: uid(),
        meeting_id: meeting.id,
        ...payload,
        created_at: nowISO(),
      };
      await supabase.from<ActionItem>('action_items').insert(row);
    }
    setBusy(false);
    closeModal();
    onChanged();
  };

  const remove = async (item: ActionItem) => {
    await supabase.from<ActionItem>('action_items').delete().eq('id', item.id);
    onChanged();
  };

  const pushToRepo = async (item: ActionItem) => {
    await saveActionToRepository(item);
    toast('Added to repository.');
    onChanged();
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <p className="text-sm font-semibold text-slate-500">
          Action Items ({actions.length})
        </p>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} />
          Add Action Item
        </button>
      </div>

      {actions.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ListChecks size={24} />}
            title="No action items yet"
            message="Generate outputs or add one manually."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Action Item</th>
                <th className="th">Owner</th>
                <th className="th">Due Date</th>
                <th className="th">Priority</th>
                <th className="th">Status</th>
                <th className="th">Follow-up</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 align-top hover:bg-slate-50">
                  <td className="td max-w-[280px]">
                    <p className="text-sm">{item.title}</p>
                  </td>
                  <td className="td whitespace-nowrap">{item.owner || '—'}</td>
                  <td className="td whitespace-nowrap">{formatDate(item.due_date)}</td>
                  <td className="td">
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td className="td">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="td max-w-[180px]">
                    <p className="truncate text-xs text-slate-500">{item.follow_up_note || '—'}</p>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <button className="btn-icon" onClick={() => pushToRepo(item)} aria-label="Save to repository" title="Save to Repository">
                        <ArrowUpRight size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => openEdit(item)} aria-label="Edit action item" title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button className="btn-icon text-red-500 hover:bg-red-50" onClick={() => remove(item)} aria-label="Delete action item" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Action Item' : 'Add Action Item'}
        footer={
          <>
            <button className="btn-secondary" onClick={closeModal} disabled={busy}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save} disabled={busy || !form.title.trim()}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <textarea
              className="input"
              rows={2}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Owner</label>
            <select className="input" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}>
              <option value="">Unassigned</option>
              {meeting.participants.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
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
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ActionStatus }))}>
              {Object.entries(ACTION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Follow-up Note</label>
            <input
              className="input"
              value={form.follow_up_note}
              onChange={(e) => setForm((f) => ({ ...f, follow_up_note: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}