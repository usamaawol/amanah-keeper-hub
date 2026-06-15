import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LIBNAMES_KEY = "amanah-libnames";

export function libraryIdFor(uid: string) {
  return `lib_${uid}`;
}

export function readLibNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LIBNAMES_KEY) || "{}");
  } catch {
    return {};
  }
}

export function storeLibName(uid: string, name: string) {
  if (typeof window === "undefined" || !name) return;
  const map = readLibNames();
  map[uid] = name;
  localStorage.setItem(LIBNAMES_KEY, JSON.stringify(map));
}

export function getStoredLibName(uid: string): string | null {
  return readLibNames()[uid] ?? null;
}
