function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const predefinedPhases = {
  chat: { bg: "bg-blue-500/90", text: "text-white", border: "border-blue-600" },
  plan: {
    bg: "bg-purple-500/90",
    text: "text-white",
    border: "border-purple-600",
  },
  execute: {
    bg: "bg-green-500/90",
    text: "text-white",
    border: "border-green-600",
  },
  review: {
    bg: "bg-orange-500/90",
    text: "text-white",
    border: "border-orange-600",
  },
  chores: {
    bg: "bg-gray-500/90",
    text: "text-white",
    border: "border-gray-600",
  },
} as const;

const colorPalette = [
  { bg: "bg-red-500/90", text: "text-white", border: "border-red-600" },
  { bg: "bg-yellow-500/90", text: "text-white", border: "border-yellow-600" },
  { bg: "bg-emerald-500/90", text: "text-white", border: "border-emerald-600" },
  { bg: "bg-cyan-500/90", text: "text-white", border: "border-cyan-600" },
  { bg: "bg-indigo-500/90", text: "text-white", border: "border-indigo-600" },
  { bg: "bg-pink-500/90", text: "text-white", border: "border-pink-600" },
  { bg: "bg-teal-500/90", text: "text-white", border: "border-teal-600" },
  { bg: "bg-violet-500/90", text: "text-white", border: "border-violet-600" },
  { bg: "bg-amber-500/90", text: "text-white", border: "border-amber-600" },
  { bg: "bg-lime-500/90", text: "text-white", border: "border-lime-600" },
  { bg: "bg-rose-500/90", text: "text-white", border: "border-rose-600" },
  { bg: "bg-sky-500/90", text: "text-white", border: "border-sky-600" },
];

export function getPhaseColors(phase: string | null | undefined) {
  if (!phase) {
    return {
      bg: "bg-gray-400/90",
      text: "text-white",
      border: "border-gray-500",
    };
  }

  const normalizedPhase = phase.toLowerCase();

  if (normalizedPhase in predefinedPhases) {
    return predefinedPhases[normalizedPhase as keyof typeof predefinedPhases];
  }

  const hash = hashString(normalizedPhase);
  const colorIndex = hash % colorPalette.length;
  return colorPalette[colorIndex];
}

export function getPhaseColorClasses(phase: string | null | undefined): string {
  const colors = getPhaseColors(phase);
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

export function getPhaseIndicatorColor(
  phase: string | null | undefined,
): string {
  if (!phase) return "bg-gray-400";

  const normalizedPhase = phase.toLowerCase();

  const predefinedIndicatorColors: Record<string, string> = {
    chat: "bg-blue-500",
    plan: "bg-purple-500",
    execute: "bg-green-500",
    review: "bg-orange-500",
    chores: "bg-gray-500",
  };

  if (normalizedPhase in predefinedIndicatorColors) {
    return predefinedIndicatorColors[normalizedPhase];
  }

  const indicatorPalette = [
    "bg-red-500",
    "bg-yellow-500",
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-lime-500",
    "bg-rose-500",
    "bg-sky-500",
  ];

  const hash = hashString(normalizedPhase);
  const colorIndex = hash % indicatorPalette.length;
  return indicatorPalette[colorIndex];
}
