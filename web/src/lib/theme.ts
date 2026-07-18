export const DEFAULT_THEME = {
  primary: "#1f4d3a",
  primaryHover: "#163829",
  primarySoft: "#e8f2ec",
  accent: "#e36f4a",
  accentHover: "#cf5a36",
  accentSoft: "#fdeee8",
};

/** Simple darken/lighten for derived tokens. */
function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => clamp(x).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function deriveTheme(primary?: string | null, accent?: string | null) {
  const p = primary || DEFAULT_THEME.primary;
  const a = accent || DEFAULT_THEME.accent;
  const pr = hexToRgb(p);
  const ar = hexToRgb(a);
  return {
    primary: p,
    primaryHover: rgbToHex(pr.r * 0.75, pr.g * 0.75, pr.b * 0.75),
    primarySoft: rgbToHex(
      pr.r + (255 - pr.r) * 0.88,
      pr.g + (255 - pr.g) * 0.88,
      pr.b + (255 - pr.b) * 0.88,
    ),
    accent: a,
    accentHover: rgbToHex(ar.r * 0.85, ar.g * 0.85, ar.b * 0.85),
    accentSoft: rgbToHex(
      ar.r + (255 - ar.r) * 0.88,
      ar.g + (255 - ar.g) * 0.88,
      ar.b + (255 - ar.b) * 0.88,
    ),
  };
}

export function themeStyleTag(primary?: string | null, accent?: string | null) {
  const t = deriveTheme(primary, accent);
  return `:root{
    --primary:${t.primary};
    --primary-hover:${t.primaryHover};
    --primary-soft:${t.primarySoft};
    --accent:${t.accent};
    --accent-hover:${t.accentHover};
    --accent-soft:${t.accentSoft};
  }`;
}

export function isValidHex(hex: string) {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(hex);
}
