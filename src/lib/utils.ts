import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** whole seconds elapsed since a unix-ms timestamp */
export function secondsSince(ts: number): number {
  return Math.round((Date.now() - ts) / 1000)
}
