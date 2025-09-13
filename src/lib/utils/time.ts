/**
 * Format a Unix timestamp as relative time (e.g., "2h", "10m")
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const date = new Date(timestamp * 1000); // Convert from Unix timestamp
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) {
    return "now";
  } else if (diffMin < 60) {
    return `${diffMin}m`;
  } else if (diffHour < 24) {
    return `${diffHour}h`;
  } else if (diffDay < 7) {
    return `${diffDay}d`;
  } else if (diffWeek < 4) {
    return `${diffWeek}w`;
  } else if (diffMonth < 12) {
    return `${diffMonth}mo`;
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

/**
 * Format a Unix timestamp as compact relative time (e.g., "2h", "3d")
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted compact time string
 */
export function formatCompactTime(timestamp: number): string {
  const now = Date.now();
  const date = new Date(timestamp * 1000);
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  if (diffWeek < 4) return `${diffWeek}w`;
  if (diffMonth < 12) return `${diffMonth}mo`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Format a Unix timestamp as a human-readable date/time
 * Shows time if today, month/day if this year, full date otherwise
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date/time string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();

  // If today, show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // If this year, show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // Otherwise show full date
  return date.toLocaleDateString();
}
