export type MeetingStatus = 'draft' | 'reviewed';
export type ActionStatus = 'open' | 'in_progress' | 'done' | 'blocked';
export type FollowUpStatus = 'to_do' | 'in_progress' | 'pending' | 'completed';
export type QuickNoteStatus = 'to_do' | 'in_progress' | 'pending' | 'completed' | 'overdue';
export type Criticality = 'low' | 'medium' | 'high' | 'critical';
export type Priority = 'low' | 'medium' | 'high';
export type RaidType = 'risk' | 'assumption' | 'issue' | 'dependency';
export type FollowUpType = 'Action' | 'Follow-up' | 'RAID';
export type OutputType = 'minutes' | 'actions' | 'raid' | 'status';
export type OverallStatus = 'green' | 'yellow' | 'red';

export interface Meeting {
  id: string;
  title: string;
  project_client: string;
  meeting_date: string;
  participants: string[];
  transcript: string;
  notes: string;
  selected_outputs: OutputType[];
  outputs_generated: boolean;
  status: MeetingStatus;
  report_saved: boolean;
  created_at: string;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  title: string;
  owner: string;
  due_date: string | null;
  priority: Priority;
  status: ActionStatus;
  follow_up_note: string;
  criticality: Criticality;
  created_at: string;
}

export interface RaidItem {
  id: string;
  meeting_id: string;
  type: RaidType;
  description: string;
  impact: string;
  owner: string;
  mitigation: string;
  follow_up_required: boolean;
  status: ActionStatus;
  criticality: Criticality;
  created_at: string;
}

export interface FollowUp {
  id: string;
  meeting_id: string | null;
  item_title: string;
  type: FollowUpType;
  assigned_to: string;
  follow_up_date: string | null;
  status: FollowUpStatus;
  notes: string;
  source_ref_id: string | null;
  criticality: Criticality;
  completed_on: string | null;
  action_to_be_taken: string | null;
  created_at: string;
}

export interface MeetingMinutes {
  id: string;
  meeting_id: string;
  objective: string;
  discussion_summary: string;
  key_decisions: string[];
  open_points: string[];
  next_steps: string[];
  created_at: string;
}

export interface StatusReport {
  id: string;
  meeting_id: string;
  overall_status: OverallStatus;
  progress_this_week: string;
  in_progress: string[];
  risks_blockers: string[];
  next_steps: string[];
  support_needed: string[];
  created_at: string;
}

export interface QuickNote {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  people_involved: string[] | null;
  assigned_to: string | null;
  status: QuickNoteStatus;
  criticality: Criticality;
  created_at: string;
  updated_at: string;
}