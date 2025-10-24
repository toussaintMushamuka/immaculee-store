import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string): string {
  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  } else {
    return `${amount.toLocaleString()} FC`;
  }
}
