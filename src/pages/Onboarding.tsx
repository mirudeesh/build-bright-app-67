import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import liquenoLogo from "@/assets/liqueno-logo.png";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed");

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

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

      // Prefill with existing username suggestion
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      toast({
        description: parsed.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: parsed.data, onboarded: true })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      toast({
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
      return;
    }

    toast({ description: "Welcome to Liqueno!" });
    navigate("/");
  };

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
              />
              <p className="text-xs text-muted-foreground">
                3–30 characters. Letters, numbers, and underscores only.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
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
