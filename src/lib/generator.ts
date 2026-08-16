import { uid, nowISO } from './utils';
import { supabase, asArray, asSingle } from './client';
import type {
  Meeting,
  ActionItem,
  RaidItem,
  MeetingMinutes,
  StatusReport,
  FollowUp,
  OutputType,
  RaidType,
  Priority,
  Criticality,
  ActionStatus,
} from './types';

const DECISION_KEYWORDS = ['decided', 'agreed', 'approved', 'concluded', 'resolved', 'confirmed', 'settled', 'finalized', 'we will go with'];
const OPEN_KEYWORDS = ['open question', 'open item', 'pending', 'tbd', 'to be determined', 'unresolved', 'undecided', 'to be discussed', 'still open', 'not yet decided', 'follow-up needed'];
const NEXT_STEP_KEYWORDS = ['next step', 'next steps', 'will send', 'will share', 'will review', 'will prepare', 'will update', 'will follow up', 'will follow-up', 'will circulate', 'will book', 'will schedule', 'will arrange', 'will coordinate'];
const ACTION_KEYWORDS = ['will', 'should', 'need to', 'to do', 'action item', 'follow up', 'follow-up', 'owner:', 'assigned to:', 'responsible:', 'due by', 'must'];
const RISK_KEYWORDS = ['risk', 'concern', 'threat', 'exposure', 'uncertain', 'might fail', 'could fail', 'potential issue', 'danger', 'vulnerab'];
const ASSUMPTION_KEYWORDS = ['assumption', 'assuming', 'presumed', 'presume', 'we expect that', 'assume that'];
const ISSUE_KEYWORDS = ['issue', 'problem', 'blocker', 'bug', 'failing', 'delay', 'delays', 'overdue', 'broken', 'error', 'incident', 'conflict', 'dispute'];
const DEPENDENCY_KEYWORDS = ['dependency', 'depends on', 'waiting on', 'waiting for', 'requires', 'blocked by', 'relies on', 'dependent on', 'needs input from'];
const IN_PROGRESS_KEYWORDS = ['in progress', 'working on', 'currently', 'ongoing', 'started'];
const SUPPORT_KEYWORDS = ['need help', 'need support', 'support', 'escalat', 'need from', 'require assistance', 'we need'];
const HIGH_PRIORITY_KEYWORDS = ['high priority', 'urgent', 'asap', 'critical', 'immediately'];
const LOW_PRIORITY_KEYWORDS = ['low priority', 'when possible', 'nice to have', 'backlog'];
const OBJECTIVE_KEYWORDS = ['objective', 'goal', 'purpose', 'agenda'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export interface GeneratedOutputs {
  minutes?: MeetingMinutes;
  actions?: ActionItem[];
  raid?: RaidItem[];
  status?: StatusReport;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?;])\s+|\n+|•\s*|\*\s*|–|—|-\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasAny(sentence: string, keywords: string[]): boolean {
  const lower = sentence.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function firstKeyword(sentence: string, keywords: string[]): string | null {
  const lower = sentence.toLowerCase();
  for (const k of keywords) {
    if (lower.indexOf(k.toLowerCase()) >= 0) return k;
  }
  return null;
}

function stripPrefix(sentence: string, keyword: string): string {
  const idx = sentence.toLowerCase().indexOf(keyword.toLowerCase());
  let rest = idx >= 0 ? sentence.slice(idx + keyword.length) : sentence;
  rest = rest.replace(/^[\s:,;.\-–—]+/, '');
  rest = rest.replace(
    /^(?:of\s+this\s+meeting\s+is\s+to|of\s+the\s+meeting\s+is\s+to|of\s+the\s+session\s+is\s+to|of\s+today's\s+meeting\s+is\s+to|is\s+to|was\s+to|are\s+to|is\s+|of\s+|to\s+)/i,
    ''
  );
  rest = rest.replace(
    /^(?:there\s+is\s+(?:a|an|the|)\s+|there\s+are\s+|which\s+is\s+|that\s+is\s+|we\s+have\s+(?:a|an|the)\s+|that\s+(?:the|this|a|an|we|our|their|there|it)\s+|it\s+is\s+|a\s+|an\s+|the\s+)/i,
    ''
  );
  return rest.trim();
}

function dedupMax(sentences: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sentences) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
    if (out.length >= max) break;
  }
  return out;
}

