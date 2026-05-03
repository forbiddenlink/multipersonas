export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

export function scoreRingColor(score: number): string {
  if (score >= 80) return "border-green-400";
  if (score >= 50) return "border-yellow-400";
  return "border-red-400";
}

export function scoreBgGlow(score: number): string {
  if (score >= 80) return "shadow-green-400/20";
  if (score >= 50) return "shadow-yellow-400/20";
  return "shadow-red-400/20";
}

export function scoreStrokeColor(score: number): string {
  if (score >= 80) return "oklch(0.72 0.15 160)";
  if (score >= 50) return "oklch(0.78 0.12 85)";
  return "oklch(0.65 0.20 25)";
}
