import type {
  Meeting,
  ActionItem,
  RaidItem,
  FollowUp,
  MeetingMinutes,
  StatusReport,
  QuickNote,
} from './types';

export interface DB {
  meetings: Meeting[];
  action_items: ActionItem[];
  raid_items: RaidItem[];
  follow_ups: FollowUp[];
  meeting_minutes: MeetingMinutes[];
  status_reports: StatusReport[];
  quick_notes: QuickNote[];
}

export const STORAGE_KEY = 'meeting-assistant-db-v1';

export function emptyDB(): DB {
  return {
    meetings: [],
    action_items: [],
    raid_items: [],
    follow_ups: [],
    meeting_minutes: [],
    status_reports: [],
    quick_notes: [],
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...emptyDB(), ...parsed };
    }
  } catch {
    // fall through to empty DB
  }
  return emptyDB();
}

export let db: DB = load();

export function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // prototype: persist failures are silent
  }
}

export function clearDB(): void {
  localStorage.removeItem(STORAGE_KEY);
  db = emptyDB();
}