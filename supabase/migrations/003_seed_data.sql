-- LivIA — Dados iniciais de demonstração
-- Espelha clientesAdmin, initialAvailabilities e conversasInbox do protótipo.
-- IDs fixos para compatibilidade com referências existentes no frontend.

-- Organizações (clientesAdmin)
INSERT INTO organizations (id, name, responsible_name, plan, status, trial_days_left, consumption_pct, segment) VALUES
  ('11111111-1111-1111-1111-111111111001', 'Clínica Bem Estar', 'Dr. Roberto Lima', 'Profissional', 'ativo', NULL, 78, 'Clínicas'),
  ('11111111-1111-1111-1111-111111111002', 'ImobTech', 'Fernanda Souza', 'Essencial', 'teste', 4, 34, 'Imobiliárias'),
  ('11111111-1111-1111-1111-111111111003', 'Auto Center Plus', 'João Mendes', 'Enterprise', 'ativo', NULL, 91, 'Outros'),
  ('11111111-1111-1111-1111-111111111004', 'TechLearn', 'Camila Ferreira', 'Profissional', 'suspenso', NULL, 0, 'Outros'),
  ('11111111-1111-1111-1111-111111111005', 'Restaurante Sabor & Arte', 'Marcos Oliveira', 'Essencial', 'teste', 1, 12, 'Restaurantes');

-- Disponibilidades (initialAvailabilities — empresa Clínica Bem Estar)
INSERT INTO availabilities (organization_id, data, hora_inicio, hora_fim, status) VALUES
  ('11111111-1111-1111-1111-111111111001', '2025-07-29', '09:00', '10:00', 'disponivel'),
  ('11111111-1111-1111-1111-111111111001', '2025-07-29', '10:00', '11:00', 'disponivel'),
  ('11111111-1111-1111-1111-111111111001', '2025-07-29', '14:00', '15:00', 'indisponivel'),
  ('11111111-1111-1111-1111-111111111001', '2025-07-30', '09:00', '10:00', 'disponivel'),
  ('11111111-1111-1111-1111-111111111001', '2025-07-31', '15:00', '16:00', 'disponivel');

-- Contatos
INSERT INTO contacts (id, organization_id, name, company_name, avatar_initials, phone) VALUES
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'Ana Rodrigues', 'Clínica Bem Estar', 'AR', '5511999990001'),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111001', 'Carlos Mendes', 'Auto Center Plus', 'CM', '5511999990002'),
  ('22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111001', 'Juliana Costa', 'Imob Horizonte', 'JC', '5511999990003'),
  ('22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111001', 'Lucas Ferreira', 'Clínica Bem Estar', 'LF', '5511999990006'),
  ('22222222-2222-2222-2222-222222222005', '11111111-1111-1111-1111-111111111001', 'Pedro Alves', 'Academia Forte', 'PA', '5511999990004'),
  ('22222222-2222-2222-2222-222222222006', '11111111-1111-1111-1111-111111111001', 'Mariana Silva', 'Escola TechLearn', 'MS', '5511999990005');

