/**
 * Generate a deterministic HSL color based on a string
 */
export function getPackColor(packId: string): string {
  const hash = packId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}