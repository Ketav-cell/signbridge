import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function expandContractions(text: string): string {
  const contractions: Record<string, string> = {
    "i'm": "i am", "i've": "i have", "i'll": "i will", "i'd": "i would",
    "you're": "you are", "you've": "you have", "you'll": "you will", "you'd": "you would",
    "he's": "he is", "he'll": "he will", "he'd": "he would",
    "she's": "she is", "she'll": "she will", "she'd": "she would",
    "it's": "it is", "it'll": "it will", "it'd": "it would",
    "we're": "we are", "we've": "we have", "we'll": "we will", "we'd": "we would",
    "they're": "they are", "they've": "they have", "they'll": "they will", "they'd": "they would",
    "that's": "that is", "that'll": "that will", "that'd": "that would",
    "who's": "who is", "who'll": "who will", "who'd": "who would",
    "what's": "what is", "what'll": "what will", "what'd": "what would",
    "where's": "where is", "where'll": "where will", "where'd": "where would",
    "when's": "when is", "when'll": "when will", "when'd": "when would",
    "why's": "why is", "why'll": "why will", "why'd": "why would",
    "how's": "how is", "how'll": "how will", "how'd": "how would",
    "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
    "hasn't": "has not", "haven't": "have not", "hadn't": "had not",
    "doesn't": "does not", "don't": "do not", "didn't": "did not",
    "won't": "will not", "wouldn't": "would not",
    "shan't": "shall not", "shouldn't": "should not",
    "can't": "cannot", "couldn't": "could not",
    "mustn't": "must not", "needn't": "need not",
    "let's": "let us", "there's": "there is", "here's": "here is",
  };

  let result = text.toLowerCase();
  for (const [contraction, expansion] of Object.entries(contractions)) {
    result = result.replace(new RegExp(contraction.replace("'", "'?"), "gi"), expansion);
  }
  return result;
}

export function numberToWords(num: number): string {
  if (num === 0) return "zero";

  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  if (num < 0) return "negative " + numberToWords(-num);
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " hundred" + (num % 100 ? " " + numberToWords(num % 100) : "");
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + " thousand" + (num % 1000 ? " " + numberToWords(num % 1000) : "");
  return String(num);
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
