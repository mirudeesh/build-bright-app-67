
-- 1. Add SELECT policy to otp_verifications
CREATE POLICY "Users can view own OTP records" ON public.otp_verifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 3. Fix public bucket listing - restrict SELECT to owner only (public URLs still work)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Users can view their own avatar objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4. Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
