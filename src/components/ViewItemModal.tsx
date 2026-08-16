import Modal from './Modal';
import { StatusBadge, CriticalityBadge, Badge } from './ui';
import { formatDate, dueDateClass } from '../lib/utils';
import type { FollowUp } from '../lib/types';

interface ViewItemModalProps {
  open: boolean;
  onClose: () => void;
  item: FollowUp | null;
  meetingTitle: string | null;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

export default function ViewItemModal({ open, onClose, item, meetingTitle }: ViewItemModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Follow-up Item Details"
      size="md"
      footer={
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {item && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <DetailRow label="Item Title">{item.item_title}</DetailRow>
          </div>
          <DetailRow label="Type">
            <Badge
              className={
                item.type === 'Action'
                  ? 'bg-emerald-50 text-emerald-700'
                  : item.type === 'RAID'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-blue-50 text-blue-700'
              }
            >
              {item.type}
            </Badge>
          </DetailRow>
          <DetailRow label="Source Meeting">{meetingTitle ?? '—'}</DetailRow>
          <DetailRow label="Assigned To">{item.assigned_to || '—'}</DetailRow>
          <DetailRow label="Due Date">
            <span className={dueDateClass(item)}>{formatDate(item.follow_up_date)}</span>
          </DetailRow>
          <DetailRow label="Status">
            <StatusBadge status={item.status} />
          </DetailRow>
          <DetailRow label="Criticality">
            <CriticalityBadge criticality={item.criticality} />
          </DetailRow>
          <div className="sm:col-span-2">
            <DetailRow label="Action to be Taken">{item.action_to_be_taken || '—'}</DetailRow>
          </div>
          <div className="sm:col-span-2">
            <DetailRow label="Notes">{item.notes || '—'}</DetailRow>
          </div>
          <DetailRow label="Completed On">{formatDate(item.completed_on)}</DetailRow>
          <DetailRow label="Created">{formatDate(item.created_at.slice(0, 10))}</DetailRow>
        </div>
      )}
    </Modal>
  );
}