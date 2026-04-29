import { z } from 'zod';

export const CopyBriefSchema = z.object({
  objetivo: z.string().min(3),
  publico: z.string().min(2),
  produto: z.string().min(2),
  proposta_valor: z.string().min(2).optional(),
  dores: z.array(z.string()).optional(),
  objecoes: z.array(z.string()).optional(),
  canal: z.enum(['landing','email','anuncio','roteiro','social','whatsapp']).default('landing'),
  estagio_funil: z.enum(['TOFU','MOFU','BOFU']).default('TOFU'),
  tom_voz: z.string().default('profissional e persuasivo'),
  cta_principal: z.string().optional(),
  restricoes: z.array(z.string()).optional(),
  referencias_query: z.string().optional(),
  referencias_ids: z.array(z.string()).optional(),
  variacoes: z.number().int().min(1).max(5).default(2)
});

export const CopyBriefPartialSchema = CopyBriefSchema.deepPartial();

export type CopyBrief = z.infer<typeof CopyBriefSchema>;
export type CopyBriefPartial = z.infer<typeof CopyBriefPartialSchema>;
