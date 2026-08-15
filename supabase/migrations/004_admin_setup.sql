-- LivIA — Configuração do usuário administrador
-- Execute APÓS criar o usuário no Supabase Auth Dashboard ou via signUp.
--
-- 1. Crie um usuário em Authentication → Users (ex: admin@livia.app)
-- 2. Execute este SQL substituindo o UUID pelo id do auth.users:

-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@livia.app';

-- Para permitir leitura pública de seed data durante desenvolvimento sem auth de cliente,
-- o anon key com RLS exige sessão autenticada para escrita.
-- Admins autenticados têm acesso total via is_admin().
