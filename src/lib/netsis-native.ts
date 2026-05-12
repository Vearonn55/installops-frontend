/** Helpers for NetOpenX-shaped `document` + `lines` from `GET /integrations/netsis/orders/detail`. */

export type NetsisJson = Record<string, unknown>;

export function pickStokKoduFromLine(line: NetsisJson | null | undefined): string {
  if (!line || typeof line !== 'object') return '';
  const r = line as Record<string, unknown>;
  const Stok =
    r.Stok != null && typeof r.Stok === 'object' && !Array.isArray(r.Stok)
      ? (r.Stok as Record<string, unknown>)
      : {};
  return String(
    r.StokKodu ??
      r.stokKodu ??
      r.STRA_MALKOD ??
      r.STRA_STKKODU ??
      r.STK_KODU ??
      r.STOK_KODU ??
      Stok.STOK_KODU ??
      Stok.StokKodu ??
      ''
  ).trim();
}

export function pickLineQuantity(line: NetsisJson): number {
  const r = line as Record<string, unknown>;
  const q =
    r.MIKTAR ??
    r.miktar ??
    r.STRA_GCMIK ??
    r.STra_GCMIK ??
    r.Stra_GcMik ??
    r.quantity ??
    1;
  const n = Number(q);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function stokTemelBilgiFromStok(Stok: Record<string, unknown>): Record<string, unknown> {
  const t = Stok.StokTemelBilgi ?? Stok.stokTemelBilgi;
  if (t != null && typeof t === 'object' && !Array.isArray(t)) return t as Record<string, unknown>;
  return {};
}

export function stokAdiFromLine(line: NetsisJson): string {
  const r = line as Record<string, unknown>;
  const Stok =
    r.Stok != null && typeof r.Stok === 'object' && !Array.isArray(r.Stok)
      ? (r.Stok as Record<string, unknown>)
      : {};
  const temel = stokTemelBilgiFromStok(Stok);
  return String(
    temel.Stok_Adi ??
      temel.STOK_ADI ??
      temel.STK_ADI ??
      temel.stok_adi ??
      Stok.STOK_ADI ??
      Stok.STK_ADI ??
      r.STOK_ADI ??
      r.STK_ADI ??
      r.Stok_Adi ??
      r.STRA_STKADI ??
      r.Stra_StkAdi ??
      ''
  ).trim();
}

/** Flatten `Stok` + `StokTemelBilgi` for reading özellik / renk fields on a line. */
function mergedStokFieldsForLine(line: Record<string, unknown>): Record<string, unknown> {
  const Stok =
    line.Stok != null && typeof line.Stok === 'object' && !Array.isArray(line.Stok)
      ? (line.Stok as Record<string, unknown>)
      : {};
  const temel = stokTemelBilgiFromStok(Stok);
  return { ...Stok, ...temel };
}

function nonEmptyVariantToken(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v === 0) return null;
    return String(v);
  }
  const s = String(v).trim();
  if (!s || s === '0') return null;
  return s;
}

/**
 * Renk / özellik / opsiyon from NetOpenX stok master (and line-level fallbacks).
 * Live curls: kalemlerde `STra_ACIK` satır notu; stok kartında `Ozellik_Kodu*`, `Opsiyon_Kodu*`, `RENK` vb.
 */
export function lineVariantOrColorNote(line: NetsisJson): string {
  const r = line as Record<string, unknown>;
  const st = mergedStokFieldsForLine(r);
  const parts: string[] = [];
  const seen = new Set<string>();
  const push = (t: string | null) => {
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    parts.push(t);
  };

  for (let i = 1; i <= 5; i++) {
    for (const base of ['Ozellik_Kodu', 'Opsiyon_Kodu', 'OZELLIK_KODU', 'OPSIYON_KODU']) {
      push(nonEmptyVariantToken(st[`${base}${i}`] ?? r[`${base}${i}`]));
    }
  }
  for (const k of [
    'RENK',
    'Renk',
    'RenkKodu',
    'RENK_KODU',
    'Renk_Aciklama',
    'RENK_ACIKLAMA',
    'Stok_Renk',
    'Kod_4',
    'Kod_5',
    'YapKod',
  ]) {
    push(nonEmptyVariantToken(st[k] ?? r[k]));
  }

  return parts.join(' · ');
}

/** NetOpenX satır açıklaması — özellikle `STra_ACIK` (Logo kalemi). */
export function satirAciklamaFromLine(line: NetsisJson): string {
  const r = line as Record<string, unknown>;
  const direct = String(
    r.ACIKLAMA ??
      r.SATIR_ACIKLAMA ??
      r.SATIRAC ??
      r.SATIR_AC ??
      r.SAT_IR_ACIK ??
      r.STRA_ACIK ??
      r.STra_ACIK ??
      r.STrA_ACIK ??
      r.Stra_Acik ??
      r.STHAR_ACIKLAMA ??
      r.Sthar_aciklama ??
      ''
  ).trim();
  if (direct) return direct;

  for (const key of Object.keys(r)) {
    if (!/(ACIK|SATIR|SATAC|RENK|NOT)/i.test(key)) continue;
    const v = r[key];
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t) continue;
    if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(t)) continue;
    return t;
  }
  return '';
}

