import { useState } from 'react';
import { ArrowUpRight, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import { EmptyState, RaidTypeBadge } from '../ui';
import { useToast } from '../Toast';
import { supabase } from '../../lib/client';
import { saveRaidToRepository } from '../../lib/generator';
import { uid, nowISO } from '../../lib/utils';
import { ACTION_STATUS_LABELS } from '../../lib/utils';
import type { RaidItem, RaidType, Criticality, ActionStatus, Meeting } from '../../lib/types';

interface RaidTabProps {
  meeting: Meeting;
  raid: RaidItem[];
  onChanged: () => void;
}

interface RaidForm {
  type: RaidType;
  description: string;
  impact: string;
  owner: string;
  mitigation: string;
  follow_up_required: boolean;
  status: ActionStatus;
  criticality: Criticality;
}

const EMPTY_FORM: RaidForm = {
  type: 'risk',
  description: '',
  impact: '',
  owner: '',
  mitigation: '',
  follow_up_required: false,
  status: 'open',
  criticality: 'medium',
};

export default function RaidTab({ meeting, raid, onChanged }: RaidTabProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<RaidItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RaidForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: RaidItem) => {
    setEditing(item);
    setForm({
      type: item.type,
      description: item.description,
      impact: item.impact,
      owner: item.owner,
      mitigation: item.mitigation,
      follow_up_required: item.follow_up_required,
      status: item.status,
      criticality: item.criticality,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.description.trim()) return;
    setBusy(true);
    const payload = {
      type: form.type,
      description: form.description.trim(),
      impact: form.impact,
      owner: form.owner,
      mitigation: form.mitigation,
      follow_up_required: form.follow_up_required,
      status: form.status,
      criticality: form.criticality,
    };
    if (editing) {
      await supabase.from<RaidItem>('raid_items').update(payload).eq('id', editing.id);
    } else {
      const row: RaidItem = {
        id: uid(),
        meeting_id: meeting.id,
        ...payload,
        created_at: nowISO(),
      };
      await supabase.from<RaidItem>('raid_items').insert(row);
    }
    setBusy(false);
    closeModal();
    onChanged();
  };

  const remove = async (item: RaidItem) => {
    await supabase.from<RaidItem>('raid_items').delete().eq('id', item.id);
    onChanged();
  };

  const pushToRepo = async (item: RaidItem) => {
    await saveRaidToRepository(item);
    toast('Added to repository.');
    onChanged();
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <p className="text-sm font-semibold text-slate-500">RAID Items ({raid.length})</p>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} />
          Add RAID Item
        </button>
      </div>

      {raid.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<AlertTriangle size={24} />}
            title="No RAID items yet"
            message="Generate outputs or add one manually."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Type</th>
                <th className="th">Description</th>
                <th className="th">Impact</th>
                <th className="th">Owner</th>
                <th className="th">Mitigation / Next Step</th>
                <th className="th">Follow-up</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {raid.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 align-top hover:bg-slate-50">
                  <td className="td whitespace-nowrap">
                    <RaidTypeBadge type={item.type} />
                  </td>
                  <td className="td max-w-[260px]">
                    <p className="text-sm">{item.description}</p>
                  </td>
                  <td className="td max-w-[160px]">
                    <p className="text-xs text-slate-500">{item.impact || '—'}</p>
                  </td>
                  <td className="td whitespace-nowrap">{item.owner || '—'}</td>
                  <td className="td max-w-[160px]">
                    <p className="text-xs text-slate-500">{item.mitigation || '—'}</p>
                  </td>
                  <td className="td">
                    <span className={`badge ${item.follow_up_required ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.follow_up_required ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-0.5">
                      <button className="btn-icon" onClick={() => pushToRepo(item)} aria-label="Save to repository" title="Save to Repository">
                        <ArrowUpRight size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => openEdit(item)} aria-label="Edit RAID item" title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button className="btn-icon text-red-500 hover:bg-red-50" onClick={() => remove(item)} aria-label="Delete RAID item" title="Delete">
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
        title={editing ? 'Edit RAID Item' : 'Add RAID Item'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={closeModal} disabled={busy}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save} disabled={busy || !form.description.trim()}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RaidType }))}>
              <option value="risk">Risk</option>
              <option value="assumption">Assumption</option>
              <option value="issue">Issue</option>
              <option value="dependency">Dependency</option>
            </select>
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
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Impact</label>
            <input className="input" value={form.impact} onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value }))} />
          </div>
          <div>
            <label className="label">Mitigation</label>
            <input className="input" value={form.mitigation} onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))} />
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
            <label className="label">Criticality</label>
            <select className="input" value={form.criticality} onChange={(e) => setForm((f) => ({ ...f, criticality: e.target.value as Criticality }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={form.follow_up_required}
                onChange={(e) => setForm((f) => ({ ...f, follow_up_required: e.target.checked }))}
              />
              Follow-up Required
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}