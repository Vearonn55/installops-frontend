import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OfflineAction } from '../types';
import { apiPost } from '../api/http';
import type { UUID } from '../api/http';

interface OfflineState {
  actions: OfflineAction[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

interface OfflineActions {
  addAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retry_count' | 'status'>) => void;
  removeAction: (id: string) => void;
  updateActionStatus: (id: string, status: OfflineAction['status']) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  syncActions: () => Promise<void>;
  clearCompletedActions: () => void;
  retryFailedActions: () => Promise<void>;
}

type OfflineStore = OfflineState & OfflineActions;

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      actions: [],
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSyncTime: null,

      addAction: (actionData) => {
        const action: OfflineAction = {
          ...actionData,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          retry_count: 0,
          status: 'pending',
        };

        set((state) => ({
          actions: [...state.actions, action],
        }));

        if (get().isOnline) {
          get().syncActions();
        }
      },

      removeAction: (id) => {
        set((state) => ({
          actions: state.actions.filter((action) => action.id !== id),
        }));
      },

      updateActionStatus: (id, status) => {
        set((state) => ({
          actions: state.actions.map((action) =>
            action.id === id ? { ...action, status } : action
          ),
        }));
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        if (isOnline) {
          get().syncActions();
        }
      },

      syncActions: async () => {
        const { actions, isOnline } = get();

        if (!isOnline || actions.length === 0) {
          return;
        }

        set({ isSyncing: true });

        const pendingActions = actions.filter(
          (action) => action.status === 'pending' || action.status === 'failed'
        );

        for (const action of pendingActions) {
          try {
            set((state) => ({
              actions: state.actions.map((a) =>
                a.id === action.id ? { ...a, status: 'syncing' as const } : a
              ),
            }));

            await executeAction(action);

            set((state) => ({
              actions: state.actions.map((a) =>
                a.id === action.id ? { ...a, status: 'completed' as const } : a
              ),
            }));
          } catch (error) {
            console.error(`Failed to sync action ${action.id}:`, error);

            set((state) => ({
              actions: state.actions.map((a) =>
                a.id === action.id
                  ? {
                      ...a,
                      status: 'failed' as const,
                      retry_count: a.retry_count + 1,
                    }
                  : a
              ),
            }));
          }
        }

        set({
          isSyncing: false,
          lastSyncTime: new Date().toISOString(),
        });
      },

      clearCompletedActions: () => {
        set((state) => ({
          actions: state.actions.filter((action) => action.status !== 'completed'),
        }));
      },

      retryFailedActions: async () => {
        set((state) => ({
          actions: state.actions.map((action) =>
            action.status === 'failed' ? { ...action, status: 'pending' as const } : action
          ),
        }));

        await get().syncActions();
      },
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        actions: state.actions,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

async function executeAction(action: OfflineAction): Promise<void> {
  const { type, installation_id, payload } = action;
  const id = installation_id as UUID;

  switch (type) {
    case 'accept':
      await apiPost(`/installations/${id}/accept`);
      break;

    case 'start':
      await apiPost(`/installations/${id}/start`, payload);
      break;

    case 'checklist':
      await apiPost(`/installations/${id}/checklist`, { responses: payload.responses });
      break;

    case 'media':
      await apiPost(`/installations/${id}/media/complete`, payload);
      break;

    case 'finish':
      await apiPost(`/installations/${id}/finish`);
      break;

    case 'fail':
      await apiPost(`/installations/${id}/fail`, payload);
      break;

    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false);
  });
}
