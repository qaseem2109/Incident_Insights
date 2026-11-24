const HEAD_COLORS: Record<string, string> = {
  "Target Killing": "#E5484D",
  "IED Blast": "#F76B15",
  "Hand Grenade": "#D6409F",
  "Firing": "#3E63DD",
  "Target Shooting": "#8E4EC6",
  "Cracker Blast": "#D9A300",
  "Suicide Attack": "#8C1D2A",
  "Sectarian Target Killing": "#12A594",
  "Sectarian Target Shooting": "#0D74CE",
  "Attack": "#687076",
  "Bottle Bomb": "#AB6400",
  "MBIED": "#C2410C",
  "Chemical Arson Attack": "#30A46C",
  "Political Target Killing": "#5B5BD6",
};

const FALLBACK_PALETTE = [
  "#2563EB",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#4F46E5",
  "#65A30D",
  "#EA580C",
  "#0D9488",
];

export function getHeadColor(head: string | null | undefined): string {
  if (!head) return "#687076";
  const normalized = head.trim();
  if (HEAD_COLORS[normalized]) {
    return HEAD_COLORS[normalized];
  }
  const lowerKey = Object.keys(HEAD_COLORS).find(
    (k) => k.toLowerCase() === normalized.toLowerCase()
  );
  if (lowerKey) {
    return HEAD_COLORS[lowerKey];
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}
