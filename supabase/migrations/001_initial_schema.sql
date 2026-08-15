-- LivIA — Schema inicial
-- Baseado em REGRAS_DE_NEGOCIO.md

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ─────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'client');
CREATE TYPE organization_status AS ENUM ('ativo', 'teste', 'suspenso');
CREATE TYPE plan_tier AS ENUM ('Essencial', 'Profissional', 'Enterprise');
CREATE TYPE availability_status AS ENUM ('disponivel', 'indisponivel');
CREATE TYPE conversation_status AS ENUM ('ia', 'humano', 'aguardando', 'finalizada');
CREATE TYPE message_type AS ENUM ('cliente', 'ia', 'sistema');
CREATE TYPE whatsapp_connection_status AS ENUM ('conectado', 'erro', 'configurando', 'desconectado');
CREATE TYPE webhook_event_status AS ENUM ('received', 'processed', 'failed', 'duplicate');

-- ─── Profiles (extensão de auth.users) ───────────────────────────────────────

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'client',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);

-- ─── Organizations (tenants / clientesAdmin) ─────────────────────────────────

CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  website         TEXT,
  responsible_name TEXT NOT NULL,
  plan            plan_tier NOT NULL DEFAULT 'Profissional',
  status          organization_status NOT NULL DEFAULT 'teste',
  trial_days_left INTEGER,
  consumption_pct INTEGER NOT NULL DEFAULT 0 CHECK (consumption_pct >= 0 AND consumption_pct <= 100),
  segment         TEXT,
  objective       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_organizations_status ON organizations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_plan ON organizations(plan) WHERE deleted_at IS NULL;

-- ─── Organization members ────────────────────────────────────────────────────

CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_owner        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);

-- ─── AI Agents (onboarding config) ───────────────────────────────────────────

CREATE TABLE ai_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'LivIA',
  tone            TEXT NOT NULL DEFAULT 'Amigável',
  greeting_message TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_agents_org ON ai_agents(organization_id);

-- ─── Availabilities ──────────────────────────────────────────────────────────

CREATE TABLE availabilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  hora_inicio     TIME NOT NULL,
  hora_fim        TIME NOT NULL,
  status          availability_status NOT NULL DEFAULT 'disponivel',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT availabilities_time_order CHECK (hora_fim > hora_inicio)
);

CREATE UNIQUE INDEX idx_availabilities_unique_slot
  ON availabilities (organization_id, data, hora_inicio, hora_fim)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_availabilities_org_date ON availabilities(organization_id, data)
  WHERE deleted_at IS NULL;

-- ─── Contacts ────────────────────────────────────────────────────────────────

CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  company_name    TEXT,
  avatar_initials TEXT NOT NULL DEFAULT '??',
  whatsapp_wa_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, phone)
);

CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_wa_id ON contacts(whatsapp_wa_id) WHERE whatsapp_wa_id IS NOT NULL;

-- ─── Conversations ───────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status          conversation_status NOT NULL DEFAULT 'ia',
  unread_count    INTEGER NOT NULL DEFAULT 0,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  ai_intent       TEXT,
  ai_sentiment    TEXT,
  ai_opportunity  TEXT,
  responsible     TEXT DEFAULT 'IA — LivIA',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_status ON conversations(organization_id, status);
CREATE INDEX idx_conversations_last_msg ON conversations(organization_id, last_message_at DESC);

-- ─── Messages ────────────────────────────────────────────────────────────────

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tipo            message_type NOT NULL,
  texto           TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  whatsapp_message_id TEXT,
  delivery_status TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at);
CREATE UNIQUE INDEX idx_messages_wa_id ON messages(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- ─── WhatsApp connections ────────────────────────────────────────────────────

CREATE TABLE whatsapp_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number      TEXT,
  phone_number_id   TEXT,
  display_name      TEXT,
  status            whatsapp_connection_status NOT NULL DEFAULT 'configurando',
  last_error        TEXT,
  connected_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

CREATE INDEX idx_whatsapp_connections_status ON whatsapp_connections(status);

-- ─── Webhook events (idempotência) ───────────────────────────────────────────

CREATE TABLE webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL DEFAULT 'whatsapp',
  external_id     TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          webhook_event_status NOT NULL DEFAULT 'received',
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX idx_webhook_events_status ON webhook_events(status, created_at);

-- ─── Integration logs ────────────────────────────────────────────────────────

CREATE TABLE integration_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  source          TEXT NOT NULL,
  level           TEXT NOT NULL DEFAULT 'info',
  message         TEXT NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_logs_org ON integration_logs(organization_id, created_at DESC);

-- ─── Plan usage (consumo por recurso) ────────────────────────────────────────

CREATE TABLE plan_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_key    TEXT NOT NULL,
  used            INTEGER NOT NULL DEFAULT 0,
  limit_value     INTEGER NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, resource_key)
);

-- ─── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_availabilities_updated_at BEFORE UPDATE ON availabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ai_agents_updated_at BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_whatsapp_connections_updated_at BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Auto-create profile on signup ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
