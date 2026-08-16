import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(): { url: string; key: string } {
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  const get = (name: string): string => {
    const m = raw.match(new RegExp(`^${name}=(.+)$`, 'm'));
    if (!m) throw new Error(`missing ${name} in .env`);
    return m[1].trim();
  };
  return { url: get('VITE_SUPABASE_URL'), key: get('VITE_SUPABASE_ANON_KEY') };
}

const { url, key } = loadEnv();
const client = createClient(url, key, { auth: { persistSession: false } });

const TABLES = ['meetings', 'action_items', 'raid_items', 'follow_ups', 'meeting_minutes', 'status_reports', 'quick_notes'] as const;

async function main(): Promise<void> {
  let failures = 0;
  const check = (name: string, ok: boolean, detail = ''): void => {
    if (ok) {
      console.log(`PASS - ${name}`);
    } else {
      failures++;
      console.error(`FAIL - ${name}${detail ? `: ${detail}` : ''}`);
    }
  };

  for (const table of TABLES) {
    const res = await client.from(table).select('id').limit(1);
    check(`select from ${table}`, !res.error, res.error?.message ?? '');
  }

  const probe = {
    title: 'VERIFY-PROBE',
    project_client: 'probe',
    meeting_date: new Date().toISOString().slice(0, 10),
    participants: [],
    transcript: '',
    notes: '',
    selected_outputs: [],
    outputs_generated: false,
    status: 'draft',
    report_saved: false,
  };
  const ins = await client.from('meetings').insert(probe).select('id').single();
  check('anon insert', !ins.error, ins.error?.message ?? '');
  if (ins.error) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  const probeId = ins.data.id;

  const upd = await client.from('meetings').update({ title: 'VERIFY-PROBE-UPDATED' }).eq('id', probeId).select('id').single();
  check('anon update', !upd.error && upd.data?.id === probeId, upd.error?.message ?? '');

  const sel = await client.from('meetings').select('id').eq('id', probeId).maybeSingle();
  check('anon select after update', !sel.error && sel.data?.id === probeId, sel.error?.message ?? '');

  const del = await client.from('meetings').delete().eq('id', probeId);
  check('anon delete', !del.error, del.error?.message ?? '');

  const gone = await client.from('meetings').select('id').eq('id', probeId).maybeSingle();
  check('cleanup confirmed', !gone.error && gone.data === null, gone.error?.message ?? '');

  console.log(failures === 0 ? '\nAll remote checks PASS' : `\n${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
