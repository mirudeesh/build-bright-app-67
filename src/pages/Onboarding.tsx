import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import liquenoLogo from "@/assets/liqueno-logo.png";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed");

type Availability =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "error"; message: string };

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<Availability>({ status: "idle" });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkOnboarded = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, onboarded")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.onboarded) {
        navigate("/");
        return;
      }

      const suggested =
        data?.username ||
        user.user_metadata?.username ||
        user.user_metadata?.full_name?.replace(/\s+/g, "_") ||
        user.email?.split("@")[0] ||
        "";
      setUsername(suggested.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30));
      setChecking(false);
    };

    checkOnboarded();
  }, [user, loading, navigate]);

  // Real-time availability check (debounced)
  useEffect(() => {
    if (!user) return;
    const trimmed = username.trim();
    if (!trimmed) {
      setAvailability({ status: "idle" });
      return;
    }
    const parsed = usernameSchema.safeParse(trimmed);
    if (!parsed.success) {
      setAvailability({ status: "invalid", message: parsed.error.errors[0].message });
      return;
    }

    setAvailability({ status: "checking" });
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", parsed.data)
        .neq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error && error.code !== "PGRST116") {
        setAvailability({ status: "error", message: "Couldn't check availability" });
        return;
      }
      setAvailability({ status: data ? "taken" : "available" });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, user]);

  const canSubmit = availability.status === "available";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      toast({ description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (!canSubmit) {
      toast({ description: "Please choose an available username", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: parsed.data, onboarded: true })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      const msg = /duplicate|unique/i.test(error.message)
        ? "That username is already taken"
        : error.message || "Failed to save profile";
      toast({ description: msg, variant: "destructive" });
      if (/duplicate|unique/i.test(error.message)) setAvailability({ status: "taken" });
      return;
    }

    toast({ description: "Welcome to Liqueno!" });
    navigate("/");
  };

  const statusNode = useMemo(() => {
    switch (availability.status) {
      case "checking":
        return (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
          </span>
        );
      case "available":
        return (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
            <Check className="h-3 w-3" /> Username is available
          </span>
        );
      case "taken":
        return (
          <span className="flex items-center gap-1 text-destructive">
            <X className="h-3 w-3" /> Username is already taken
          </span>
        );
      case "invalid":
        return (
          <span className="flex items-center gap-1 text-destructive">
            <X className="h-3 w-3" /> {availability.message}
          </span>
        );
      case "error":
        return <span className="text-muted-foreground">{availability.message}</span>;
      default:
        return null;
    }
  }, [availability]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={liquenoLogo} alt="Liqueno" className="h-14 w-14 rounded-full mx-auto mb-2" />
          <CardTitle>Choose your username</CardTitle>
          <CardDescription>
            Pick a username for your Liqueno profile. You can change it later in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoFocus
                maxLength={30}
                autoComplete="off"
              />
              <div className="text-xs min-h-[1rem]">{statusNode}</div>
              <p className="text-xs text-muted-foreground">
                3–30 characters. Letters, numbers, and underscores only.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={saving || !canSubmit}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
