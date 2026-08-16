const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROMPTS: Record<string, string> = {
  summary:
    'You are a project management assistant. Summarize the meeting transcript below into concise, well-structured notes (short paragraphs or bullets). Keep it factual, no preamble:\n\n',
  decisions:
    'You are a project management assistant. From the meeting transcript below, extract the key decisions made. Return ONLY a bullet list, one decision per line, each starting with "- ". No preamble:\n\n',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const { text, kind } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';

    if (!apiKey) return json({ error: 'GEMINI_API_KEY secret is not configured on this function.' }, 500);
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'text is required.' }, 400);

    const prompt = (PROMPTS[kind === 'decisions' ? 'decisions' : 'summary'] ?? PROMPTS.summary) + text;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return json({ error: data?.error?.message ?? 'Gemini API request failed.' }, 502);
    }
    const summary =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')?.trim() ?? '';
    if (!summary) return json({ error: 'Gemini returned an empty response.' }, 502);
    return json({ summary });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});