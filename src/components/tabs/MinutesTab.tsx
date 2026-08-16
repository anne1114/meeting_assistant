import { useState } from 'react';
import { Copy, Check, FileText, Sparkles } from 'lucide-react';
import { EmptyState } from '../ui';
import { useRemoteDb } from '../../lib/client';
import { aiSummarize } from '../../lib/gemini';
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

export default function MinutesTab({
  minutes,
  transcript,
  onRefined,
}: {
  minutes: MeetingMinutes | null;
  transcript?: string;
  onRefined?: (minutes: MeetingMinutes) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState('');

  if (!minutes) {
    return (
      <EmptyState
        icon={<FileText size={24} />}
        title="No meeting minutes generated yet"
        message="Use 'Regenerate Outputs' to create them."
      />
    );
  }

  const canRefine = Boolean(onRefined && useRemoteDb && transcript?.trim());

  const handleRefine = async () => {
    if (!transcript) return;
    setRefineError('');
    setRefining(true);
    try {
      const [summary, decisions] = await Promise.all([
        aiSummarize(transcript, 'summary'),
        aiSummarize(transcript, 'decisions'),
      ]);
      const keyDecisions = decisions
        .split('\n')
        .map((l) => l.trim().replace(/^[-*]\s*/, ''))
        .filter(Boolean);
      onRefined?.({ ...minutes, discussion_summary: summary, key_decisions: keyDecisions });
    } catch (e) {
      setRefineError(e instanceof Error ? e.message : 'AI refine failed.');
    } finally {
      setRefining(false);
    }
  };

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
        <div className="flex items-center gap-2">
          {canRefine && (
            <button className="btn-secondary" onClick={handleRefine} disabled={refining}>
              <Sparkles size={14} />
              {refining ? 'Refining…' : 'AI-refine'}
            </button>
          )}
          <button className="btn-secondary" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      {refineError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{refineError}</div>
      )}
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