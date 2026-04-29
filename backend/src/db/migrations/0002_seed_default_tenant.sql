-- Seed default tenant (for initial single-tenant operation)
INSERT INTO tenants (id, name, plan, limits)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'free', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;