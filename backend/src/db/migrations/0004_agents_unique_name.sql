-- Unique agent per tenant by name
CREATE UNIQUE INDEX IF NOT EXISTS ux_agents_tenant_name
  ON agents(tenant_id, name);
