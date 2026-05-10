import { MODELS } from '@/store/useAppStore';

export async function* streamChat(
  messages: Array<{ role: string; content: string | unknown }>,
  apiKey: string,
  modelIndex: number,
  systemPrompt: string
) {
  const model = MODELS[modelIndex] || MODELS[0];
  const payload = {
    model: model.id,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
    stream: true,
    max_tokens: 2000,
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://jarvis.app',
      'X-Title': 'JARVIS',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No reader');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore parse errors
      }
    }
  }
}

export async function chatNonStream(
  messages: Array<{ role: string; content: string | unknown }>,
  apiKey: string,
  modelIndex: number,
  systemPrompt: string
): Promise<string> {
  const model = MODELS[modelIndex] || MODELS[0];
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://jarvis.app',
      'X-Title': 'JARVIS',
    },
    body: JSON.stringify({
      model: model.id,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
