// Helpers y tipado mínimo de la Web Speech API (webkit no está en lib.dom).
// Fallback de voz del modo llamada (call-mode) cuando Scribe/ElevenLabs no está
// disponible (sin ELEVENLABS_API_KEY la ruta /api/scribe-token da 503).

export interface SpeechAlternative {
  readonly transcript: string;
}
export interface SpeechResult {
  readonly length: number;
  readonly isFinal: boolean;
  readonly [index: number]: SpeechAlternative;
}
export interface SpeechResultList {
  readonly length: number;
  readonly [index: number]: SpeechResult;
}
export interface SpeechEvent {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}
export interface SpeechErrorEvent {
  readonly error: string;
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
export type SpeechCtor = new () => SpeechRecognitionLike;

export function getSpeechCtor(): SpeechCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isSpeechSupported(): boolean {
  return getSpeechCtor() !== undefined;
}

/** Mensaje amigable para errores de reconocimiento; null si es un error silencioso. */
export function friendlySpeechError(code: string): string | null {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "No pudimos acceder al micrófono. Activá el permiso en el navegador.";
  }
  if (code === "aborted" || code === "no-speech") {
    return null;
  }
  return "Hubo un problema con el reconocimiento de voz. Probá de nuevo.";
}
