import Anthropic from '@anthropic-ai/sdk';

export function getClaude() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');
  return new Anthropic({ apiKey });
}

export const CLAUDE_MODEL = 'claude-sonnet-4-5';
