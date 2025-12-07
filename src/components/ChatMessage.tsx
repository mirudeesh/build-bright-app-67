import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const textContent = typeof content === "string" 
        ? content 
        : content.find(c => c.type === "text")?.text || "";
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      toast({
        description: "Message copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    const textClass = isUser 
      ? "text-sm leading-relaxed whitespace-pre-wrap" 
      : "text-sm leading-relaxed whitespace-pre-wrap font-semibold";
    
    if (typeof content === "string") {
      return <p className={textClass}>{content}</p>;
    }
    
    return (
      <div className="space-y-2">
        {content.map((item, idx) => {
          if (item.type === "text" && item.text) {
            return <p key={idx} className={textClass}>{item.text}</p>;
          }
          if (item.type === "image_url" && item.image_url?.url) {
            return (
              <img 
                key={idx} 
                src={item.image_url.url} 
                alt="Uploaded" 
                className="max-w-xs rounded-lg border border-border"
              />
            );
          }
          return null;
        })}
      </div>
    );
  };
  
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {!isUser && (
        <Avatar className="h-8 w-8 border-2 border-primary/20">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className="relative group max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? "bg-chat-user-bg text-chat-user-text"
              : "bg-chat-ai-bg text-chat-ai-text border border-border"
          }`}
        >
          {renderContent()}
        </div>
        
        {!isUser && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border shadow-sm hover:bg-accent"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 border-2 border-primary/20">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
