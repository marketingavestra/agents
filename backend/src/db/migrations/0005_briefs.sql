-- Briefs por conversa (slot-filling)
CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage TEXT NOT NULL DEFAULT 'collecting', -- collecting | ready | generating | delivered
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_briefs_conversation ON briefs(conversation_id);
