const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

async function main() {
  const { seedIfNeeded } = await import('../src/lib/seed');
  await seedIfNeeded();

  const { supabase, asArray, asSingle } = await import('../src/lib/client');
  const { effectiveStatus } = await import('../src/lib/utils');

  const meetings = asArray((await supabase.from('meetings').select()).data);
  const followUps = asArray((await supabase.from('follow_ups').select()).data);
  const notes = asArray((await supabase.from('quick_notes').select()).data);
  const minutes = asArray((await supabase.from('meeting_minutes').select()).data);
  const statuses = asArray((await supabase.from('status_reports').select()).data);
  const actions = asArray((await supabase.from('action_items').select()).data);
  const raid = asArray((await supabase.from('raid_items').select()).data);

  const checks: Array<[string, boolean]> = [
    ['4 seed meetings', meetings.length === 4],
    ['3 meetings reviewed with outputs', meetings.filter((m) => m.status === 'reviewed').length === 3],
    ['1 meeting still draft', meetings.filter((m) => m.status === 'draft').length === 1],
    ['minutes generated for 3 meetings', minutes.length === 3],
    ['status reports generated for 3 meetings', statuses.length === 3],
    ['action items generated (>0)', actions.length > 0],
    ['raid items generated (>0)', raid.length > 0],
    ['follow-ups auto-pushed (>= actions+raid)', followUps.length >= actions.length + raid.length],
    ['auto-pushed items carry source_ref_id', followUps.some((f) => f.source_ref_id != null)],
    ['5 manual follow-ups', followUps.filter((f) => f.source_ref_id == null).length === 5],
    ['3 quick notes', notes.length === 3],
    ['an overdue item exists', followUps.some((f) => effectiveStatus(f) === 'overdue')],
    ['a due-today item exists', followUps.some((f) => f.follow_up_date === new Date().toISOString().slice(0, 10))],
    ['a completed item exists', followUps.some((f) => f.status === 'completed')],
  ];

  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'} - ${label}`);
    if (!ok) failed++;
  }

  const kickoff = meetings.find((m) => m.title === 'Sprint 25 Kickoff')!;
  const kickMinutes = asSingle((await supabase.from('meeting_minutes').select().eq('meeting_id', kickoff.id).maybeSingle()).data)!;
  console.log('\n--- Sprint 25 Kickoff: objective ---');
  console.log(kickMinutes.objective);
  console.log('\n--- key decisions (first 3) ---');
  console.log(kickMinutes.key_decisions.slice(0, 3).join('\n'));
  console.log('\n--- one generated action ---');
  console.log(actions.find((a) => a.meeting_id === kickoff.id)?.title);
  console.log('\n--- one generated raid item ---');
  console.log(raid.find((r) => r.meeting_id === kickoff.id)?.description);

  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});