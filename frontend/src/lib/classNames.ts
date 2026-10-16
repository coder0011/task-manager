/**
 * Conditionally joins CSS class names together into a single space-delimited string.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
