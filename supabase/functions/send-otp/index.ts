import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OTP_TTL_MINUTES = 10;
const SEND_WINDOW_MINUTES = 15;
const MAX_SENDS_PER_WINDOW = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

  const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      await audit(null, null, "send_unauthorized", "missing auth header");
      return jsonResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      await audit(null, null, "send_unauthorized", "invalid token");
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    // Rate limit: count OTP send events in the recent window
    const windowStart = new Date(Date.now() - SEND_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("otp_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event", "send_success")
      .gte("created_at", windowStart);

    if ((count ?? 0) >= MAX_SENDS_PER_WINDOW) {
      await audit(user.id, user.email ?? null, "send_rate_limited", `${count} in ${SEND_WINDOW_MINUTES}m`);
      return jsonResponse(
        { error: `Too many codes requested. Try again in ${SEND_WINDOW_MINUTES} minutes.` },
        429,
      );
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Invalidate any prior OTPs for this user
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("user_id", user.id);

    const { error: insertError } = await supabase
      .from("otp_verifications")
      .insert({
        user_id: user.id,
        email: user.email,
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
        max_attempts: 5,
        locked: false,
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      await audit(user.id, user.email ?? null, "send_db_error", insertError.message);
      throw new Error("Failed to create OTP");
    }

    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: "Liqueno <onboarding@resend.dev>",
      to: [user.email!],
      subject: "Your Liqueno Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Verification Code</h1>
          <p style="color: #666; font-size: 16px;">Hello,</p>
          <p style="color: #666; font-size: 16px;">Your verification code for Liqueno is:</p>
          <div style="background: linear-gradient(135deg, #000 0%, #333 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; color: #fff; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in ${OTP_TTL_MINUTES} minutes. You have 5 attempts to enter it correctly.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Liqueno. All rights reserved.</p>
        </div>
      `,
    });

    console.log("OTP email sent:", emailResponse);
    await audit(user.id, user.email ?? null, "send_success");

    return jsonResponse({ success: true, message: "OTP sent to your email" }, 200);
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});
