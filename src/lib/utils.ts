import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza un texto para búsquedas: elimina acentos y convierte a minúsculas.
 * "María" → "maria" | "HÉCTOR" → "hector" | "Año" → "ano"
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')                         // descompone caracteres: "á" → "a" + acento
    .replace(/[\u0300-\u036f]/g, '')          // elimina los acentos/diacríticos
    .toLowerCase()
    .trim();
}
