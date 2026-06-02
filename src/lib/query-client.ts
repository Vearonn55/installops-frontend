import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from '../api/http';

function isAuthHttpError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: unknown) => {
        if (isAuthHttpError(error)) return false;
        if (isAxiosError(error)) {
          const status = error.response?.status;
          // Netsis/upstream failures: retries multiply ERP load and show as duplicate searches.
          if (status === 429 || status === 502 || status === 504) return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        if (isAuthHttpError(error)) return false;
        return failureCount < 2;
      },
    },
  },
});

export const queryKeys = {
  currentUser: ['auth', 'currentUser'] as const,
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  usersByRole: (role: string) => ['users', 'role', role] as const,
  usersByStore: (storeId: string) => ['users', 'store', storeId] as const,
  stores: ['stores'] as const,
  store: (id: string) => ['stores', id] as const,
  customers: ['customers'] as const,
  customer: (id: string) => ['customers', id] as const,
  customersSearch: (query: string) => ['customers', 'search', query] as const,
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  productsSearch: (query: string) => ['products', 'search', query] as const,
  inventory: ['inventory'] as const,
  inventoryByWarehouse: (warehouse: string) => ['inventory', 'warehouse', warehouse] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  ordersByStore: (storeId: string) => ['orders', 'store', storeId] as const,
  ordersByStatus: (status: string) => ['orders', 'status', status] as const,
  installations: ['installations'] as const,
  installation: (id: string) => ['installations', id] as const,
  installationsByStore: (storeId: string) => ['installations', 'store', storeId] as const,
  installationsByStatus: (status: string) => ['installations', 'status', status] as const,
  installationsByDateRange: (from: string, to: string) =>
    ['installations', 'dateRange', from, to] as const,
  calendarSlots: (storeId: string, date: string) => ['calendar', 'slots', storeId, date] as const,
  checklistTemplates: ['checklists', 'templates'] as const,
  checklistTemplate: (id: string) => ['checklists', 'templates', id] as const,
  installationChecklist: (id: string) => ['installations', id, 'checklist'] as const,
  installationMedia: (id: string) => ['installations', id, 'media'] as const,
  pickLists: ['picklists'] as const,
  pickList: (id: string) => ['picklists', id] as const,
  pickListsByStatus: (status: string) => ['picklists', 'status', status] as const,
  kpis: ['reports', 'kpis'] as const,
  slaReport: ['reports', 'sla'] as const,
  failureReport: ['reports', 'failures'] as const,
  auditLogs: ['audit'] as const,
  auditLogsByActor: (actor: string) => ['audit', 'actor', actor] as const,
  auditLogsByEntity: (entity: string) => ['audit', 'entity', entity] as const,
  webhooks: ['webhooks'] as const,
  webhook: (id: string) => ['webhooks', id] as const,
  webhookEvents: ['webhook-events'] as const,
  webhookEventsByStatus: (status: string) => ['webhook-events', 'status', status] as const,
  netsisOrders: (storeId: string, q: string, offset: number) =>
    ['netsis-orders', storeId, q, offset] as const,
  /** Infinite-query list on Orders page (offset lives in pageParam, not the key). */
  netsisOrdersList: (storeId: string, q: string) =>
    ['netsis-orders', 'list', storeId, q] as const,
};
