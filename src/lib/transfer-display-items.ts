import type { NetsisTransferLineView } from '../api/integrations';
import type { TransferItem } from '../api/transfers';
import type { UUID } from '../api/http';

export type TransferDisplayItem = TransferItem & {
  sku: string;
  name: string | null;
  description: string | null;
};

export function mergeTransferDisplayItems(
  localItems: TransferItem[],
  netsisLines: NetsisTransferLineView[]
): TransferDisplayItem[] {
  const bySku = new Map(
    netsisLines.map((line) => {
      const sku = String(line.sku ?? line.external_product_id ?? '').trim();
      return [
        sku,
        {
          sku,
          name: line.name?.trim() ? line.name : null,
          description: line.description ?? line.special_instructions ?? null,
        },
      ];
    })
  );

  if (!localItems.length) {
    return netsisLines.map((line, idx) => {
      const sku = String(line.sku ?? line.external_product_id ?? '').trim();
      const name = line.name?.trim() ? line.name : null;
      return {
        id: `netsis-${sku}-${idx}` as UUID,
        transfer_id: '' as UUID,
        external_product_id: sku,
        quantity: line.quantity,
        room_tag: null,
        special_instructions: line.special_instructions ?? line.description ?? null,
        created_at: '',
        updated_at: '',
        sku,
        name,
        description: line.description ?? line.special_instructions ?? null,
      };
    });
  }

  return localItems.map((row) => {
    const pid = String(row.external_product_id ?? '').trim();
    const n = bySku.get(pid);
    if (n) {
      return {
        ...row,
        sku: n.sku,
        name: n.name,
        description: n.description,
      };
    }
    return {
      ...row,
      sku: pid,
      name: null,
      description: row.special_instructions ?? null,
    };
  });
}
