/**
 * Generate a deterministic HSL color based on a string
 * @param str The string to generate color from (agent name or ID)
 * @returns An HSL color string
 */
export function generateAgentColor(str: string): string {
  if (!str) return "hsl(220, 65%, 55%)"; // Default blue if no string provided

  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to positive number and use it to generate hue (0-360)
  const hue = Math.abs(hash) % 360;

  // Use HSL with fixed saturation and lightness for consistent, pleasant colors
  // Saturation: 65% for vibrant but not overwhelming colors
  // Lightness: 55% for good contrast with white text
  return `hsl(${hue}, 65%, 55%)`;
}
