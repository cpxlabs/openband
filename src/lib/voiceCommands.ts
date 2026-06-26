export interface VoiceCommand {
  action:
    | "SET_MOOD"
    | "SET_BPM"
    | "SET_GENRE"
    | "TOGGLE_PLAY"
    | "TOGGLE_MUTE"
    | "SET_VOLUME"
    | "NEXT_CHORDS"
    | "EXPORT"
    | "UNKNOWN";
  value: string | number;
  confidence: number;
}

export function parseVoiceCommand(transcript: string): VoiceCommand {
  const text = transcript.toLowerCase().trim();

  const moodMatch = text.match(
    /mud[ae]r?\s*(o|para)?\s*(mood|clima)\s*(para\s*)?(day|night|sun|rain|snow)/i,
  );
  if (moodMatch) {
    return {
      action: "SET_MOOD",
      value: moodMatch[4].toLowerCase(),
      confidence: 0.9,
    };
  }

  const bpmMatch = text.match(
    /(bpm|tempo|andamento)\s*(para\s*)?(\d+)/i,
  );
  if (bpmMatch) {
    const bpm = parseInt(bpmMatch[3], 10);
    if (bpm >= 40 && bpm <= 300)
      return { action: "SET_BPM", value: bpm, confidence: 0.85 };
  }

  if (
    /\b(play|tocar|iniciar)\b/i.test(text) &&
    !/\bparar\b/i.test(text)
  ) {
    return { action: "TOGGLE_PLAY", value: "play", confidence: 0.95 };
  }

  if (/\b(pause|parar|pausar)\b/i.test(text)) {
    return { action: "TOGGLE_PLAY", value: "pause", confidence: 0.95 };
  }

  const muteMatch = text.match(
    /mut[ae]r?\s*(track|cana[lr]|pista)?\s*(\w+)/i,
  );
  if (muteMatch) {
    return {
      action: "TOGGLE_MUTE",
      value: muteMatch[3] || "all",
      confidence: 0.8,
    };
  }

  const volumeMatch = text.match(/volume\s*(para\s*)?(\d+)/i);
  if (volumeMatch) {
    const vol = parseInt(volumeMatch[2], 10);
    if (vol >= 0 && vol <= 100)
      return { action: "SET_VOLUME", value: vol, confidence: 0.8 };
  }

  if (/\b(next|pr.ximo)\s*(chords?|acordes?)\b/i.test(text)) {
    return { action: "NEXT_CHORDS", value: "next", confidence: 0.85 };
  }

  if (/\b(exportar|export|bounce|renderizar)\b/i.test(text)) {
    return { action: "EXPORT", value: "audio", confidence: 0.9 };
  }

  const genreMatch = text.match(
    /g[eê]nero\s*(para\s*)?(pop|rock|edm|hiphop|jazz|lofi|rnb|metal|acoustic|blues)/i,
  );
  if (genreMatch) {
    return {
      action: "SET_GENRE",
      value: genreMatch[2].toLowerCase(),
      confidence: 0.85,
    };
  }

  return { action: "UNKNOWN", value: "", confidence: 0 };
}

export function getVoiceCommandSuggestions(): string[] {
  return [
    "Muda o mood para rain",
    "Sobe o BPM para 110",
    "Mutar track bateria",
    "Volume para 80",
    "Tocar",
    "Exportar projeto",
  ];
}
