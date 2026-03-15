// Sign Language types
export type SignLanguageType = 'ASL' | 'BSL' | 'ISL' | 'Auslan';
export type MediaType = 'gif' | 'mp4' | 'png-sequence' | 'sprite-sheet' | '3d-animation' | 'svg' | 'placeholder';
export type SignType = 'sign' | 'fingerspell';

export interface SignEntry {
  id: string;
  englishWord: string;
  glossToken: string;
  signLanguage: SignLanguageType;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  duration: number;
  category: string;
  description: string;
  synonyms: string[];
}

export interface SignSequenceItem {
  word: string;
  glossToken: string;
  signType: SignType;
  mediaUrl: string;
  duration: number;
  description: string;
  letters?: string[];
}

export interface TranscriptionResult {
  text: string;
  language: string;
  isFinal: boolean;
  confidence: number;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number;
  isLooping: boolean;
  mode: 'continuous' | 'review';
}

export interface AppSettings {
  inputLanguage: string;
  outputSignLanguage: SignLanguageType;
  darkMode: boolean;
  signDisplaySize: 'small' | 'medium' | 'large';
  animationSpeed: number;
  showEnglishText: boolean;
  showGloss: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  learningMode: boolean;
  processingMode: 'realtime' | 'sentence';
}

export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  language: string;
}

export type SupportedLanguage = {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string;
};
