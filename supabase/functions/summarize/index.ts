const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FREE_TEXT_PROMPTS: Record<string, string> = {
  summary:
    'You are a project management assistant. Summarize the meeting transcript below into concise, well-structured notes (short paragraphs or bullets). Keep it factual, no preamble:\n\n',
  decisions:
    'You are a project management assistant. From the meeting transcript below, extract the key decisions made. Return ONLY a bullet list, one decision per line, each starting with "- ". No preamble:\n\n',
};

const JSON_PROMPTS: Record<
  string,
  { instructions: string; transform?: (obj: unknown) => unknown }
> = {
  minutes: {
    instructions:
      'Return ONLY valid JSON with this exact shape (no markdown, no prose): {"objective":"...","discussion_summary":"...","key_decisions":["..."],"open_points":["..."],"next_steps":["..."]}. Include 3-6 key_decisions, 1-4 open_points, and 3-6 next_steps as concise phrases. Base everything strictly on the transcript; do not invent facts.',
  },
  actions: {
    instructions:
      'Extract the action items. Return ONLY valid JSON: {"actions":[{"title":"...","owner":"...","due_date":"Monday|End of Week|Next Week|MM/DD|Month DD|null","priority":"low|medium|high","criticality":"low|medium|high|critical"}]}. Include up to 15 actions. Base on "will/should/need to/owner/due" statements in the transcript; leave owner and due_date null when not mentioned. Do not invent.",
  },
  raid: {
    instructions:
      'Extract the RAID items from the transcript. Return ONLY valid JSON: {"raid":[{"type":"risk|assumption|issue|dependency","description":"...","impact":"...","mitigation":"...","owner":"...","criticality":"low|medium|high|critical"}]}. Include up to 12 items across the relevant categories. Leave impact, mitigation, and owner empty strings when not mentioned. Do not invent items.',
  },
  status: {
    instructions:
      'Create a stakeholder status report from the transcript. Return ONLY valid JSON: {"overall_status":"green|yellow|red","progress_this_week":"...","in_progress":["..."],"risks_blockers":["..."],"next_steps":["..."],"support_needed":["..."]}. Set overall_status to red if serious risks/blockers exist, yellow if multiple open action items, otherwise green. Include 1-4 items per list. Do not invent facts.',
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractJson(text: string): unknown {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

async function callGemini(prompt: string, apiKey: string, model: string, jsonMode: boolean): Promise<unknown> {
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (jsonMode) body.generationConfig = { responseMimeType: 'application/json' };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Gemini API request failed.');
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')?.trim() ?? '';
  if (!text) throw new Error('Gemini returned an empty response.');
  if (jsonMode) return extractJson(text);
  return text;
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

    const jsonKind = typeof kind === 'string' && Boolean(JSON_PROMPTS[kind]);
    const jsonPrompt = JSON_PROMPTS[kind];
    if (jsonPrompt) {
      const outcome = await callGemini(
        `${jsonPrompt.instructions}\n\nTranscript:\n${text}`,
        apiKey,
        model,
        true
      );
      return json({ json: jsonPrompt.transform ? jsonPrompt.transform(outcome) : outcome });
    }

    const prompt = (FREE_TEXT_PROMPTS[kind === 'decisions' ? 'decisions' : 'summary'] ?? FREE_TEXT_PROMPTS.summary) + text;
    const summary = await callGemini(prompt, apiKey, model, false);
    return json({ summary });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
