-- Slots individuais (opcional para auditoria fina)
CREATE TABLE IF NOT EXISTS brief_slots (
  id UUID PRIMARY KEY,
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  slot_name TEXT NOT NULL,
  value TEXT,
  source TEXT DEFAULT 'user', -- user | inferred | default
  confidence REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brief_slots_brief ON brief_slots(brief_id);
