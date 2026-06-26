import { useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { parseVoiceCommand, type VoiceCommand } from "../lib/voiceCommands";

interface SpeechRecognitionResult {
  0: { transcript: string }
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResult[]
}
interface SpeechRecognitionInstance {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}

export function useVoiceControl(onCommand: (cmd: VoiceCommand) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const toggle = useCallback(() => {
    if (Platform.OS !== "web") return;
    const SpeechRecognition =
      (window as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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
