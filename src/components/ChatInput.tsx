import { useState, KeyboardEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, AudioWaveform, X } from "lucide-react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import ImageUpload from "./ImageUpload";

interface ChatInputProps {
  onSend: (message: string | { text: string; image: string }) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { isRecording, audioBlob, toggleRecording, clearRecording } = useVoiceRecording();

  useEffect(() => {
    if (audioBlob) {
      // Convert blob to base64 and send as a message
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onSend(`[Voice Message: ${base64Audio.slice(0, 50)}...]`);
        clearRecording();
      };
      reader.readAsDataURL(audioBlob);
    }
  }, [audioBlob, onSend, clearRecording]);

  const handleImageSelect = (imageData: string) => {
    setSelectedImage(imageData);
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleSend = () => {
    if ((input.trim() || selectedImage) && !disabled) {
      if (selectedImage) {
        onSend({ text: input.trim() || "What's in this image?", image: selectedImage });
        setSelectedImage(null);
      } else {
        onSend(input);
      }
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {selectedImage && (
        <div className="mb-2 relative inline-block">
          <img
            src={selectedImage}
            alt="Selected"
            className="h-20 w-20 object-cover rounded-lg border-2 border-primary"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive hover:bg-destructive/90"
            onClick={removeImage}
          >
            <X className="h-4 w-4 text-destructive-foreground" />
          </Button>
        </div>
      )}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        className="h-12 pr-32 rounded-full border-border bg-background shadow-sm text-base"
        disabled={disabled}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <ImageUpload onImageSelect={handleImageSelect} disabled={disabled} />
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full hover:bg-accent transition-all ${
            isRecording ? "bg-destructive hover:bg-destructive/90 animate-pulse" : ""
          }`}
          onClick={toggleRecording}
          disabled={disabled}
        >
          <Mic className={`h-5 w-5 ${isRecording ? "text-destructive-foreground" : "text-muted-foreground"}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-accent"
        >
          <AudioWaveform className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
