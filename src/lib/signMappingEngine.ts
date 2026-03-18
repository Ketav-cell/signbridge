import type { SignSequenceItem } from "@/types";

const ISL_BASE =
  "https://raw.githubusercontent.com/satyam9090/Automatic-Indian-Sign-Language-Translator-ISL/master";
const ISL_GIFS_URL = `${ISL_BASE}/ISL_Gifs`;
const ISL_LETTERS_URL = `${ISL_BASE}/letters`;

// All phrases available as GIFs in the ISL repository (ISL_Gifs/)
const ISL_PHRASES = new Set([
  "address", "ahemdabad", "all", "any questions", "are you angry",
  "are you busy", "are you hungry", "assam", "august", "banana",
  "banaras", "banglore", "be careful", "bridge", "cat",
  "christmas", "church", "cilinic", "dasara", "december",
  "did you finish homework", "do you have money",
  "do you want something to drink", "do you watch tv", "dont worry",
  "flower is beautiful", "good afternoon", "good morning", "good question",
  "grapes", "hello", "hindu", "hyderabad", "i am a clerk", "i am fine",
  "i am sorry", "i am thinking", "i am tired", "i go to a theatre",
  "i had to say something but i forgot", "i like pink colour",
  "i love to shop", "job", "july", "june", "karnataka", "kerala",
  "krishna", "lets go for lunch", "mango", "may", "mile", "mumbai",
  "nagpur", "nice to meet you", "open the door", "pakistan",
  "please call me later", "please wait for sometime", "police station",
  "post office", "pune", "punjab", "saturday", "shall i help you",
  "shall we go together tommorow", "shop", "sign language interpreter",
  "sit down", "stand up", "take care", "temple", "there was traffic jam",
  "thursday", "toilet", "tomato", "tuesday", "usa", "village", "wednesday",
  "what are you doing", "what is the problem", "what is today's date",
  "what is your father do", "what is your mobile number",
  "what is your name", "whats up", "where is the bathroom",
  "where is the police station", "you are wrong",
]);

function gifUrl(phrase: string): string {
  return `${ISL_GIFS_URL}/${phrase.replace(/ /g, "%20")}.gif`;
}

function letterUrl(char: string): string {
  return `${ISL_LETTERS_URL}/${char.toLowerCase()}.jpg`;
}

function makeGifItem(phrase: string): SignSequenceItem {
  return {
    word: phrase,
    glossToken: phrase.toUpperCase(),
    signType: "sign",
    mediaUrl: gifUrl(phrase),
    duration: 3000,
    description: phrase,
  };
}

function makeLetterItem(char: string): SignSequenceItem {
  return {
    word: char,
    glossToken: char.toUpperCase(),
    signType: "fingerspell",
    mediaUrl: letterUrl(char),
    duration: 800,
    description: `Letter: ${char.toUpperCase()}`,
    letters: [char.toLowerCase()],
  };
}

/**
 * ISL text-to-sign pipeline:
 * 1. Check if the whole phrase matches an ISL GIF
 * 2. Greedy multi-word phrase matching (longest match first)
 * 3. Single-word matching against ISL phrases
 * 4. Letter-by-letter fingerspelling fallback using letters/ images
 */
export function processText(
  englishText: string,
  _signLanguage?: string
): SignSequenceItem[] {
  if (!englishText?.trim()) return [];

  const normalized = englishText
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Try full phrase match first
  if (ISL_PHRASES.has(normalized)) {
    return [makeGifItem(normalized)];
  }

  const words = normalized.split(" ").filter(Boolean);
  const sequence: SignSequenceItem[] = [];
  let i = 0;

  while (i < words.length) {
    let matched = false;

    // Greedy: try longest multi-word phrase first (up to 7 words)
    for (let len = Math.min(words.length - i, 7); len >= 1; len--) {
      const phrase = words.slice(i, i + len).join(" ");
      if (ISL_PHRASES.has(phrase)) {
        sequence.push(makeGifItem(phrase));
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Fingerspell letter by letter
      for (const char of words[i]) {
        if (/[a-z]/.test(char)) {
          sequence.push(makeLetterItem(char));
        }
      }
      i++;
    }
  }

  return sequence;
}

// Kept for backward compatibility
export function fingerspell(word: string): SignSequenceItem {
  const letters = word.toLowerCase().split("").filter((c) => /[a-z]/.test(c));
  return {
    word,
    glossToken: word.toUpperCase(),
    signType: "fingerspell",
    mediaUrl: letters[0] ? letterUrl(letters[0]) : "",
    duration: letters.length * 800,
    description: `Fingerspell: ${word}`,
    letters,
  };
}
