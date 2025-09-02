/**
 * Generate a deterministic color class for a role based on its string value
 */
export function getRoleColor(role: string | undefined): string {
  if (!role) return "bg-gray-500/10 text-gray-500";
  
  // Generate a hash from the role string
  const hash = role.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Define color classes
  const colors = [
    "bg-blue-500/10 text-blue-500",
    "bg-green-500/10 text-green-500",
    "bg-purple-500/10 text-purple-500",
    "bg-pink-500/10 text-pink-500",
    "bg-orange-500/10 text-orange-500",
    "bg-yellow-500/10 text-yellow-500",
    "bg-indigo-500/10 text-indigo-500",
    "bg-red-500/10 text-red-500",
    "bg-teal-500/10 text-teal-500",
  ];
  
  // Use modulo to select a color deterministically
  return colors[hash % colors.length];
}