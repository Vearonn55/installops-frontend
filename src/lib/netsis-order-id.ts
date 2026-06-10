/** Match backend compareNetsisOrderIds — L000… / S000… newest = higher numeric tail. */
export function compareNetsisOrderIds(a: string, b: string): number {
  const as = String(a ?? '').trim();
  const bs = String(b ?? '').trim();
  if (as === bs) return 0;

  const parse = (s: string) => {
    const m = s.match(/^([^0-9]*)(\d+)$/);
    if (!m) return null;
    return { prefix: m[1].toUpperCase(), num: BigInt(m[2]) };
  };

  const pa = parse(as);
  const pb = parse(bs);
  if (pa && pb) {
    if (pa.prefix === pb.prefix) {
      if (pa.num < pb.num) return -1;
      if (pa.num > pb.num) return 1;
      return as.localeCompare(bs);
    }
    return 0;
  }

  return as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortOrdersByNetsisIdDesc<T extends { id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => compareNetsisOrderIds(b.id, a.id));
}

function placedAtMs(o: { placed_at?: string | null; created_at?: string | null }): number | null {
  const raw = o.placed_at ?? o.created_at;
  if (!raw) return null;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : null;
}

/** Newest ERP slip first: placed_at desc, then numeric order id desc. */
export function compareOrdersByRecency(
  a: { id: string; placed_at?: string | null; created_at?: string | null },
  b: { id: string; placed_at?: string | null; created_at?: string | null }
): number {
  const ta = placedAtMs(a);
  const tb = placedAtMs(b);
  if (ta != null && tb != null && ta !== tb) return tb - ta;
  if (ta != null && tb == null) return -1;
  if (ta == null && tb != null) return 1;
  return compareNetsisOrderIds(b.id, a.id);
}

export function sortOrdersByRecencyDesc<T extends { id: string; placed_at?: string | null; created_at?: string | null }>(
  list: T[]
): T[] {
  return [...list].sort(compareOrdersByRecency);
}
