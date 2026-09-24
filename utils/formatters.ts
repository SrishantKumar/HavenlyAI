/**
 * Formats a duration in seconds to MM:SS format.
 * @param seconds - Number of seconds
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');
  return `${paddedMins}:${paddedSecs}`;
}

/**
 * Formats a Date object or string into a user-friendly timestamp.
 * Example outputs: "Today, 3:14 PM", "Yesterday", "August 20"
 */
export function formatFriendlyDate(dateString: string | Date): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const timeString = date.toLocaleTimeString(undefined, timeOptions);

  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return `Today at ${timeString}`;
  } else if (diffDays <= 1 && date.getDate() !== now.getDate()) {
    return `Yesterday at ${timeString}`;
  } else if (diffDays < 7) {
    const weekdayOptions: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return `${date.toLocaleDateString(undefined, weekdayOptions)} at ${timeString}`;
  } else {
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${date.toLocaleDateString(undefined, dateOptions)} · ${timeString}`;
  }
}

/**
 * Masks a phone number for display safety (e.g. +91 ••••••4821).
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'Not registered';
  const trimmed = phone.trim();
  if (trimmed.length < 7) return trimmed;
  
  // Keep country code if exists, mask center digits, keep last 4 digits
  const lastFour = trimmed.slice(-4);
  const prefixLength = trimmed.startsWith('+') ? 3 : 2;
  const prefix = trimmed.slice(0, prefixLength);
  
  return `${prefix} •••••• ${lastFour}`;
}

/**
 * Gets a greeting based on the current hour.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
