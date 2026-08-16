import { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { EmptyState } from '../ui';
import type { MeetingMinutes } from '../../lib/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function MinutesTab({ minutes }: { minutes: MeetingMinutes | null }) {
  const [copied, setCopied] = useState(false);

  if (!minutes) {
    return (
      <EmptyState
        icon={<FileText size={24} />}
        title="No meeting minutes generated yet"
        message="Use 'Regenerate Outputs' to create them."
      />
    );
  }

  const plainText = [
    `Meeting Objective\n${minutes.objective}`,
    `Discussion Summary\n${minutes.discussion_summary}`,
    `Key Decisions\n${minutes.key_decisions.join('\n')}`,
    `Open Points\n${minutes.open_points.join('\n')}`,
    `Next Steps\n${minutes.next_steps.join('\n')}`,
  ].join('\n\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">Meeting Minutes</p>
        <button className="btn-secondary" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="space-y-4">
        <Section title="Meeting Objective">
          <p>{minutes.objective}</p>
        </Section>
        <Section title="Discussion Summary">
          <p>{minutes.discussion_summary}</p>
        </Section>
        <Section title="Key Decisions">
          <BulletList items={minutes.key_decisions} />
        </Section>
        <Section title="Open Points">
          <BulletList items={minutes.open_points} />
        </Section>
        <Section title="Next Steps">
          <BulletList items={minutes.next_steps} />
        </Section>
      </div>
    </div>
  );
}