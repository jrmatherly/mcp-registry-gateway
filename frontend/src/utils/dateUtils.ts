/**
 * Date utility functions for the MCP Registry Gateway frontend.
 */

/**
 * Formats a timestamp into a human-readable "time ago" string.
 *
 * @param timestamp - ISO timestamp string, null, or undefined
 * @returns Formatted string like "5m ago", "2h ago", "3d ago", or null if invalid
 */
export const formatTimeSince = (timestamp: string | null | undefined): string | null => {
  if (!timestamp) {
    return null;
  }

  try {
    const now = new Date();
    const lastChecked = new Date(timestamp);

    // Check if the date is valid
    if (Number.isNaN(lastChecked.getTime())) {
      return null;
    }

    const diffMs = now.getTime() - lastChecked.getTime();

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    }
    return `${diffSeconds}s ago`;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('formatTimeSince error:', error, 'for timestamp:', timestamp);
    }
    return null;
  }
};

/**
 * Formats a date to ISO date string (YYYY-MM-DD).
 *
 * @param date - Date object or timestamp
 * @returns ISO date string
 */
export const formatISODate = (date: Date | number): string => {
  return new Date(date).toISOString().split('T')[0];
};