function detectOwner(sentence: string, participants: string[]): string {
  const lower = sentence.toLowerCase();
  for (const p of participants) {
    if (p && lower.includes(p.toLowerCase())) return p;
  }
  const m = lower.match(/(?:owner|assigned to|responsible)[:\s]+([a-z][a-z\s.,'-]+)/i);
  if (m) {
    return m[1]
      .replace(/\s+/g, ' ')
      .trim()
      .split(/[\s,.]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ');
  }
  return '';
}

function detectDueDate(sentence: string): string | null {
  const lower = sentence.toLowerCase();
  const byDay = lower.match(/by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (byDay) return byDay[1][0].toUpperCase() + byDay[1].slice(1);
  if (lower.includes('by end of week')) return 'End of Week';
  if (lower.includes('by next week')) return 'Next Week';
  const slash = lower.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slash) return `${slash[1]}/${slash[2]}`;
  const month = lower.match(new RegExp(`\\b(${MONTHS.join('|')})[a-z]*\\.?\\s+(\\d{1,2})\\b`, 'i'));
  if (month) return `${month[1][0].toUpperCase()}${month[1].slice(1)} ${month[2]}`;
  return null;
}

function detectPriority(sentence: string): Priority {
  if (hasAny(sentence, HIGH_PRIORITY_KEYWORDS)) return 'high';
  if (hasAny(sentence, LOW_PRIORITY_KEYWORDS)) return 'low';
  return 'medium';
}

function extractObjective(sentences: string[]): string | null {
  for (const s of sentences) {
    const kw = firstKeyword(s, OBJECTIVE_KEYWORDS);
    if (kw) {
      const stripped = stripPrefix(s, kw);
      if (stripped) return stripped;
    }
  }
  return null;
}

function extractDiscussion(sentences: string[]): string[] {
  const excluded = [...DECISION_KEYWORDS, ...NEXT_STEP_KEYWORDS, ...ACTION_KEYWORDS];
  const out: string[] = [];
  for (const s of sentences) {
    if (hasAny(s, excluded)) continue;
    out.push(s);
    if (out.length >= 4) break;
  }
  return out;
}

function extractByKeywords(sentences: string[], keywords: string[], max: number): string[] {
  return dedupMax(sentences.filter((s) => hasAny(s, keywords)), max);
}

function buildActions(meeting: Meeting, sentences: string[]): ActionItem[] {
  return dedupMax(sentences.filter((s) => hasAny(s, ACTION_KEYWORDS)), 20).map((s) => ({
    id: uid(),
    meeting_id: meeting.id,
    title: s,
    owner: detectOwner(s, meeting.participants),
    due_date: detectDueDate(s),
    priority: detectPriority(s),
    status: 'open' as ActionStatus,
    follow_up_note: '',
    criticality: 'medium' as Criticality,
    created_at: nowISO(),
  }));
}

function buildRaid(meeting: Meeting, sentences: string[]): RaidItem[] {
  const categories: Array<{ type: RaidType; keywords: string[] }> = [
    { type: 'risk', keywords: RISK_KEYWORDS },
    { type: 'assumption', keywords: ASSUMPTION_KEYWORDS },
    { type: 'issue', keywords: ISSUE_KEYWORDS },
    { type: 'dependency', keywords: DEPENDENCY_KEYWORDS },
  ];
  const out: RaidItem[] = [];
  for (const cat of categories) {
    for (const s of dedupMax(sentences.filter((x) => hasAny(x, cat.keywords)), 8)) {
      const kw = firstKeyword(s, cat.keywords) ?? cat.type;
      const description = stripPrefix(s, kw);
      out.push({
        id: uid(),
        meeting_id: meeting.id,
        type: cat.type,
        description: description || s,
        impact: '',
        owner: detectOwner(s, meeting.participants),
        mitigation: '',
        follow_up_required: false,
        status: 'open' as ActionStatus,
        criticality: 'medium' as Criticality,
        created_at: nowISO(),
      });
    }
  }
  return out;
}

function buildStatusReport(meeting: Meeting, sentences: string[], actions: ActionItem[]): StatusReport {
  const discussion = extractDiscussion(sentences);
  const risksBlockers = dedupMax(sentences.filter((s) => hasAny(s, [...RISK_KEYWORDS, ...ISSUE_KEYWORDS])), 6);
  const inProgress = dedupMax(sentences.filter((s) => hasAny(s, IN_PROGRESS_KEYWORDS)), 6);
  const nextSteps = extractByKeywords(sentences, NEXT_STEP_KEYWORDS, 6);
  const supportNeeded = dedupMax(sentences.filter((s) => hasAny(s, SUPPORT_KEYWORDS)), 6);
  const openActions = actions.filter((a) => a.status === 'open').length;
  const overallStatus = risksBlockers.length > 0 ? 'red' : openActions > 2 ? 'yellow' : 'green';
  return {
    id: uid(),
    meeting_id: meeting.id,
    overall_status: overallStatus,
    progress_this_week:
      discussion.join(' ') || 'The team continued work on the current sprint and made steady progress on the open items.',
    in_progress: inProgress,
    risks_blockers: risksBlockers,
    next_steps: nextSteps,
    support_needed: supportNeeded,
    created_at: nowISO(),
  };
}

export function generateOutputs(meeting: Meeting, selected: OutputType[]): GeneratedOutputs {
  const text = [meeting.transcript, meeting.notes].filter(Boolean).join('\n');
  const sentences = splitSentences(text);
  const out: GeneratedOutputs = {};

  if (selected.includes('minutes')) {
    const discussion = extractDiscussion(sentences);
    const decisions = extractByKeywords(sentences, DECISION_KEYWORDS, 8);
    const openPoints = extractByKeywords(sentences, OPEN_KEYWORDS, 8);
    const nextSteps = extractByKeywords(sentences, NEXT_STEP_KEYWORDS, 10);
    out.minutes = {
      id: uid(),
      meeting_id: meeting.id,
      objective: extractObjective(sentences) ?? `Discuss ${meeting.title} and align on next steps.`,
      discussion_summary:
        discussion.join(' ') || 'The team reviewed the current state of the project and discussed the open items on the agenda.',
      key_decisions: decisions.length > 0 ? decisions : ['No explicit decisions recorded in the transcript.'],
      open_points: openPoints.length > 0 ? openPoints : ['No open points identified.'],
      next_steps: nextSteps.length > 0 ? nextSteps : ['Follow up on discussed items before the next meeting.'],
      created_at: nowISO(),
    };
  }

  if (selected.includes('actions')) {
    out.actions = buildActions(meeting, sentences);
  }

  if (selected.includes('raid')) {
    out.raid = buildRaid(meeting, sentences);
  }

  if (selected.includes('status')) {
    out.status = buildStatusReport(meeting, sentences, out.actions ?? []);
  }

  return out;
}

interface RepositorySource {
  id: string;
  title: string;
  owner: string;
  status: ActionStatus;
  criticality: Criticality;
  created_at: string;
}

async function pushToRepository(meetingId: string, type: FollowUp['type'], items: RepositorySource[]): Promise<void> {
  const { data: existing } = await supabase
    .from<FollowUp>('follow_ups')
    .select()
    .eq('meeting_id', meetingId)
    .eq('type', type);
  const existingRefs = new Set(asArray(existing).map((f) => f.source_ref_id));
  const toInsert = items
    .filter((i) => !existingRefs.has(i.id))
    .map((i) => ({
      id: uid(),
      meeting_id: meetingId,
      item_title: i.title,
      type,
      assigned_to: i.owner,
      follow_up_date: null,
      status: i.status as FollowUp['status'],
      notes: '',
      source_ref_id: i.id,
      criticality: i.criticality,
      completed_on: null,
      action_to_be_taken: null,
      created_at: nowISO(),
    }));
  if (toInsert.length > 0) {
    await supabase.from<FollowUp>('follow_ups').insert(toInsert);
  }
}

export async function generateAndPersist(meetingId: string, selected: OutputType[]): Promise<void> {
  const { data } = await supabase
    .from<Meeting>('meetings')
    .select()
    .eq('id', meetingId)
    .maybeSingle();
  const meeting = asSingle(data);
  if (!meeting) return;

  const out = generateOutputs(meeting, selected);

  if (out.minutes) {
    await supabase.from('meeting_minutes').upsert([out.minutes], { onConflict: 'meeting_id' });
  }
  if (out.status) {
    await supabase.from('status_reports').upsert([out.status], { onConflict: 'meeting_id' });
  }
  if (out.actions) {
    await supabase.from('action_items').delete().eq('meeting_id', meetingId);
    await supabase.from<ActionItem>('action_items').insert(out.actions);
    await pushToRepository(meetingId, 'Action', out.actions);
  }
  if (out.raid) {
    await supabase.from('raid_items').delete().eq('meeting_id', meetingId);
    await supabase.from<RaidItem>('raid_items').insert(out.raid);
    await pushToRepository(
      meetingId,
      'RAID',
      out.raid.map((r) => ({
        id: r.id,
        title: r.description,
        owner: r.owner,
        status: r.status,
        criticality: r.criticality,
        created_at: r.created_at,
      }))
    );
  }

  await supabase
    .from<Meeting>('meetings')
    .update({ selected_outputs: selected, outputs_generated: true, status: 'reviewed' })
    .eq('id', meetingId);
}

export async function saveActionToRepository(action: ActionItem): Promise<void> {
  await supabase.from<FollowUp>('follow_ups').insert({
    id: uid(),
    meeting_id: action.meeting_id,
    item_title: action.title,
    type: 'Action',
    assigned_to: action.owner,
    follow_up_date: null,
    status: action.status as FollowUp['status'],
    notes: '',
    source_ref_id: action.id,
    criticality: action.criticality,
    completed_on: null,
    action_to_be_taken: null,
    created_at: nowISO(),
  });
  if (!action.follow_up_note) {
    await supabase
      .from<ActionItem>('action_items')
      .update({ follow_up_note: 'Saved to repository' })
      .eq('id', action.id);
  }
}

export async function saveRaidToRepository(raid: RaidItem): Promise<void> {
  await supabase.from<FollowUp>('follow_ups').insert({
    id: uid(),
    meeting_id: raid.meeting_id,
    item_title: raid.description,
    type: 'RAID',
    assigned_to: raid.owner,
    follow_up_date: null,
    status: raid.status as FollowUp['status'],
    notes: '',
    source_ref_id: raid.id,
    criticality: raid.criticality,
    completed_on: null,
    action_to_be_taken: null,
    created_at: nowISO(),
  });
  if (!raid.follow_up_required) {
    await supabase
      .from<RaidItem>('raid_items')
      .update({ follow_up_required: true })
      .eq('id', raid.id);
  }
}