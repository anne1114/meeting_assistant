import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useToast } from './Toast';
import { supabase } from '../lib/client';
import { uid, nowISO, todayISO } from '../lib/utils';
import type { FollowUp, FollowUpType, FollowUpStatus, Criticality, Meeting } from '../lib/types';

interface RepositoryItemModalProps {
  open: boolean;
  onClose: () => void;
  meetings: Meeting[];
  initial?: Partial<FollowUp> | null;
  onSaved: (item: FollowUp) => void;
}

interface FormState {
  item_title: string;
  type: FollowUpType;
  status: FollowUpStatus;
  assigned_to: string;
  follow_up_date: string;
  criticality: Criticality;
  meeting_id: string;
  action_to_be_taken: string;
  notes: string;
}

interface FormErrors {
  item_title?: string;
  assigned_to?: string;
  follow_up_date?: string;
}

const EMPTY: FormState = {
  item_title: '',
  type: 'Action',
  status: 'to_do',
  assigned_to: '',
  follow_up_date: '',
  criticality: 'medium',
  meeting_id: '',
  action_to_be_taken: '',
  notes: '',
};

export default function RepositoryItemModal({ open, onClose, meetings, initial, onSaved }: RepositoryItemModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm({
        item_title: initial?.item_title ?? '',
        type: initial?.type ?? 'Action',
        status: initial?.status ?? 'to_do',
        assigned_to: initial?.assigned_to ?? '',
        follow_up_date: initial?.follow_up_date ?? '',
        criticality: initial?.criticality ?? 'medium',
        meeting_id: initial?.meeting_id ?? '',
        action_to_be_taken: initial?.action_to_be_taken ?? '',
        notes: initial?.notes ?? '',
      });
    }
  }, [open, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.item_title.trim()) errs.item_title = 'Item title is required';
    if (!form.assigned_to.trim()) errs.assigned_to = 'Assigned To is required';
    if (!form.follow_up_date) errs.follow_up_date = 'Due date is required';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        item_title: form.item_title.trim(),
        type: form.type,
        status: form.status,
        assigned_to: form.assigned_to.trim(),
        follow_up_date: form.follow_up_date,
        criticality: form.criticality,
        meeting_id: form.meeting_id || null,
        action_to_be_taken: form.action_to_be_taken.trim() || null,
        notes: form.notes.trim(),
      };
      let saved: FollowUp | null = null;
      if (initial?.id) {
        await supabase.from<FollowUp>('follow_ups').update(payload).eq('id', initial.id);
        saved = { ...(initial as FollowUp), ...payload };
      } else {
        const row: FollowUp = {
          id: uid(),
          meeting_id: payload.meeting_id,
          item_title: payload.item_title,
          type: payload.type,
          assigned_to: payload.assigned_to,
          follow_up_date: payload.follow_up_date,
          status: payload.status,
          notes: payload.notes,
          source_ref_id: null,
          criticality: payload.criticality,
          completed_on: null,
          action_to_be_taken: payload.action_to_be_taken,
          created_at: nowISO(),
        };
        await supabase.from<FollowUp>('follow_ups').insert(row);
        saved = row;
      }
      toast(initial?.id ? 'Item updated.' : 'Item added to repository.');
      onSaved(saved);
      onClose();
    } catch {
      toast('Failed to save item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sortedMeetings = [...meetings].sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit Follow-up Item' : 'Add Follow-up Item'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : initial?.id ? 'Update' : 'Add Item'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Item Title *</label>
          <input
            className="input"
            value={form.item_title}
            onChange={(e) => set('item_title', e.target.value)}
            placeholder="What needs to happen?"
          />
          {errors.item_title && <p className="mt-1 text-xs text-red-600">{errors.item_title}</p>}
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={(e) => set('type', e.target.value as FollowUpType)}>
            <option value="Action">Action</option>
            <option value="Follow-up">Follow-up</option>
            <option value="RAID">RAID</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as FollowUpStatus)}>
            <option value="to_do">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="label">Assigned To *</label>
          <input
            className="input"
            value={form.assigned_to}
            onChange={(e) => set('assigned_to', e.target.value)}
            placeholder="Person name"
          />
          {errors.assigned_to && <p className="mt-1 text-xs text-red-600">{errors.assigned_to}</p>}
        </div>
        <div>
          <label className="label">Due / Follow-up Date *</label>
          <input
            type="date"
            className="input"
            min={todayISO()}
            value={form.follow_up_date}
            onChange={(e) => set('follow_up_date', e.target.value)}
          />
          {errors.follow_up_date && <p className="mt-1 text-xs text-red-600">{errors.follow_up_date}</p>}
        </div>
        <div>
          <label className="label">Criticality</label>
          <select className="input" value={form.criticality} onChange={(e) => set('criticality', e.target.value as Criticality)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="label">Source Meeting</label>
          <select className="input" value={form.meeting_id} onChange={(e) => set('meeting_id', e.target.value)}>
            <option value="">None</option>
            {sortedMeetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.project_client})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Action to be Taken</label>
          <textarea
            className="input"
            rows={2}
            value={form.action_to_be_taken}
            onChange={(e) => set('action_to_be_taken', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}