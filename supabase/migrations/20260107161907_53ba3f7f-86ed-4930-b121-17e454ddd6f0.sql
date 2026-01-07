-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  email VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT valid_code CHECK (char_length(code) = 6)
);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own OTP records
CREATE POLICY "Users can view own OTP records"
ON public.otp_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Allow insert for authenticated users (for their own records)
CREATE POLICY "Users can create own OTP records"
ON public.otp_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow update for authenticated users (for their own records)
CREATE POLICY "Users can update own OTP records"
ON public.otp_verifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_otp_user_id ON public.otp_verifications(user_id);
CREATE INDEX idx_otp_expires_at ON public.otp_verifications(expires_at);

-- Function to clean up expired OTPs (optional, can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_verifications WHERE expires_at < now();
END;
$$;