ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;
-- Existing users are considered onboarded so we don't force them through the flow
UPDATE public.profiles SET onboarded = true WHERE created_at < now();