export function formatCost(cost: string | number | undefined): string | null {
  if (!cost) return null;

  const numCost = typeof cost === "string" ? parseFloat(cost) : cost;

  if (isNaN(numCost)) return null;

  // Hide costs less than $0.001
  if (numCost < 0.001) return null;

  // Format based on size
  if (numCost < 0.01) return "< $0.01";
  if (numCost < 1) return `$${numCost.toFixed(2)}`;
  if (numCost < 10) return `$${numCost.toFixed(2)}`;
  if (numCost < 100) return `$${numCost.toFixed(1)}`;

  return `$${Math.round(numCost)}`;
}
