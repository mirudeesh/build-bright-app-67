import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import WelcomeScreen from "@/components/WelcomeScreen";
import ThemeToggle from "@/components/ThemeToggle";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, LogOut, User, Bot, Settings, ShieldCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import liquenoLogo from "@/assets/liqueno-logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, loading, otpVerified, needsOtpVerification } = useAuth();
  const { messages, sendMessage, isLoading, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null));
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (needsOtpVerification && !otpVerified) {
      navigate("/auth");
      return;
    }

    // Send new social sign-in users through the onboarding flow to pick a username
    const provider = user.app_metadata?.provider;
    if (provider && provider !== "email") {
      supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data && !data.onboarded) {
            navigate("/onboarding");
          }
        });
    }
  }, [user, loading, navigate, otpVerified, needsOtpVerification]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Bot className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (needsOtpVerification && !otpVerified)) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={liquenoLogo} alt="Liqueno logo" className="h-10 w-10 rounded-full" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Liqueno</h1>
              <p className="text-sm text-muted-foreground">Your helpful AI assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearMessages}
                title="Clear chat"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 px-2"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture} alt="avatar" />
                    <AvatarFallback className="text-xs">
                      {(profile?.username || user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
                    {user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email?.split("@")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium truncate">
                    {user?.user_metadata?.full_name || user?.user_metadata?.username || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {messages.length === 0 ? (
            <WelcomeScreen onPromptClick={sendMessage} />
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  userAvatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                  userName={profile?.username || user?.user_metadata?.full_name || user?.email}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <img src={liquenoLogo} alt="Liqueno" className="h-8 w-8 rounded-full animate-pulse" />
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
