import type { TranslationResult } from "@/types";
import { LRUCache } from "@/lib/cache";

const translationCache = new LRUCache<string, TranslationResult>(200);

/**
 * Translate text between languages.
 * Checks cache first, then tries MyMemory API, then LibreTranslate, then falls back
 * to returning the original text.
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult> {
  // If source and target are the same, return as-is
  if (sourceLang === targetLang) {
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    };
  }

  const cacheKey = `${sourceLang}:${targetLang}:${text}`;

  // Check cache
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  // Try MyMemory Translation API (free, no key needed)
  try {
    const result = await tryMyMemory(text, sourceLang, targetLang);
    if (result) {
      translationCache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.warn("MyMemory API failed:", error);
  }

  // Try LibreTranslate if URL is configured
  const libreUrl = process.env.LIBRETRANSLATE_URL || process.env.NEXT_PUBLIC_LIBRETRANSLATE_URL;
  if (libreUrl) {
    try {
      const result = await tryLibreTranslate(text, sourceLang, targetLang, libreUrl);
      if (result) {
        translationCache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.warn("LibreTranslate API failed:", error);
    }
  }

  // Fallback: return original text
  console.warn(
    `All translation APIs failed for "${text}" (${sourceLang} -> ${targetLang}). Returning original text.`
  );
  const fallback: TranslationResult = {
    originalText: text,
    translatedText: text,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
  };
  translationCache.set(cacheKey, fallback);
  return fallback;
}

async function tryMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  const response = await fetch(url);

  if (!response.ok) return null;

  const data = await response.json();

  if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
    return null;
  }

  return {
    originalText: text,
    translatedText: data.responseData.translatedText,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
  };
}

async function tryLibreTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  baseUrl: string
): Promise<TranslationResult | null> {
  const response = await fetch(`${baseUrl}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: "text",
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();

  if (!data.translatedText) return null;

  return {
    originalText: text,
    translatedText: data.translatedText,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
  };
}

/**
 * Detect the language of the given text using character-range heuristics.
 * Returns an ISO 639-1 language code.
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "en";

  const sample = text.trim();

  // Count characters in various Unicode ranges
  let cjkCount = 0;
  let cyrillicCount = 0;
  let arabicCount = 0;
  let devanagariCount = 0;
  let hangulCount = 0;
  let thaiCount = 0;
  let latinCount = 0;
  let totalAlpha = 0;

  for (const char of sample) {
    const code = char.codePointAt(0)!;

    // CJK Unified Ideographs
    if (code >= 0x4e00 && code <= 0x9fff) {
      cjkCount++;
      totalAlpha++;
    }
    // Hiragana / Katakana
    else if ((code >= 0x3040 && code <= 0x309f) || (code >= 0x30a0 && code <= 0x30ff)) {
      cjkCount++;
      totalAlpha++;
    }
    // Cyrillic
    else if (code >= 0x0400 && code <= 0x04ff) {
      cyrillicCount++;
      totalAlpha++;
    }
    // Arabic
    else if (code >= 0x0600 && code <= 0x06ff) {
      arabicCount++;
      totalAlpha++;
    }
    // Devanagari
    else if (code >= 0x0900 && code <= 0x097f) {
      devanagariCount++;
      totalAlpha++;
    }
    // Hangul
    else if (code >= 0xac00 && code <= 0xd7af) {
      hangulCount++;
      totalAlpha++;
    }
    // Thai
    else if (code >= 0x0e00 && code <= 0x0e7f) {
      thaiCount++;
      totalAlpha++;
    }
    // Basic Latin letters
    else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
      latinCount++;
      totalAlpha++;
    }
  }

  if (totalAlpha === 0) return "en";

  const threshold = 0.3;

  if (cjkCount / totalAlpha > threshold) {
    // Distinguish Chinese vs Japanese: presence of hiragana/katakana suggests Japanese
    let kanaCount = 0;
    for (const char of sample) {
      const code = char.codePointAt(0)!;
      if ((code >= 0x3040 && code <= 0x309f) || (code >= 0x30a0 && code <= 0x30ff)) {
        kanaCount++;
      }
    }
    return kanaCount > 0 ? "ja" : "zh";
  }
  if (cyrillicCount / totalAlpha > threshold) return "ru";
  if (arabicCount / totalAlpha > threshold) return "ar";
  if (devanagariCount / totalAlpha > threshold) return "hi";
  if (hangulCount / totalAlpha > threshold) return "ko";
  if (thaiCount / totalAlpha > threshold) return "th";

  // Default to English for Latin-script text
  return "en";
}
