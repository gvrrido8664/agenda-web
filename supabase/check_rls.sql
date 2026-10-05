-- Run only in an isolated local database: this check rolls back its fixtures.
-- Bootstrap auth.users/auth.uid and authenticated before running schema.sql locally.
-- Hosted Supabase already supplies those objects; do not replace them there.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','agenda-a@example.com'),
 ('22222222-2222-4222-8222-222222222222','agenda-b@example.com');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
INSERT INTO public.daily_notes(user_id,date,title) VALUES
 ('11111111-1111-4111-8111-111111111111','2026-10-05','A1'),
 ('11111111-1111-4111-8111-111111111111','2026-10-05','A2');
INSERT INTO public.weekly_logs(user_id,iso_week,year,content_markdown) VALUES
 ('11111111-1111-4111-8111-111111111111',41,2026,'A');
DO $$
BEGIN
 IF (SELECT count(*) FROM public.users) <> 1 THEN RAISE EXCEPTION 'Profile isolation failed'; END IF;
 IF (SELECT count(*) FROM public.daily_notes) <> 2 THEN RAISE EXCEPTION 'Multiple events failed'; END IF;
 BEGIN
  INSERT INTO public.daily_notes(user_id,date,title) VALUES
   ('22222222-2222-4222-8222-222222222222','2026-10-05','Forbidden');
  RAISE EXCEPTION 'Cross-user insert accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.users SET email='changed@example.com';
  RAISE EXCEPTION 'Email update accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
UPDATE public.users SET full_name='Synthetic A';
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$
DECLARE changed integer;
BEGIN
 IF (SELECT count(*) FROM public.daily_notes) <> 0 THEN RAISE EXCEPTION 'Cross-user notes visible'; END IF;
 IF (SELECT count(*) FROM public.weekly_logs) <> 0 THEN RAISE EXCEPTION 'Cross-user logs visible'; END IF;
 UPDATE public.daily_notes SET title='Forbidden';
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed <> 0 THEN RAISE EXCEPTION 'Cross-user update accepted'; END IF;
 DELETE FROM public.daily_notes;
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed <> 0 THEN RAISE EXCEPTION 'Cross-user delete accepted'; END IF;
END $$;
INSERT INTO public.daily_notes(user_id,date,title) VALUES
 ('22222222-2222-4222-8222-222222222222','2026-10-05','B');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.daily_notes) <> 2 THEN RAISE EXCEPTION 'User A data changed'; END IF;
 IF (SELECT content_markdown FROM public.weekly_logs) <> 'A' THEN RAISE EXCEPTION 'User A journal changed'; END IF;
END $$;
ROLLBACK;
