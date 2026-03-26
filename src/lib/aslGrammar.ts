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

export function normalizeText(text: string): string {
  let result = text.toLowerCase().trim();

  result = expandContractions(result);

  result = result.replace(/\b\d+\b/g, (match) => {
    const num = parseInt(match, 10);
    if (isNaN(num) || num >= 1000000) return match;
    return numberToWords(num);
  });

  result = result.replace(/[^\w\s]/g, "");

  result = result.replace(/\s+/g, " ").trim();

  return result;
}

export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((token) => token.length > 0);
}

export function convertToASLGloss(englishText: string): string[] {
  const normalized = normalizeText(englishText);
  let tokens = tokenize(normalized);

  if (tokens.length === 0) return [];

  tokens = tokens.filter((t) => !ARTICLES.has(t));

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

  return tokens.map((t) => t.toUpperCase());
}
