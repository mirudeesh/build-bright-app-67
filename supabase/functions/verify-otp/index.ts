import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Constant-time string comparison to prevent timing attacks
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  const len = Math.max(bufA.length, bufB.length);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < len; i++) {
    const x = i < bufA.length ? bufA[i] : 0;
    const y = i < bufB.length ? bufB[i] : 0;
    diff |= x ^ y;
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const MIN_RESPONSE_MS = 200;
  const respond = async (body: unknown, status: number) => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const audit = async (
    userId: string | null,
    email: string | null,
    event: string,
    detail?: string,
  ) => {
    try {
      await supabase.from("otp_audit_log").insert({
        user_id: userId,
        email,
        event,
        detail: detail ?? null,
        ip_address: ip,
        user_agent: userAgent,
      });
    } catch (e) {
      console.error("audit insert failed", e);
    }
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      await audit(null, null, "verify_unauthorized", "missing auth header");
      return respond({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      await audit(null, null, "verify_unauthorized", "invalid token");
      return respond({ error: "Invalid token" }, 401);
    }

    const { code } = await req.json().catch(() => ({}));

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      await audit(user.id, user.email ?? null, "verify_invalid_format");
      return respond({ error: "Invalid or expired code" }, 400);
    }

    // Fetch the user's most recent OTP (regardless of verified/expired) so we
    // can distinguish lockout and expiration for auditing.
    const { data: otpRecord } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      await audit(user.id, user.email ?? null, "verify_no_code");
      return respond({ error: "Invalid or expired code" }, 400);
    }

    if (otpRecord.locked || otpRecord.attempts >= otpRecord.max_attempts) {
      await audit(user.id, user.email ?? null, "verify_locked");
      return respond(
        { error: "Too many attempts. Please request a new code." },
        429,
      );
    }

    const expired = new Date(otpRecord.expires_at).getTime() < Date.now();
    if (expired) {
      await audit(user.id, user.email ?? null, "verify_expired");
      return respond({ error: "Invalid or expired code" }, 400);
    }

    if (otpRecord.verified) {
      await audit(user.id, user.email ?? null, "verify_already_used");
      return respond({ error: "Invalid or expired code" }, 400);
    }

    const codeMatches = constantTimeEqual(otpRecord.code, code);

    if (!codeMatches) {
      const nextAttempts = (otpRecord.attempts ?? 0) + 1;
      const shouldLock = nextAttempts >= otpRecord.max_attempts;
      await supabase
        .from("otp_verifications")
        .update({ attempts: nextAttempts, locked: shouldLock })
        .eq("id", otpRecord.id);

      await audit(
        user.id,
        user.email ?? null,
        shouldLock ? "verify_locked_now" : "verify_failed",
        `attempt ${nextAttempts}/${otpRecord.max_attempts}`,
      );

      if (shouldLock) {
        return respond(
          { error: "Too many attempts. Please request a new code." },
          429,
        );
      }
      return respond({ error: "Invalid or expired code" }, 400);
    }

    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    if (updateError) {
      console.error("Error updating OTP:", updateError);
      await audit(user.id, user.email ?? null, "verify_db_error", updateError.message);
      return respond({ error: "Failed to verify OTP" }, 500);
    }

    await audit(user.id, user.email ?? null, "verify_success");
    return respond({ success: true, message: "OTP verified successfully" }, 200);
  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return respond({ error: "Invalid or expired code" }, 400);
  }
});
