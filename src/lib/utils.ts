import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de utilidades
 * Tailwind (tailwind-merge). Usado por todos los componentes de components/ui/*.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
