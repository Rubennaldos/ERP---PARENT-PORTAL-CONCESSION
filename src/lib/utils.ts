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
  if (!text) return '';
  return String(text)
    .normalize('NFKC') // compatibilidad Unicode (ej. variantes de espacios / caracteres)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita marcas diacríticas (tildes, etc.)
    .toLowerCase()
    .trim();
}
