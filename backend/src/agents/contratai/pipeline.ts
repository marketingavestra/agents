import { getClaude, CLAUDE_MODEL } from '../../shared/claude.js';
import { CONTRATAI_SYSTEM_PROMPT } from './persona.js';

export interface Message { role: 'user' | 'assistant'; content: string; }

export async function runContratAI(query: string, history: Message[] = []) {
  const claude = getClaude();

  const messages: Message[] = [
    ...history.slice(-10),
    { role: 'user', content: query },
  ];

  const resp = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: CONTRATAI_SYSTEM_PROMPT,
    messages,
  });

  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  return {
    text,
    usage: { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens },
  };
}
