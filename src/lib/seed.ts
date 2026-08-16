import { db, save, STORAGE_KEY } from './db';
import { uid, nowISO, todayISO, addDays } from './utils';
import { supabase } from './client';
import { generateAndPersist } from './generator';
import type { Meeting, FollowUp, QuickNote } from './types';

const sprintTranscript = [
  'The objective of this meeting is to kick off Sprint 25 for the Atlas Migration project and align on the migration milestones.',
  'We reviewed the current status of the database migration and the team agreed that the staging environment is ready for integration testing.',
  'We decided that the customer data sync will use the new batch pipeline going forward.',
  'The team approved the revised cutover plan for September 15th.',
  'There is a risk that the legacy API rate limits could delay the integration testing, this was flagged as a blocker for the QA team.',
  'We assume that the vendor will deliver the updated SDK by the end of this month.',
  'Open question: whether the audit log retention policy needs an update, this item is still pending and unresolved.',
  'Mike will send the revised project timeline by Friday.',
  'Priya needs to review the data mapping document, due by end of week.',
  'Tom will follow up with the platform team on the rate limit increase, this is a high priority action item.',
  'Sarah is working on the rollout checklist and will share it by Monday.',
  'The dependency on the security review team means we are waiting on their sign-off, the final approval requires their input.',
  'Support needed: we need help from the legal team to review the data processing agreement.',
  'Next step is to book the dress rehearsal for the cutover weekend.',
].join('\n');

const sprintNotes = [
  'Staging cutover dry-run scheduled',
  'QA sign-off expected before Thursday',
  'Retention policy review is a follow-up needed item',
].join('\n');

const clientTranscript = [
  'The purpose of this meeting is to review the weekly status with the client for the Nimbus Retail onboarding.',
  'Progress this week: the onboarding flow went live and the team is currently working on the payment retry fix.',
  'We agreed that the next release will include the invoice PDF generation.',
  'The client approved the new pricing page design.',
  'There is an issue with the webhook delivery for failed payments, it is causing delays in reconciliation.',
  'We decided to escalate the webhook issue to the platform team.',
  'Sarah will prepare the weekly report, due by Wednesday.',
  'Priya should review the pricing page copy, this is a nice to have but only when possible.',
  'We assume that the client will provide the final brand assets by next week.',
].join('\n');

const vendorTranscript = [
  'The agenda for this sync is to confirm the vendor onboarding timeline.',
  'We agreed that the vendor portal access will be granted by the end of this week.',
  'Tom will send the onboarding checklist by Friday.',
  'Risk: the vendor sandbox credentials might not be ready in time for the integration tests.',
].join('\n');

function buildMeeting(data: Partial<Meeting> & Pick<Meeting, 'title' | 'project_client' | 'meeting_date' | 'participants'>): Meeting {
  return {
    id: uid(),
    transcript: '',
    notes: '',
    selected_outputs: [],
    outputs_generated: false,
    status: 'draft',
    report_saved: false,
    created_at: nowISO(),
    ...data,
  };
}

