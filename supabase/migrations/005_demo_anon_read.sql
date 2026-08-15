-- Leitura pública limitada à organização demo (Clínica Bem Estar)
-- Permite que visitantes vejam o painel cliente sem login durante desenvolvimento/preview.
-- REMOVER ou restringir em produção quando autenticação de clientes estiver ativa.

CREATE POLICY organizations_demo_anon_read ON organizations FOR SELECT
  USING (
    auth.uid() IS NULL
    AND id = '11111111-1111-1111-1111-111111111001'::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY availabilities_demo_anon_read ON availabilities FOR SELECT
  USING (
    auth.uid() IS NULL
    AND organization_id = '11111111-1111-1111-1111-111111111001'::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY contacts_demo_anon_read ON contacts FOR SELECT
  USING (
    auth.uid() IS NULL
    AND organization_id = '11111111-1111-1111-1111-111111111001'::uuid
  );

CREATE POLICY conversations_demo_anon_read ON conversations FOR SELECT
  USING (
    auth.uid() IS NULL
    AND organization_id = '11111111-1111-1111-1111-111111111001'::uuid
  );

CREATE POLICY messages_demo_anon_read ON messages FOR SELECT
  USING (
    auth.uid() IS NULL
    AND organization_id = '11111111-1111-1111-1111-111111111001'::uuid
  );

CREATE POLICY plan_usage_demo_anon_read ON plan_usage FOR SELECT
  USING (
    auth.uid() IS NULL
    AND organization_id = '11111111-1111-1111-1111-111111111001'::uuid
  );

CREATE POLICY whatsapp_connections_demo_anon_read ON whatsapp_connections FOR SELECT
  USING (auth.uid() IS NULL);

CREATE POLICY organizations_anon_list ON organizations FOR SELECT
  USING (auth.uid() IS NULL AND deleted_at IS NULL);
