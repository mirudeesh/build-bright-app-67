
ALTER TABLE public.otp_verifications
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.otp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  event text NOT NULL,
  detail text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.otp_audit_log TO service_role;
ALTER TABLE public.otp_audit_log ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge functions) can read/write.

CREATE INDEX IF NOT EXISTS otp_audit_log_user_created_idx
  ON public.otp_audit_log (user_id, created_at DESC);
