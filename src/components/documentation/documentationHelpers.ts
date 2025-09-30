export function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export function extractTags(tags: string[][]): string[] {
  return tags
    .filter((tag) => tag[0] === "t")
    .map((tag) => tag[1]);
}