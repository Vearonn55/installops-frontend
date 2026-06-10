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
    const prefixCmp = pa.prefix.localeCompare(pb.prefix);
    if (prefixCmp !== 0) return prefixCmp;
    if (pa.num < pb.num) return -1;
    if (pa.num > pb.num) return 1;
    return as.localeCompare(bs);
  }

  return as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortOrdersByNetsisIdDesc<T extends { id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => compareNetsisOrderIds(b.id, a.id));
}
