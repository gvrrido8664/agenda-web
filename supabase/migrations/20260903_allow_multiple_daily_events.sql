ALTER TABLE public.daily_notes
  DROP CONSTRAINT IF EXISTS daily_notes_user_id_date_key;

CREATE INDEX IF NOT EXISTS daily_notes_user_id_date_idx
  ON public.daily_notes (user_id, date);
