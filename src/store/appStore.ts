'use client';

import { create } from 'zustand';
import type {
  AppSettings,
  PlaybackState,
  SpeechRecognitionState,
  SignSequenceItem,
} from '@/types';

interface AppStore {
  settings: AppSettings;
  playback: PlaybackState;
  speech: SpeechRecognitionState;
  transcript: string;
  interimTranscript: string;
  translatedText: string;
  glossText: string;
  detectedLanguage: string;
  signSequence: SignSequenceItem[];
  isProcessing: boolean;
  error: string | null;

  updateSettings: (partial: Partial<AppSettings>) => void;
  updatePlayback: (partial: Partial<PlaybackState>) => void;
  updateSpeech: (partial: Partial<SpeechRecognitionState>) => void;
  setTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  setTranslatedText: (text: string) => void;
  setGlossText: (text: string) => void;
  setDetectedLanguage: (lang: string) => void;
  setSignSequence: (seq: SignSequenceItem[]) => void;
  setIsProcessing: (bool: boolean) => void;
  setError: (err: string | null) => void;
  resetSession: () => void;
  nextSign: () => void;
  prevSign: () => void;
  togglePlayback: () => void;
  setSpeed: (speed: number) => void;
}

const defaultSettings: AppSettings = {
  inputLanguage: 'auto',
  outputSignLanguage: 'ASL',
  darkMode: false,
  signDisplaySize: 'medium',
  animationSpeed: 1,
  showEnglishText: true,
  showGloss: false,
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  learningMode: false,
  processingMode: 'sentence',
};

const defaultPlayback: PlaybackState = {
  isPlaying: false,
  currentIndex: 0,
  speed: 1,
  isLooping: false,
  mode: 'review',
};

const defaultSpeech: SpeechRecognitionState = {
  isListening: false,
  transcript: '',
  interimTranscript: '',
  error: null,
  isSupported: false,
  language: 'en-US',
};

export const useAppStore = create<AppStore>((set, get) => ({
  settings: defaultSettings,
  playback: defaultPlayback,
  speech: defaultSpeech,
  transcript: '',
  interimTranscript: '',
  translatedText: '',
  glossText: '',
  detectedLanguage: '',
  signSequence: [],
  isProcessing: false,
  error: null,

  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  updatePlayback: (partial) =>
    set((state) => ({ playback: { ...state.playback, ...partial } })),

  updateSpeech: (partial) =>
    set((state) => ({ speech: { ...state.speech, ...partial } })),

  setTranscript: (text) => set({ transcript: text }),

  setInterimTranscript: (text) => set({ interimTranscript: text }),

  setTranslatedText: (text) => set({ translatedText: text }),

  setGlossText: (text) => set({ glossText: text }),

  setDetectedLanguage: (lang) => set({ detectedLanguage: lang }),

  setSignSequence: (seq) => set({ signSequence: seq }),

  setIsProcessing: (bool) => set({ isProcessing: bool }),

  setError: (err) => set({ error: err }),

  resetSession: () =>
    set({
      transcript: '',
      interimTranscript: '',
      translatedText: '',
      glossText: '',
      detectedLanguage: '',
      signSequence: [],
      isProcessing: false,
      error: null,
      playback: defaultPlayback,
      speech: defaultSpeech,
    }),

  nextSign: () => {
    const { playback, signSequence } = get();
    if (signSequence.length === 0) return;
    const nextIndex = playback.currentIndex + 1;
    if (nextIndex < signSequence.length) {
      set({ playback: { ...playback, currentIndex: nextIndex } });
    } else if (playback.isLooping) {
      set({ playback: { ...playback, currentIndex: 0 } });
    } else {
      set({ playback: { ...playback, isPlaying: false } });
    }
  },

  prevSign: () => {
    const { playback, signSequence } = get();
    if (signSequence.length === 0) return;
    const prevIndex = playback.currentIndex - 1;
    if (prevIndex >= 0) {
      set({ playback: { ...playback, currentIndex: prevIndex } });
    } else if (playback.isLooping) {
      set({
        playback: {
          ...playback,
          currentIndex: signSequence.length - 1,
        },
      });
    }
  },

  togglePlayback: () => {
    const { playback } = get();
    set({ playback: { ...playback, isPlaying: !playback.isPlaying } });
  },

  setSpeed: (speed) => {
    const { playback } = get();
    set({ playback: { ...playback, speed } });
  },
}));
