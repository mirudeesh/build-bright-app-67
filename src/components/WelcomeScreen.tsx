import { Bot, Clock, TrendingUp, Newspaper, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import liquenoLogo from "@/assets/liqueno-logo.png";

interface WelcomeScreenProps {
  onPromptClick: (prompt: string) => void;
}

const WelcomeScreen = ({ onPromptClick }: WelcomeScreenProps) => {
  const examplePrompts = [
    {
      icon: Clock,
      text: "What time is it?",
      description: "Get current time and date",
    },
    {
      icon: TrendingUp,
      text: "What's the price of AAPL stock?",
      description: "Check stock prices",
    },
    {
      icon: Newspaper,
      text: "Show me latest tech news",
      description: "Get current headlines",
    },
    {
      icon: Trophy,
      text: "What are the latest NBA scores?",
      description: "Sports scores and updates",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-8">
      <div className="space-y-4">
        <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto">
          <img src={liquenoLogo} alt="liqueno logo" className="h-20 w-20 rounded-full" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome to liqueno
          </h2>
          <p className="text-muted-foreground text-lg">
            Your intelligent assistant with real-time data access
          </p>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <p className="text-sm text-muted-foreground mb-4">Try asking about:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examplePrompts.map((prompt, index) => {
            const Icon = prompt.icon;
            return (
              <Card
                key={index}
                className="p-4 hover:bg-accent transition-colors cursor-pointer group border-border"
                onClick={() => onPromptClick(prompt.text)}
              >
                <div className="flex items-start gap-3 text-left">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                      {prompt.text}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {prompt.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="text-sm text-muted-foreground max-w-md">
        <p>Or type your own question below to get started</p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
