import type { SignEntry, SignLanguageType } from "@/types";
import dictionaryData from "@/data/dictionary.json";

const entries = dictionaryData as SignEntry[];

export function getAllSigns(signLanguage?: SignLanguageType): SignEntry[] {
  if (!signLanguage) return entries;
  return entries.filter((entry) => entry.signLanguage === signLanguage);
}

export function searchSigns(
  query: string,
  signLanguage?: SignLanguageType
): SignEntry[] {
  const lowerQuery = query.toLowerCase();
  const pool = signLanguage
    ? entries.filter((e) => e.signLanguage === signLanguage)
    : entries;

  return pool.filter((entry) => {
    if (entry.englishWord.toLowerCase().includes(lowerQuery)) return true;
    if (entry.glossToken.toLowerCase().includes(lowerQuery)) return true;
    if (entry.category.toLowerCase().includes(lowerQuery)) return true;
    if (
      entry.synonyms &&
      entry.synonyms.some((s) => s.toLowerCase().includes(lowerQuery))
    ) {
      return true;
    }
    return false;
  });
}

export function getSignsByCategory(
  category: string,
  signLanguage?: SignLanguageType
): SignEntry[] {
  const lowerCategory = category.toLowerCase();
  const pool = signLanguage
    ? entries.filter((e) => e.signLanguage === signLanguage)
    : entries;

  return pool.filter(
    (entry) => entry.category.toLowerCase() === lowerCategory
  );
}

export function getCategories(): string[] {
  const categorySet = new Set<string>();
  for (const entry of entries) {
    if (entry.category) {
      categorySet.add(entry.category);
    }
  }
  return Array.from(categorySet).sort();
}

export function getSignById(id: string): SignEntry | null {
  return entries.find((entry) => entry.id === id) || null;
}
