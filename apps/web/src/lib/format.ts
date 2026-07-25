/** Format minor units (paise) to an INR string. */
export function formatMoney(minor: number, currency = 'INR'): string {
  const major = minor / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}

/** Compact number, e.g. 1240 -> 1.2K */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(n);
}
