import { runCopywriter } from '../agents/tomy/pipeline.js';

export type OrchestratorResult = { agent: string; status: string; summary?: string; output: any };

export async function orchestrate(text: string): Promise<OrchestratorResult> {
  const output = await runCopywriter({
    objetivo: text,
    publico: 'pblico geral',
    produto: 'oferta não especificada',
    canal: 'landing',
    estagio_funil: 'TOFU',
    variacoes: 2
  });
  return { agent: 'tomy', status: output.status || 'OK', summary: output?.variacoes?.[0]?.titulo || 'copy', output };
}
