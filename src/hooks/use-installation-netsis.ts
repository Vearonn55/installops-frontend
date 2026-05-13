import { useQuery } from '@tanstack/react-query';
import type { UUID } from '../api/http';
import type { Installation } from '../api/installations';
import {
  getNetsisCustomerDetail,
  getNetsisOrderDetail,
  searchNetsisOrders,
  type NetsisOrderDetailData,
} from '../api/integrations';
import {
  arpRowToCustomerFields,
  cariKoduFromDoc,
  documentCustomerSparse,
} from '../lib/netsis-native';

export type InstallationNetsisBundle = {
  order: NetsisOrderDetailData | null;
  customerFromArp: ReturnType<typeof arpRowToCustomerFields> | null;
  isLoading: boolean;
  isError: boolean;
};

export function useInstallationNetsis(
  inst: Installation | null | undefined
): InstallationNetsisBundle {
  const storeId = inst?.store_id;
  const orderId = inst?.external_order_id?.trim();

  const orderQuery = useQuery({
    queryKey: ['installation-netsis-order', storeId, orderId],
    enabled: Boolean(storeId && orderId),
    queryFn: async () => {
      const res = await getNetsisOrderDetail({
        store_id: storeId as UUID,
        order_id: orderId as string,
      });
      return res.data ?? null;
    },
    retry: false,
  });

  const searchHitQuery = useQuery({
    queryKey: ['installation-netsis-search-hit', storeId, orderId],
    enabled:
      Boolean(storeId && orderId) &&
      Boolean(!orderQuery.data || documentCustomerSparse(orderQuery.data.document)),
    queryFn: async () => {
      const res = await searchNetsisOrders({
        store_id: storeId as UUID,
        q: orderId as string,
        limit: 5,
      });
      const rows = res.data ?? [];
      const exact = rows.find(
        (r) => String(r.order_id || '').trim() === String(orderId || '').trim()
      );
      return exact ?? rows[0] ?? null;
    },
    retry: false,
  });

  const cariKod = String(
    cariKoduFromDoc(orderQuery.data?.document) ||
      searchHitQuery.data?.cari_kod ||
      ''
  ).trim();

  const customerQuery = useQuery({
    queryKey: ['installation-netsis-customer', storeId, cariKod],
    enabled:
      Boolean(storeId && cariKod) &&
      Boolean(!orderQuery.data || documentCustomerSparse(orderQuery.data.document)),
    queryFn: async () => {
      const res = await getNetsisCustomerDetail({
        store_id: storeId as UUID,
        cari_kod: cariKod,
      });
      return arpRowToCustomerFields(res.data);
    },
    retry: false,
  });

  return {
    order: orderQuery.data ?? null,
    customerFromArp: customerQuery.data ?? null,
    isLoading:
      orderQuery.isLoading ||
      searchHitQuery.isLoading ||
      customerQuery.isLoading,
    isError: orderQuery.isError,
  };
}
