import OpenAI from 'openai';

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const client = apiKey ? new OpenAI({ apiKey }) : null;
  return { client, model } as const;
}
