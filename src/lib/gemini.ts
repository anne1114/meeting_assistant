import { SUPABASE_URL, SUPABASE_ANON_KEY } from './client';

export type AiKind = 'summary' | 'decisions';

export async function aiSummarize(text: string, kind: AiKind): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('AI summaries need Supabase configured (remote mode).');
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
    throw new Error(detail || `AI summarize failed (${res.status}).`);
  }
  const data = (await res.json()) as { summary?: string };
  return data.summary ?? '';
}