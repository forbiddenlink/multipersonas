// Deterministic persona monogram — a mono initial tile in a neutral, severity-free
// palette. No image-gen dependency, reproducible from the name, and it avoids the
// cutesy-mascot anti-pattern. The faint tint is mixed into the theme's own `--muted`
// so it adapts to light/dark and never lands on a severity hue.

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "··";
}

function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 1000;
  // Warm-neutral band [30, 120]; deliberately excludes teal (195) and the severity hues.
  return 30 + (h % 90);
}

export function Monogram({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const hue = hueFromName(name);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-sm border border-border font-mono font-medium text-foreground/85 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: `color-mix(in oklch, var(--muted) 82%, oklch(0.6 0.05 ${hue}) 18%)`,
      }}
    >
      {initials(name)}
    </span>
  );
}
