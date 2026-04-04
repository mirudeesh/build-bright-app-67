import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ArrowLeft, Moon, Sun, Monitor, Bell, Shield, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [chatSounds, setChatSounds] = useState(true);
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Load settings from database
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEmailNotifications(data.email_notifications);
        setChatSounds(data.chat_sounds);
        setLanguage(data.language);
        if (data.theme) setTheme(data.theme);
      }
      setLoadingSettings(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const settings = {
      user_id: user.id,
      theme: theme || "system",
      email_notifications: emailNotifications,
      chat_sounds: chatSounds,
      language,
    };
    // Upsert
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    let error;
    if (existing) {
      ({ error } = await supabase.from("user_settings").update(settings).eq("user_id", user.id));
    } else {
      ({ error } = await supabase.from("user_settings").insert(settings));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } else {
      toast({ title: "Settings saved", description: "Your preferences have been updated." });
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how Liqueno looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-2">
                {[
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "system", icon: Monitor, label: "System" },
                ].map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant={theme === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme(value)}
                    className="flex-1 gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chat sounds</Label>
                <p className="text-sm text-muted-foreground">Play sounds for new messages</p>
              </div>
              <Switch checked={chatSounds} onCheckedChange={setChatSounds} />
            </div>
          </CardContent>
        </Card>

        {/* Account Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>General account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Separator />
            <Button variant="outline" onClick={() => navigate("/reset-password")} className="w-full">
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
