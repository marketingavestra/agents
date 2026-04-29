-- Tenants & Users
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  limits JSONB DEFAULT '{}'::jsonb,
  owner_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'owner',
  provider TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- Channels (WhatsApp Web)
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'whatsapp-web'
  display_name TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'disconnected',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agents & Skills
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'atendimento'|'fechamento'|'coleta-docs'|'agendamento'|...
  status TEXT DEFAULT 'active',
  persona TEXT NOT NULL,
  input_schema JSONB DEFAULT '{}'::jsonb,
  output_schema JSONB DEFAULT '{}'::jsonb,
  tool_permissions JSONB DEFAULT '{}'::jsonb,
  budgets JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ref TEXT, -- código/identificador da skill
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  ord INT DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY(agent_id, skill_id)
);

-- Templates (contratos/HSM)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'contrato'|'hsm'
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Files (uploads de documentos)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  mime TEXT,
  pii_flags JSONB DEFAULT '{}'::jsonb,
  linked_to JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Runs & Messages (histórico)
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  input JSONB,
  output JSONB,
  status TEXT DEFAULT 'ok',
  tokens INT DEFAULT 0,
  cost_cents INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  external_id TEXT,
  direction TEXT NOT NULL, -- 'in'|'out'
  from_jid TEXT,
  to_jid TEXT,
  body TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);