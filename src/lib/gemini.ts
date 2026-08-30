import { SUPABASE_URL, SUPABASE_ANON_KEY } from './client';
import type { OutputType } from './types';

export type AiKind = 'summary' | 'decisions';

export interface AiMinutes {
  objective: string;
  discussion_summary: string;
  key_decisions: string[];
  open_points: string[];
  next_steps: string[];
}

export interface AiAction {
  title: string;
  owner?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high';
  criticality?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AiRaid {
  type: 'risk' | 'assumption' | 'issue' | 'dependency';
  description: string;
  impact?: string;
  mitigation?: string;
  owner?: string;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AiStatus {
  overall_status: 'green' | 'yellow' | 'red';
  progress_this_week: string;
  in_progress: string[];
  risks_blockers: string[];
  next_steps: string[];
  support_needed: string[];
}

export interface AiReport {
  minutes?: AiMinutes;
  actions?: AiAction[];
  raid?: AiRaid[];
  status?: AiStatus;
}

async function postReport(text: string, kind: string): Promise<unknown> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('AI reports need Supabase configured (remote mode).');
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ text, kind }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: string }).error ?? '';
    } catch {
      // ignore body parse errors
    }
    throw new Error(detail || `AI report request failed (${res.status}).`);
  }
  const data = (await res.json()) as { json?: unknown; summary?: string };
  if (data.json !== undefined) return data.json;
  return data.summary ?? '';
}

export async function aiSummarize(text: string, kind: AiKind): Promise<string> {
  const out = await postReport(text, kind);
  return typeof out === 'string' ? out : '';
}

export function aiReportKind(kind: OutputType): string {
  return kind;
}

export async function aiGenerateReports(text: string, selected: OutputType[]): Promise<AiReport> {
  const results = await Promise.all(
    selected.map(async (kind) => ({ kind, data: (await postReport(text, aiReportKind(kind))) as never }))
  );
  const report: AiReport = {};
  for (const r of results) {
    report[r.kind] = r.data;
  }
  return report;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function normalizeAiMinutes(value: unknown): AiMinutes {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    objective: typeof v.objective === 'string' ? v.objective : '',
    discussion_summary: typeof v.discussion_summary === 'string' ? v.discussion_summary : '',
    key_decisions: asStringArray(v.key_decisions),
    open_points: asStringArray(v.open_points),
    next_steps: asStringArray(v.next_steps),
  };
}

export function normalizeAiActions(value: unknown): AiAction[] {
  const root = (value ?? {}) as Record<string, unknown>;
  const list = Array.isArray(root.actions) ? root.actions : [];
  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      title: typeof x.title === 'string' ? x.title : '',
      owner: typeof x.owner === 'string' ? x.owner : null,
      due_date: typeof x.due_date === 'string' && x.due_date.trim() ? x.due_date : null,
      priority: (['low', 'medium', 'high'] as const).includes(x.priority as never)
        ? (x.priority as AiAction['priority'])
        : 'medium',
      criticality: (['low', 'medium', 'high', 'critical'] as const).includes(x.criticality as never)
        ? (x.criticality as AiAction['criticality'])
        : 'medium',
    }))
    .filter((a) => a.title);
}

export function normalizeAiRaid(value: unknown): AiRaid[] {
  const root = (value ?? {}) as Record<string, unknown>;
  const list = Array.isArray(root.raid) ? root.raid : [];
  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      type: (['risk', 'assumption', 'issue', 'dependency'] as const).includes(x.type as never)
        ? (x.type as AiRaid['type'])
        : 'issue',
      description: typeof x.description === 'string' ? x.description : '',
      impact: typeof x.impact === 'string' ? x.impact : '',
      mitigation: typeof x.mitigation === 'string' ? x.mitigation : '',
      owner: typeof x.owner === 'string' ? x.owner : '',
      criticality: (['low', 'medium', 'high', 'critical'] as const).includes(x.criticality as never)
        ? (x.criticality as AiRaid['criticality'])
        : 'medium',
    }))
    .filter((r) => r.description);
}

export function normalizeAiStatus(value: unknown): AiStatus {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    overall_status: (['green', 'yellow', 'red'] as const).includes(v.overall_status as never)
      ? (v.overall_status as AiStatus['overall_status'])
      : 'yellow',
    progress_this_week: typeof v.progress_this_week === 'string' ? v.progress_this_week : '',
    in_progress: asStringArray(v.in_progress),
    risks_blockers: asStringArray(v.risks_blockers),
    next_steps: asStringArray(v.next_steps),
    support_needed: asStringArray(v.support_needed),
  };
}