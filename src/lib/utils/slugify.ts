/**
 * Convert a string to a URL-safe slug
 * @param text The text to slugify
 * @returns A URL-safe slug
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // Remove leading and trailing hyphens
  return slug.replace(/^-+|-+$/g, "");
}
