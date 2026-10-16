/**
 * DataPure Enterprise Task Manager - Formatting Utilities
 * Standardized date, time, file size, text truncation, and user initials formatters.
 */

/**
 * Formats an ISO date string or Date object into a readable date string.
 * @param dateInput Date object, timestamp, or ISO string
 * @param style 'short' (e.g. "Nov 15"), 'medium' (e.g. "Nov 15, 2026"), 'full' (e.g. "Friday, November 15, 2026"), 'input' ("YYYY-MM-DD")
 */
export function formatDate(
  dateInput?: string | number | Date | null,
  style: 'short' | 'medium' | 'full' | 'input' = 'medium'
): string {
  if (!dateInput) return '';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  if (style === 'input') {
    return d.toISOString().split('T')[0];
  }

  if (style === 'short') {
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }

  if (style === 'full') {
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // medium
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formats an ISO date string or Date object into date + time (e.g. "Nov 15, 06:30 PM").
 */
export function formatDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Returns human-friendly relative time (e.g. "Just now", "5m ago", "2h ago", "3d ago").
 */
export function formatRelativeTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) {
    // In the future (e.g. due date)
    const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24));
    if (futureDays === 0) return 'Today';
    if (futureDays === 1) return 'Tomorrow';
    return `in ${futureDays} days`;
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 45) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Formats byte size into human readable string (B, KB, MB, GB).
 */
export function formatFileSize(bytes: number = 0): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Extracts 1 or 2 uppercase initials safely from any user full name string.
 * e.g., "Alex Vance" -> "AV", "Sarah" -> "S", null -> "U"
 */
export function formatUserInitials(name?: string | null, maxChars: number = 2): string {
  if (!name || !name.trim()) return 'U';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, maxChars).toUpperCase();
  }

  const initials = parts[0][0] + parts[parts.length - 1][0];
  return initials.substring(0, maxChars).toUpperCase();
}

/**
 * Safely truncates a string with an ellipsis if it exceeds maxLength.
 */
export function truncateText(text?: string | null, maxLength: number = 60): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str?: string | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
