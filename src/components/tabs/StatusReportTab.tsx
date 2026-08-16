import { useState } from 'react';
import { Copy, Check, ClipboardList } from 'lucide-react';
import { EmptyState, StatusDot } from '../ui';
import type { StatusReport } from '../../lib/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-slate-400">—</p>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function StatusReportTab({ report }: { report: StatusReport | null }) {
  const [copied, setCopied] = useState(false);

  if (!report) {
    return (
      <EmptyState
        icon={<ClipboardList size={24} />}
        title="No status report generated yet"
        message="Use 'Regenerate Outputs' to create one."
      />
    );
  }

  const plainText = [
    `Overall Status: ${report.overall_status.toUpperCase()}`,
    `Progress This Week\n${report.progress_this_week}`,
    `In Progress\n${report.in_progress.join('\n')}`,
    `Risks / Blockers\n${report.risks_blockers.join('\n')}`,
    `Next Steps\n${report.next_steps.join('\n')}`,
    `Support Needed\n${report.support_needed.join('\n')}`,
  ].join('\n\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">Stakeholder Status Report</p>
        <button className="btn-secondary" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy Report'}
        </button>
      </div>
      <div
        className={`mb-4 rounded-lg px-4 py-3 ${
          report.overall_status === 'green'
            ? 'bg-emerald-50 text-emerald-800'
            : report.overall_status === 'yellow'
              ? 'bg-amber-50 text-amber-800'
              : 'bg-red-50 text-red-800'
        }`}
      >
        <StatusDot status={report.overall_status} />
      </div>
      <div className="space-y-4">
        <Section title="Progress This Week">
          <p>{report.progress_this_week}</p>
        </Section>
        <Section title="In Progress">
          <BulletList items={report.in_progress} />
        </Section>
        <Section title="Risks / Blockers">
          <BulletList items={report.risks_blockers} />
        </Section>
        <Section title="Next Steps">
          <BulletList items={report.next_steps} />
        </Section>
        <Section title="Support Needed">
          <BulletList items={report.support_needed} />
        </Section>
      </div>
    </div>
  );
}