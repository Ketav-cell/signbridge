import type { SignEntry, SignLanguageType, SignSequenceItem } from "@/types";
import { convertToASLGloss, normalizeText } from "@/lib/aslGrammar";
import dictionaryData from "@/data/dictionary.json";
import alphabetData from "@/data/aslAlphabet.json";

// Build lookup maps from dictionary data
const signsByWord = new Map<string, SignEntry>();
const signsBySynonym = new Map<string, SignEntry>();

function initializeMaps() {
  if (signsByWord.size > 0) return; // Already initialized

  const entries = dictionaryData as SignEntry[];
  for (const entry of entries) {
    const key = entry.englishWord.toLowerCase();
    signsByWord.set(key, entry);

    if (entry.synonyms) {
      for (const synonym of entry.synonyms) {
        const synKey = synonym.toLowerCase();
        if (!signsByWord.has(synKey)) {
          signsBySynonym.set(synKey, entry);
        }
      }
    }
  }
}

/**
 * Look up a sign in the dictionary by word.
 * Checks the primary word map first, then synonyms.
 */
export function lookupSign(
  word: string,
  signLanguage: SignLanguageType
): SignEntry | null {
  initializeMaps();

  const key = word.toLowerCase();

  // Check primary word map
  const primary = signsByWord.get(key);
  if (primary && primary.signLanguage === signLanguage) {
    return primary;
  }

  // Check synonym map
  const synonym = signsBySynonym.get(key);
  if (synonym && synonym.signLanguage === signLanguage) {
    return synonym;
  }

  // If no language-specific match, return any match (for fallback)
  return primary || synonym || null;
}

/**
 * Create a fingerspelling sequence item for a word not found in the dictionary.
 */
export function fingerspell(word: string): SignSequenceItem {
  const letters = word.toUpperCase().split("");
  const LETTER_DURATION = 500; // ms per letter
  const totalDuration = letters.length * LETTER_DURATION;

  return {
    word: word,
    glossToken: word.toUpperCase(),
    signType: "fingerspell",
    mediaUrl: "",
    duration: totalDuration,
    description: `Fingerspell: ${letters.join("-")}`,
    letters: letters,
  };
}

/**
 * Full text-to-sign processing pipeline.
 *
 * 1. Normalize text (lowercase, expand contractions, numbers to words, strip punctuation)
 * 2. Convert to ASL gloss token order
 * 3. For each gloss token, look up in dictionary or fingerspell
 * 4. Return ordered array of sign sequence items
 */
export function processText(
  englishText: string,
  signLanguage: SignLanguageType = "ASL"
): SignSequenceItem[] {
  initializeMaps();

  if (!englishText || englishText.trim().length === 0) {
    return [];
  }

  // Convert to ASL gloss tokens (normalizeText is called internally)
  const glossTokens = convertToASLGloss(englishText);

  const sequence: SignSequenceItem[] = [];

  for (const token of glossTokens) {
    const entry = lookupSign(token, signLanguage);

    if (entry) {
      sequence.push({
        word: entry.englishWord,
        glossToken: token,
        signType: "sign",
        mediaUrl: entry.mediaUrl,
        duration: entry.duration,
        description: entry.description,
      });
    } else {
      sequence.push(fingerspell(token.toLowerCase()));
    }
  }

  return sequence;
}
