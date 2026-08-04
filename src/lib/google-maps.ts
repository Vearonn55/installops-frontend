/**
 * Derives an embeddable Google Maps iframe URL from a regular Google Maps
 * link (the one managers paste when creating an installation).
 *
 * Google blocks framing of normal /maps pages, so we extract the pin from the
 * URL and rebuild it with `output=embed`, which is allowed without an API key.
 * Returns null when nothing can be extracted (e.g. maps.app.goo.gl short
 * links, whose target is only known after a redirect).
 */
export function googleMapsEmbedSrc(mapsUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(mapsUrl);
  } catch {
    return null;
  }

  const embed = (q: string) =>
    `https://maps.google.com/maps?q=${q}&z=16&output=embed`;

  // Exact pin coordinates: ...!3d<lat>!4d<lng> (more precise than the
  // viewport center after the @).
  const pin = mapsUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pin) return embed(`${pin[1]},${pin[2]}`);

  // Viewport center: /maps/.../@<lat>,<lng>,<zoom>z
  const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return embed(`${at[1]},${at[2]}`);

  // Named place: /maps/place/<name>/... (segment is already URL-encoded).
  const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (place) return embed(place[1]);

  // Search-style links: ?q=... or ?query=... (also covers
  // /maps/search/?api=1&query=lat,lng links).
  const q = url.searchParams.get('query') ?? url.searchParams.get('q');
  if (q) return embed(encodeURIComponent(q));

  return null;
}
