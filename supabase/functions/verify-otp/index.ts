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
  // Always compare the same number of bytes to avoid length-based timing leaks
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

  // Enforce a minimum, consistent response time to reduce timing signal
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return respond({ error: "Invalid token" }, 401);
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return respond({ error: "Invalid or expired code" }, 400);
    }

    // Fetch the user's most recent unverified, unexpired OTP without filtering
    // on `code` — filtering by code creates a database-level timing signal.
    const { data: otpRecord } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Always run constant-time comparison, even if no record exists, so the
    // work performed is independent of whether an OTP was found.
    const storedCode = otpRecord?.code ?? "000000";
    const codeMatches = constantTimeEqual(storedCode, code);
    const isValid = !!otpRecord && codeMatches;

    if (!isValid) {
      return respond({ error: "Invalid or expired code" }, 400);
    }

    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord!.id);

    if (updateError) {
      console.error("Error updating OTP:", updateError);
      return respond({ error: "Failed to verify OTP" }, 500);
    }

    console.log("OTP verified successfully for user:", user.id);
    return respond({ success: true, message: "OTP verified successfully" }, 200);
  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return respond({ error: "Invalid or expired code" }, 400);
  }
});
