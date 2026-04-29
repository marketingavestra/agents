import { z } from 'zod';

export const EvidenceRef = z.object({
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
  source: z.string(),
  url: z.string().optional(),
  date: z.string().optional(),
  score: z.number().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRef>;

export const AgentRequest = z.object({
  query: z.string().min(3),
});
export type AgentRequest = z.infer<typeof AgentRequest>;

export const AgentResponse = z.object({
  status: z.enum(['OK', 'INSUFICIENTE']),
  resumo: z.string().optional(),
  argumentos: z.array(z.string()).optional(),
  citacoes: z.array(
    z.object({
      refId: z.string(),
      quote: z.string(),
    })
  ).optional(),
  refs: z.array(EvidenceRef).default([]),
});
export type AgentResponse = z.infer<typeof AgentResponse>;