/** Satır notu + stok renk/özellik (Description sütunu için). */
export function lineItemDescriptionFromLine(line: NetsisJson): string {
  const satir = satirAciklamaFromLine(line);
  const variant = lineVariantOrColorNote(line);
  return [satir, variant].filter(Boolean).join(' · ');
}

export function lineRowId(line: NetsisJson, index: number): string {
  const r = line as Record<string, unknown>;
  const k = r.INCKEYNO ?? r.inckeyno ?? r.STRA_INCKEY ?? r.STRA_SIRANO;
  if (k != null && String(k).trim()) return String(k).trim();
  return `netsis-line-${index}-${pickStokKoduFromLine(line) || index}`;
}

function cariTemelFromRecord(src: Record<string, unknown>): Record<string, unknown> {
  const t = src.CariTemelBilgi ?? src.cariTemelBilgi;
  if (t != null && typeof t === 'object' && !Array.isArray(t)) return t as Record<string, unknown>;
  return {};
}

export function cariNameFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const arp =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : null;
  const src = arp || d;
  const temel = cariTemelFromRecord(src);
  return String(
    src.UNVAN ??
      src.UNVAN1 ??
      src.CARI_ISIM ??
      src.CARI_UNVAN ??
      temel.UNVAN ??
      temel.CARI_ISIM ??
      temel.CARI_UNVAN ??
      ''
  ).trim();
}

export function cariKoduFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  const temel = cariTemelFromRecord(src);
  return String(
    src.CARI_KOD ?? src.CariKod ?? src.cari_kod ?? temel.CARI_KOD ?? temel.CariKod ?? ''
  ).trim();
}

export function cariPhoneFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  const temel = cariTemelFromRecord(src);
  return String(
    src.TEL ?? src.CEP_TEL ?? src.GSM ?? src.CARI_TEL ?? temel.TEL ?? temel.CEP_TEL ?? temel.GSM ?? ''
  ).trim();
}

export function cariEmailFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  const temel = cariTemelFromRecord(src);
  return String(src.email ?? src.EMAIL ?? src.eMail ?? temel.email ?? temel.EMAIL ?? '').trim();
}

export function cariAddressFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  const temel = cariTemelFromRecord(src);
  return String(
    src.ADRES ?? src.CARI_ADRES ?? temel.ADRES ?? temel.CARI_ADRES ?? ''
  ).trim();
}

export function cariRegionFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  const temel = cariTemelFromRecord(src);
  return String(
    src.SEHIR ?? src.CARI_IL ?? src.CARI_ILCE ?? temel.SEHIR ?? temel.CARI_IL ?? temel.CARI_ILCE ?? ''
  ).trim();
}

export function placedAtFromDoc(doc: NetsisJson | null | undefined): string | undefined {
  if (!doc || typeof doc !== 'object') return undefined;
  const d = doc as Record<string, unknown>;
  const v = d.TARIH ?? d.Tarih ?? d.orderDate ?? d.placed_at;
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  try {
    return new Date(v as string | number).toISOString();
  } catch {
    return undefined;
  }
}

export function statusFromDoc(doc: NetsisJson | null | undefined): string | null {
  if (!doc || typeof doc !== 'object') return null;
  const d = doc as Record<string, unknown>;
  if (d.status != null) return String(d.status);
  if (d.OrderStatus != null) return String(d.OrderStatus);
  return null;
}

export function documentCustomerSparse(doc: NetsisJson | null | undefined): boolean {
  return !cariNameFromDoc(doc) && !cariPhoneFromDoc(doc) && !cariAddressFromDoc(doc);
}

/** Map native lines to minimal rows for tables that still expect sku/name/qty. */
export function netsisLinesToDisplayRows(lines: NetsisJson[] | undefined) {
  if (!Array.isArray(lines) || !lines.length) return [];
  return lines.map((line, idx) => {
    const sku = pickStokKoduFromLine(line);
    const nm = stokAdiFromLine(line);
    const desc = lineItemDescriptionFromLine(line);
    return {
      id: lineRowId(line, idx),
      product_id: sku,
      quantity: pickLineQuantity(line),
      name: nm || sku,
      description: (desc && desc !== nm ? desc : nm) || sku,
      sku,
    };
  });
}

/** Native ARP row from `GET /integrations/netsis/customers/detail` → UI customer fields. */
export function arpRowToCustomerFields(row: NetsisJson | null | undefined) {
  if (!row || typeof row !== 'object') {
    return {
      full_name: '—',
      phone: '—',
      email: '—',
      address: '—',
      region: '—',
    };
  }
  const r = row as Record<string, unknown>;
  return {
    full_name: String(r.UNVAN ?? r.CARI_ISIM ?? r.CARI_UNVAN ?? '').trim() || '—',
    phone: String(r.TEL ?? r.CEP_TEL ?? r.GSM ?? '').trim() || '—',
    email: String(r.email ?? r.EMAIL ?? '').trim() || '—',
    address: String(r.ADRES ?? r.CARI_ADRES ?? '').trim() || '—',
    region: String(r.SEHIR ?? r.CARI_IL ?? '').trim() || '—',
  };
}
