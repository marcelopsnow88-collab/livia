-- Demo anon read for subscriptions (dev/preview only)

CREATE POLICY subscriptions_demo_anon_read ON subscriptions FOR SELECT
  USING (
    auth.uid() IS NULL
    AND organization_id = '11111111-1111-1111-1111-111111111001'::uuid
  );
