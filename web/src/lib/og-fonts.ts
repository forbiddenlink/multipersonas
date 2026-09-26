// Fetch brand fonts for next/og ImageResponse (Satori needs raw TTF/OTF bytes).
// Google Fonts serves TTF when the request has no modern User-Agent. On any failure
// the image still renders with Satori's built-in fallback, so a network blip never
// breaks a social card.
type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: "normal" };

async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function ogFonts(): Promise<OgFont[]> {
  const [serif, mono] = await Promise.all([
    loadGoogleFont("Newsreader", 500),
    loadGoogleFont("IBM Plex Mono", 500),
  ]);
  const fonts: OgFont[] = [];
  if (serif) fonts.push({ name: "Newsreader", data: serif, weight: 500, style: "normal" });
  if (mono) fonts.push({ name: "Plex Mono", data: mono, weight: 500, style: "normal" });
  return fonts;
}