export async function seedIfNeeded(): Promise<void> {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const today = todayISO();

  const kickoff = buildMeeting({
    title: 'Sprint 25 Kickoff',
    project_client: 'Atlas Migration',
    meeting_date: addDays(today, -2),
    participants: ['Sarah Chen', 'Mike Torres', 'Priya Patel', 'Tom Okada'],
    transcript: sprintTranscript,
    notes: sprintNotes,
  });
  const statusReview = buildMeeting({
    title: 'Client Status Review',
    project_client: 'Nimbus Retail',
    meeting_date: addDays(today, -9),
    participants: ['Sarah Chen', 'Priya Patel'],
    transcript: clientTranscript,
  });
  const vendorSync = buildMeeting({
    title: 'Vendor Onboarding Sync',
    project_client: 'Atlas Migration',
    meeting_date: today,
    participants: ['Tom Okada', 'Dana Wright'],
    transcript: vendorTranscript,
  });
  const standup = buildMeeting({
    title: 'Daily Standup - Monday',
    project_client: 'Nimbus Retail',
    meeting_date: today,
    participants: ['Sarah Chen', 'Mike Torres', 'Tom Okada'],
    notes: 'Standup recap: no blockers, sprint on track. Review the payment retry fix PR before EOD.',
  });

  const meetings = [kickoff, statusReview, vendorSync, standup];
  await supabase.from<Meeting>('meetings').insert(meetings);

  await generateAndPersist(kickoff.id, ['minutes', 'actions', 'raid', 'status']);
  await generateAndPersist(statusReview.id, ['minutes', 'actions', 'raid', 'status']);
  await generateAndPersist(vendorSync.id, ['minutes', 'actions', 'raid', 'status']);

  const followUps: FollowUp[] = [
    {
      id: uid(),
      meeting_id: null,
      item_title: 'Send updated license agreement to legal',
      type: 'Follow-up',
      assigned_to: 'Sarah Chen',
      follow_up_date: addDays(today, -3),
      status: 'pending',
      notes: 'Legal needs the signed copy before contract renewal.',
      source_ref_id: null,
      criticality: 'high',
      completed_on: null,
      action_to_be_taken: null,
      created_at: nowISO(),
    },
    {
      id: uid(),
      meeting_id: null,
      item_title: 'Approve staging credentials request',
      type: 'Follow-up',
      assigned_to: 'Mike Torres',
      follow_up_date: today,
      status: 'to_do',
      notes: 'Waiting for final sign-off from the security team.',
      source_ref_id: null,
      criticality: 'medium',
      completed_on: null,
      action_to_be_taken: null,
      created_at: nowISO(),
    },
    {
      id: uid(),
      meeting_id: null,
      item_title: 'Prepare invoice template for the new client',
      type: 'Follow-up',
      assigned_to: 'Priya Patel',
      follow_up_date: addDays(today, -5),
      status: 'completed',
      notes: '',
      source_ref_id: null,
      criticality: 'low',
      completed_on: addDays(today, -5),
      action_to_be_taken: null,
      created_at: nowISO(),
    },
    {
      id: uid(),
      meeting_id: null,
      item_title: 'Book training session for new joiners',
      type: 'Follow-up',
      assigned_to: 'Tom Okada',
      follow_up_date: addDays(today, 5),
      status: 'to_do',
      notes: '',
      source_ref_id: null,
      criticality: 'medium',
      completed_on: null,
      action_to_be_taken: null,
      created_at: nowISO(),
    },
    {
      id: uid(),
      meeting_id: null,
      item_title: 'Confirm cloud budget for Q4',
      type: 'Follow-up',
      assigned_to: 'Sarah Chen',
      follow_up_date: addDays(today, 10),
      status: 'pending',
      notes: '',
      source_ref_id: null,
      criticality: 'high',
      completed_on: null,
      action_to_be_taken: null,
      created_at: nowISO(),
    },
  ];
  await supabase.from<FollowUp>('follow_ups').insert(followUps);

  const quickNotes: QuickNote[] = [
    {
      id: uid(),
      title: 'Idea: standup bot for async teams',
      description: 'Draft a prompt for an async standup bot that collects blockers and picks up unassigned action items.',
      due_date: null,
      people_involved: ['Sarah Chen'],
      assigned_to: 'Mike Torres',
      status: 'to_do',
      criticality: 'low',
      created_at: nowISO(),
      updated_at: nowISO(),
    },
    {
      id: uid(),
      title: 'Reminder: renew domain certificate',
      description: 'The wildcard certificate expires soon, renew through the IT portal and update the monitoring alert.',
      due_date: addDays(today, 2),
      people_involved: ['Tom Okada'],
      assigned_to: 'Sarah Chen',
      status: 'in_progress',
      criticality: 'high',
      created_at: nowISO(),
      updated_at: nowISO(),
    },
    {
      id: uid(),
      title: 'Follow up with venue for team offsite',
      description: 'Check availability for the last week of the month and reserve the projector room.',
      due_date: addDays(today, 14),
      people_involved: [],
      assigned_to: 'Tom Okada',
      status: 'pending',
      criticality: 'medium',
      created_at: nowISO(),
      updated_at: nowISO(),
    },
  ];
  await supabase.from<QuickNote>('quick_notes').insert(quickNotes);

  save();

  const seeded = {
    meetings: db.meetings.length,
    followUps: db.follow_ups.length,
    quickNotes: db.quick_notes.length,
  };
  console.info('[meeting-assistant] seeded demo data:', seeded);
}