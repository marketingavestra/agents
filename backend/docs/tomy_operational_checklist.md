# Checklist Operacional — Agente Tomy (Copywriting)

Propósito: garantir que o agente de copywriting opere de forma consistente, humanizada e orientada a resultados, com memória de conversa, RAG em ChromaDB e saídas validadas.

1) Inicialização e Contexto
- [ ] Identificar usuário (header X-User ou body.user_key) e carregar/conferir conversation_id do Tomy (canal: web).
- [ ] Carregar últimos 4–6 turnos do histórico para contexto curto.
- [ ] Carregar/instanciar Brief da conversa (tabela briefs), stage: collecting|ready.

2) NLU e Postura Humanizada
- [ ] Detectar intenção: greeting | question | request.
- [ ] Sempre responder de forma empática, validando entendimento em uma frase.
- [ ] Fazer UMA pergunta por vez quando o brief não estiver pronto (status: ASK).

3) Slot-filling (ordem sugerida)
- [ ] Objetivo da peça (ex.: captar leads, lançamento, remarketing).
- [ ] Público-alvo e consciência (Schwartz 1–5: totalmente inconsciente → muito consciente).
- [ ] Produto/Serviço e Proposta de Valor (PV clara e específica).
- [ ] Dor/Problema principal e cenário atual.
- [ ] Prova (social, técnica, autoridade) e Garantias/mitigações.
- [ ] CTA único (o que precisa acontecer agora) e oferta (se houver).
- [ ] Tom/estilo e canal/peça (e.g., landing, e-mail, anúncio, post, roteiro).
- [ ] Estágio do funil (TOFU/MOFU/BOFU) e objeções principais.
- [ ] Restrições (tamanho, compliances, palavras vetadas) e idioma/região.

4) Heurísticas do Guia (aplicação prática)
- [ ] Escolher framework pelo nível de consciência:
  - [ ] 1–2 (baixa): PAS/PASTOR/Story (STR/Hero). Foco em dor/benefício/educação.
  - [ ] 3–4 (média): AIDA/4Ps/QUEST. Foco em prova, especificidade e oferta.
  - [ ] 5 (alta): FAB/BAB/Direct. Foco em diferenciais, CTA e urgência.
- [ ] Linguagem VAK por canal: incluir pistas visuais/auditivas/cinestésicas conforme peça.
- [ ] Milton/reframing/pressuposições: usar com parcimônia para conduzir ação.
- [ ] Headlines 4U (útil, urgente, único, ultra-específico) — gerar 5 variações.
- [ ] Storytelling (STR/Jornada do Herói) quando apropriado ao canal.

5) RAG (ChromaDB: copy_memory)
- [ ] Montar query a partir do brief (keywords: produto, dor, público, canal).
- [ ] Buscar top-k (3–5) referências e resumir evidências.
- [ ] Citar evidências no raciocínio (não expor fonte cruamente ao usuário), manter evidence-only interno.

6) Geração (JSON estrito)
- [ ] Normalizar saída para JSON estrito (sem blocos ```), conforme pipeline.
- [ ] Incluir: versões de headline, variações de CTA, corpo da peça, razões/objeções rebatidas.
- [ ] Explicitar framework aplicado e justificativa breve no campo meta.

7) Checklist de Qualidade antes de entregar
- [ ] Dor principal está clara e conectada à PV.
- [ ] Uma única CTA inequívoca.
- [ ] Prova/autoridade ou mitigação de risco presente.
- [ ] Tom/estilo coerente com público e canal.
- [ ] Linguagem simples, específica, sem jargões desnecessários.
- [ ] Sem promessas impossíveis (compliance) e sem termos vetados.
- [ ] Tamanho/limites respeitados (caracteres/palavras).

8) Persistência e Observabilidade
- [ ] Gravar message IN/OUT vinculadas a conversation_id.
- [ ] Atualizar/fechar brief (stage: ready) ao reunir slots mínimos.
- [ ] Registrar run com tokens e cost_cents (se env de custo estiverem definidos).

9) Erros/Recuperação
- [ ] Em caso de JSON inválido, tentar normalizador e re-gerar.
- [ ] Se RAG falhar, operar com persona/base e sinalizar ausência de refs.
- [ ] Se brief incompleto, retornar a status: ASK com próxima pergunta priorizada.

10) Entregáveis por tipo de peça (mínimos)
- [ ] Landing: 5 headlines, promessa + benefícios, prova, CTA, FAQs curtas.
- [ ] Anúncio: 3 variações (headline + primário + descrição), 2 CTAs.
- [ ] E-mail: assunto (3), preheader (2), corpo com escaneabilidade + CTA.
- [ ] Post: gancho inicial, desenvolvimento com VAK, CTA leve ou comentário.
- [ ] Roteiro: abertura de atenção, conflito/gancho, prova, CTA final.

Meta:
- source: internal
- owner: tomy
- version: 1.0.0
- updated: 2026-04-23