-- Conversas
INSERT INTO conversations (id, organization_id, contact_id, status, unread_count, last_message_preview, last_message_at, ai_intent, ai_sentiment, ai_opportunity) VALUES
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222001', 'ia', 2, 'Gostaria de agendar uma consulta para semana que vem', now() - interval '2 minutes', 'Agendamento', 'Positivo', 'Alta'),
  ('33333333-3333-3333-3333-333333333002', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222002', 'humano', 0, 'Qual o preço da revisão de 30 mil km?', now() - interval '8 minutes', 'Vendas', 'Neutro', 'Média'),
  ('33333333-3333-3333-3333-333333333003', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222003', 'ia', 1, 'Preciso de um imóvel de 3 quartos no Morumbi', now() - interval '15 minutes', 'Qualificação', 'Positivo', 'Alta'),
  ('33333333-3333-3333-3333-333333333004', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222004', 'ia', 1, 'Quais horários estão disponíveis?', now() - interval '5 minutes', 'Disponibilidade', 'Positivo', 'Alta'),
  ('33333333-3333-3333-3333-333333333005', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222005', 'aguardando', 0, 'Vocês têm plano trimestral com personal?', now() - interval '32 minutes', 'Informação', 'Neutro', 'Baixa'),
  ('33333333-3333-3333-3333-333333333006', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222006', 'finalizada', 0, 'Quero informações sobre o curso de programação', now() - interval '1 hour', 'Informação', 'Positivo', 'Média');

-- Mensagens — conversa Ana Rodrigues
INSERT INTO messages (conversation_id, organization_id, tipo, texto, sent_at) VALUES
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001', 'cliente', 'Olá! Gostaria de agendar uma consulta de dermatologia.', now() - interval '2 hours'),
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001', 'ia', 'Olá, Ana! Fico feliz em ajudar. Temos disponibilidade na próxima semana. Qual seria o melhor dia para você?', now() - interval '2 hours'),
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001', 'cliente', 'Prefiro terça ou quinta, de manhã.', now() - interval '119 minutes'),
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001', 'ia', 'Ótimo! Terça-feira às 9h ou quinta às 10h estão disponíveis com a Dra. Fernanda Lopes. Qual você prefere?', now() - interval '119 minutes'),
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001', 'cliente', 'Terça às 9h é perfeito!', now() - interval '118 minutes'),
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001', 'ia', 'Agendamento confirmado! ✅ Terça-feira, 29 de julho, às 9h com a Dra. Fernanda. Você receberá confirmação por e-mail.', now() - interval '118 minutes');

-- Mensagens — conversa Lucas Ferreira (disponibilidade)
INSERT INTO messages (conversation_id, organization_id, tipo, texto, sent_at) VALUES
  ('33333333-3333-3333-3333-333333333004', '11111111-1111-1111-1111-111111111001', 'cliente', 'Olá! Quais horários estão disponíveis para consulta?', now() - interval '30 minutes'),
  ('33333333-3333-3333-3333-333333333004', '11111111-1111-1111-1111-111111111001', 'sistema', 'IA consultou a agenda — horários disponíveis encontrados', now() - interval '29 minutes'),
  ('33333333-3333-3333-3333-333333333004', '11111111-1111-1111-1111-111111111001', 'cliente', 'Terça às 9h seria perfeito!', now() - interval '28 minutes'),
  ('33333333-3333-3333-3333-333333333004', '11111111-1111-1111-1111-111111111001', 'ia', 'Ótimo! Registrei seu interesse no horário de terça-feira às 9h. Nossa equipe entrará em contato para confirmar. 😊', now() - interval '28 minutes');

-- WhatsApp connections (admin overview)
INSERT INTO whatsapp_connections (organization_id, phone_number, display_name, status) VALUES
  ('11111111-1111-1111-1111-111111111001', '+55 11 99999-0001', 'Clínica Bem Estar', 'conectado'),
  ('11111111-1111-1111-1111-111111111002', '+55 11 99999-0002', 'ImobTech', 'conectado'),
  ('11111111-1111-1111-1111-111111111003', '+55 11 99999-0003', 'Auto Center Plus', 'conectado'),
  ('11111111-1111-1111-1111-111111111004', NULL, 'TechLearn', 'erro'),
  ('11111111-1111-1111-1111-111111111005', NULL, 'Restaurante Sabor & Arte', 'configurando');

-- Plan usage (Clínica Bem Estar — plano Profissional trial)
INSERT INTO plan_usage (organization_id, resource_key, used, limit_value) VALUES
  ('11111111-1111-1111-1111-111111111001', 'usuarios', 2, 10),
  ('11111111-1111-1111-1111-111111111001', 'numeros_whatsapp', 1, 2),
  ('11111111-1111-1111-1111-111111111001', 'conversas', 312, 2000),
  ('11111111-1111-1111-1111-111111111001', 'consumo_ia', 78, 100);

-- Agente IA padrão
INSERT INTO ai_agents (organization_id, name, tone, greeting_message) VALUES
  ('11111111-1111-1111-1111-111111111001', 'LivIA', 'Amigável', 'Olá! Sou a LivIA, assistente virtual da Clínica Bem Estar. Como posso ajudar?');
