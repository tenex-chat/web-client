function hashPubkey(pubkey: string): number {
  let hash = 0;
  for (let i = 0; i < pubkey.length; i++) {
    const char = pubkey.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// A palette of vibrant but not too bright colors that work well as avatar backgrounds
const avatarColorPalette = [
  "rgb(239, 68, 68)", // red-500
  "rgb(245, 158, 11)", // amber-500
  "rgb(34, 197, 94)", // green-500
  "rgb(59, 130, 246)", // blue-500
  "rgb(168, 85, 247)", // purple-500
  "rgb(236, 72, 153)", // pink-500
  "rgb(20, 184, 166)", // teal-500
  "rgb(251, 146, 60)", // orange-500
  "rgb(99, 102, 241)", // indigo-500
  "rgb(244, 63, 94)", // rose-500
  "rgb(14, 165, 233)", // sky-500
  "rgb(139, 92, 246)", // violet-500
  "rgb(6, 182, 212)", // cyan-500
  "rgb(132, 204, 22)", // lime-500
  "rgb(217, 119, 6)", // yellow-600
  "rgb(220, 38, 38)", // red-600
];

const avatarColorPaletteTailwind = [
  "bg-red-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-lime-500",
  "bg-yellow-600",
  "bg-red-600",
];

/**
 * Get a deterministic background color for an avatar based on pubkey
 * Returns an RGBA string with 10% opacity that can be used in style attributes
 */
export function getAvatarBackgroundColor(
  pubkey: string | undefined,
  opacity: number = 0.1,
): string {
  if (!pubkey) {
    return `rgba(107, 114, 128, ${opacity})`; // gray-500 as fallback
  }

  const hash = hashPubkey(pubkey);
  const colorIndex = hash % avatarColorPalette.length;
  const color = avatarColorPalette[colorIndex];

  // Convert rgb to rgba with opacity
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
  }

  return color; // fallback to original if parsing fails
}

/**
 * Get a deterministic background color class for an avatar based on pubkey
 * Returns a Tailwind CSS class
 */
export function getAvatarBackgroundClass(pubkey: string | undefined): string {
  if (!pubkey) {
    return "bg-gray-500";
  }

  const hash = hashPubkey(pubkey);
  const colorIndex = hash % avatarColorPaletteTailwind.length;
  return avatarColorPaletteTailwind[colorIndex];
}

/**
 * Get a deterministic gradient background for an avatar based on pubkey
 * Returns a CSS gradient string that can be used in style attributes
 */
export function getAvatarGradientBackground(
  pubkey: string | undefined,
): string {
  if (!pubkey) {
    return "linear-gradient(135deg, rgb(107, 114, 128), rgb(75, 85, 99))"; // gray gradient
  }

  const hash = hashPubkey(pubkey);
  const primaryIndex = hash % avatarColorPalette.length;
  const secondaryIndex = (hash + 7) % avatarColorPalette.length; // offset by prime number for variety

  const primaryColor = avatarColorPalette[primaryIndex];
  const secondaryColor = avatarColorPalette[secondaryIndex];

  return `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
}
