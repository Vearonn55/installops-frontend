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

export function stokAdiFromLine(line: NetsisJson): string {
  const r = line as Record<string, unknown>;
  const Stok =
    r.Stok != null && typeof r.Stok === 'object' && !Array.isArray(r.Stok)
      ? (r.Stok as Record<string, unknown>)
      : {};
  return String(
    Stok.STOK_ADI ??
      Stok.STK_ADI ??
      r.STOK_ADI ??
      r.STK_ADI ??
      r.STRA_STKADI ??
      r.Stra_StkAdi ??
      ''
  ).trim();
}

export function satirAciklamaFromLine(line: NetsisJson): string {
  const r = line as Record<string, unknown>;
  return String(r.ACIKLAMA ?? r.SATIR_ACIKLAMA ?? r.STRA_ACIK ?? r.Stra_Acik ?? '').trim();
}

export function lineRowId(line: NetsisJson, index: number): string {
  const r = line as Record<string, unknown>;
  const k = r.INCKEYNO ?? r.inckeyno ?? r.STRA_INCKEY ?? r.STRA_SIRANO;
  if (k != null && String(k).trim()) return String(k).trim();
  return `netsis-line-${index}-${pickStokKoduFromLine(line) || index}`;
}

export function cariNameFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const arp =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : null;
  const src = arp || d;
  return String(src.UNVAN ?? src.UNVAN1 ?? src.CARI_ISIM ?? src.CARI_UNVAN ?? '').trim();
}

export function cariKoduFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  return String(src.CARI_KOD ?? src.CariKod ?? src.cari_kod ?? '').trim();
}

export function cariPhoneFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  return String(src.TEL ?? src.CEP_TEL ?? src.GSM ?? src.CARI_TEL ?? '').trim();
}

export function cariEmailFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  return String(src.email ?? src.EMAIL ?? src.eMail ?? '').trim();
}

export function cariAddressFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  return String(src.ADRES ?? src.CARI_ADRES ?? '').trim();
}

export function cariRegionFromDoc(doc: NetsisJson | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const d = doc as Record<string, unknown>;
  const src =
    d.ARP != null && typeof d.ARP === 'object' && !Array.isArray(d.ARP)
      ? (d.ARP as Record<string, unknown>)
      : d;
  return String(src.SEHIR ?? src.CARI_IL ?? src.CARI_ILCE ?? '').trim();
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
  if (!lines?.length) return [];
  return lines.map((line, idx) => {
    const sku = pickStokKoduFromLine(line);
    const nm = stokAdiFromLine(line);
    const desc = satirAciklamaFromLine(line);
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
