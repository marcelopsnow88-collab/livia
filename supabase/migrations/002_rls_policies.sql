-- LivIA — Row Level Security
-- Princípio: admins veem tudo; clientes veem apenas dados da própria organização.

-- ─── Helper functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION user_organization_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_access_organization(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_admin() OR org_id IN (SELECT user_organization_ids());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ─── Enable RLS ──────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_usage ENABLE ROW LEVEL SECURITY;

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Usuários leem/atualizam o próprio perfil; admins leem todos.

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

-- ─── organizations ───────────────────────────────────────────────────────────
-- Clientes veem apenas orgs das quais são membros; admins veem todas.

CREATE POLICY organizations_select ON organizations FOR SELECT
  USING (can_access_organization(id) AND deleted_at IS NULL);

CREATE POLICY organizations_insert ON organizations FOR INSERT
  WITH CHECK (is_admin() OR auth.uid() IS NOT NULL);

CREATE POLICY organizations_update ON organizations FOR UPDATE
  USING (can_access_organization(id))
  WITH CHECK (can_access_organization(id));

CREATE POLICY organizations_delete ON organizations FOR UPDATE
  USING (is_admin());

-- ─── organization_members ────────────────────────────────────────────────────

CREATE POLICY org_members_select ON organization_members FOR SELECT
  USING (can_access_organization(organization_id));

CREATE POLICY org_members_insert ON organization_members FOR INSERT
  WITH CHECK (can_access_organization(organization_id) OR auth.uid() = user_id);

CREATE POLICY org_members_delete ON organization_members FOR DELETE
  USING (is_admin() OR user_id = auth.uid());

-- ─── ai_agents ───────────────────────────────────────────────────────────────

CREATE POLICY ai_agents_select ON ai_agents FOR SELECT
  USING (can_access_organization(organization_id));

CREATE POLICY ai_agents_insert ON ai_agents FOR INSERT
  WITH CHECK (can_access_organization(organization_id));

CREATE POLICY ai_agents_update ON ai_agents FOR UPDATE
  USING (can_access_organization(organization_id));

CREATE POLICY ai_agents_delete ON ai_agents FOR DELETE
  USING (can_access_organization(organization_id));

-- ─── availabilities ──────────────────────────────────────────────────────────
-- Isolamento multi-tenant por organization_id (empresaId nas regras de negócio).

CREATE POLICY availabilities_select ON availabilities FOR SELECT
  USING (can_access_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY availabilities_insert ON availabilities FOR INSERT
  WITH CHECK (can_access_organization(organization_id));

CREATE POLICY availabilities_update ON availabilities FOR UPDATE
  USING (can_access_organization(organization_id))
  WITH CHECK (can_access_organization(organization_id));

CREATE POLICY availabilities_delete ON availabilities FOR UPDATE
  USING (can_access_organization(organization_id));

-- ─── contacts ────────────────────────────────────────────────────────────────

CREATE POLICY contacts_select ON contacts FOR SELECT
  USING (can_access_organization(organization_id));

CREATE POLICY contacts_insert ON contacts FOR INSERT
  WITH CHECK (can_access_organization(organization_id));

CREATE POLICY contacts_update ON contacts FOR UPDATE
  USING (can_access_organization(organization_id));

-- ─── conversations ───────────────────────────────────────────────────────────

CREATE POLICY conversations_select ON conversations FOR SELECT
  USING (can_access_organization(organization_id));

CREATE POLICY conversations_insert ON conversations FOR INSERT
  WITH CHECK (can_access_organization(organization_id));

CREATE POLICY conversations_update ON conversations FOR UPDATE
  USING (can_access_organization(organization_id));

-- ─── messages ────────────────────────────────────────────────────────────────

CREATE POLICY messages_select ON messages FOR SELECT
  USING (can_access_organization(organization_id));

CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (can_access_organization(organization_id));

-- ─── whatsapp_connections ────────────────────────────────────────────────────

CREATE POLICY whatsapp_connections_select ON whatsapp_connections FOR SELECT
  USING (can_access_organization(organization_id));

CREATE POLICY whatsapp_connections_insert ON whatsapp_connections FOR INSERT
  WITH CHECK (can_access_organization(organization_id) OR is_admin());

CREATE POLICY whatsapp_connections_update ON whatsapp_connections FOR UPDATE
  USING (can_access_organization(organization_id) OR is_admin());

-- ─── webhook_events ──────────────────────────────────────────────────────────
-- Somente service role (sem policy para anon/authenticated = bloqueado no client).

CREATE POLICY webhook_events_admin_select ON webhook_events FOR SELECT
  USING (is_admin());

-- ─── integration_logs ────────────────────────────────────────────────────────

CREATE POLICY integration_logs_select ON integration_logs FOR SELECT
  USING (is_admin() OR (organization_id IS NOT NULL AND can_access_organization(organization_id)));

-- ─── plan_usage ──────────────────────────────────────────────────────────────

CREATE POLICY plan_usage_select ON plan_usage FOR SELECT
  USING (can_access_organization(organization_id));

CREATE POLICY plan_usage_update ON plan_usage FOR UPDATE
  USING (can_access_organization(organization_id) OR is_admin());
