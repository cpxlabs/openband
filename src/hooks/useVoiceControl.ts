import { useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { parseVoiceCommand, type VoiceCommand } from "../lib/voiceCommands";

export function useVoiceControl(onCommand: (cmd: VoiceCommand) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (Platform.OS !== "web") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const cmd = parseVoiceCommand(transcript);
      if (cmd.action !== "UNKNOWN") onCommand(cmd);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [isListening, onCommand]);

  return { isListening, toggle };
}
