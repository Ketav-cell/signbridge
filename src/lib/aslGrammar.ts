import { expandContractions, numberToWords } from "@/lib/utils";

const ARTICLES = new Set(["a", "an", "the"]);

const TIME_INDICATORS = new Set([
  "today", "tomorrow", "yesterday", "now", "later",
  "morning", "night", "afternoon", "before", "after",
  "always", "never", "sometimes", "recently", "soon",
]);

const QUESTION_WORDS = new Set([
  "who", "what", "where", "when", "why", "how",
  "which", "whom", "whose",
]);

/**
 * Normalize input text: lowercase, expand contractions, convert numbers to words,
 * and remove punctuation.
 */
export function normalizeText(text: string): string {
  let result = text.toLowerCase().trim();

  // Expand contractions
  result = expandContractions(result);

  // Convert numbers to words
  result = result.replace(/\b\d+\b/g, (match) => {
    const num = parseInt(match, 10);
    if (isNaN(num) || num >= 1000000) return match;
    return numberToWords(num);
  });

  // Remove punctuation but keep spaces
  result = result.replace(/[^\w\s]/g, "");

  // Collapse multiple spaces
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Split normalized text into individual tokens.
 */
export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Convert English sentence tokens into ASL gloss order.
 *
 * Rules applied (conservative — no word dropping, no reordering):
 * 1. Remove articles (a, an, the) — these have no ASL equivalent
 * 2. Move time indicators to the beginning (genuine ASL grammar)
 * 3. Move question words to the beginning if not already there
 * 4. Handle negation: remove "not" / "don't" and append "NOT" at end
 * 5. Uppercase all tokens for ASL gloss notation
 *
 * NOTE: to-be verbs (is/am/are/was/were) and all other words are kept
 * so every spoken word maps to a sign or fingerspelling. This prevents
 * words from mysteriously disappearing in the output.
 */
export function convertToASLGloss(englishText: string): string[] {
  const normalized = normalizeText(englishText);
  let tokens = tokenize(normalized);

  if (tokens.length === 0) return [];

  // 1. Remove articles — no ASL equivalent
  tokens = tokens.filter((t) => !ARTICLES.has(t));

  // 2. Extract time indicators and move to beginning
  const timeTokens: string[] = [];
  const restAfterTime: string[] = [];
  for (const token of tokens) {
    if (TIME_INDICATORS.has(token)) {
      timeTokens.push(token);
    } else {
      restAfterTime.push(token);
    }
  }
  tokens = [...timeTokens, ...restAfterTime];

  // 3. Move question words to the beginning (after any time tokens)
  const questionTokens: string[] = [];
  const restAfterQuestion: string[] = [];
  for (const token of restAfterTime) {
    if (QUESTION_WORDS.has(token)) {
      questionTokens.push(token);
    } else {
      restAfterQuestion.push(token);
    }
  }
  if (questionTokens.length > 0) {
    tokens = [...timeTokens, ...questionTokens, ...restAfterQuestion];
  }

  // 4. Handle negation: pull out "not" and push NOT to end
  let hasNegation = false;
  tokens = tokens.filter((t) => {
    if (t === "not") {
      hasNegation = true;
      return false;
    }
    return true;
  });

  if (hasNegation) {
    tokens.push("NOT");
  }

  // 5. Uppercase all tokens for ASL gloss notation
  return tokens.map((t) => t.toUpperCase());
}
