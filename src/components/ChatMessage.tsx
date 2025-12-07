import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bot, User, Copy, Check } from "lucide-react";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({ description: "Code copied to clipboard" });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({ description: "Failed to copy code", variant: "destructive" });
    }
  };

  const renderMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isInline = !match && !codeString.includes("\n");
            
            if (isInline) {
              return (
                <code 
                  className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" 
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <div className="relative group/code my-2">
                <div className="absolute right-2 top-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover/code:opacity-100 transition-opacity bg-background/80 hover:bg-background border border-border"
                    onClick={() => handleCopyCode(codeString)}
                  >
                    {copiedCode === codeString ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                {match && (
                  <div className="absolute left-3 top-2 text-xs text-muted-foreground font-mono">
                    {match[1]}
                  </div>
                )}
                <SyntaxHighlighter
                  style={oneDark as { [key: string]: React.CSSProperties }}
                  language={match ? match[1] : "text"}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: "0.5rem",
                    padding: "2.5rem 1rem 1rem 1rem",
                    fontSize: "0.875rem",
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          },
          p({ children }) {
            return <p className="my-1 font-semibold">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside my-1 font-semibold">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside my-1 font-semibold">{children}</ol>;
          },
          li({ children }) {
            return <li className="my-0.5">{children}</li>;
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-bold">{children}</strong>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-primary pl-3 my-2 italic">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  const renderContent = () => {
    if (typeof content === "string") {
      if (isUser) {
        return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
      }
      return <div className="text-sm leading-relaxed">{renderMarkdown(content)}</div>;
    }
    
    return (
      <div className="space-y-2">
        {content.map((item, idx) => {
          if (item.type === "text" && item.text) {
            if (isUser) {
              return <p key={idx} className="text-sm leading-relaxed whitespace-pre-wrap">{item.text}</p>;
            }
            return <div key={idx} className="text-sm leading-relaxed">{renderMarkdown(item.text)}</div>;
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