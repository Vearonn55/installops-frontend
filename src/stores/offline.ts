import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OfflineAction } from '../types';
import { apiClient } from '../lib/api';

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
      // State
      actions: [],
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSyncTime: null,

      // Actions
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

        // Try to sync immediately if online
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
        
        // Auto-sync when coming back online
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
        // Reset failed actions to pending for retry
        set((state) => ({
          actions: state.actions.map((action) =>
            action.status === 'failed' ? { ...action, status: 'pending' as const } : action
          ),
        }));

        // Try to sync again
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

// Execute individual offline action
async function executeAction(action: OfflineAction): Promise<void> {
  const { type, installation_id, payload } = action;

  switch (type) {
    case 'accept':
      await apiClient.acceptInstallation(installation_id);
      break;
      
    case 'start':
      await apiClient.startInstallation(installation_id, payload);
      break;
      
    case 'checklist':
      await apiClient.submitChecklist(installation_id, payload.responses);
      break;
      
    case 'media':
      await apiClient.completeMediaUpload(installation_id, payload as { files: Array<{ name: string; url: string; sha256: string; tags: any }> });
      break;
      
    case 'finish':
      await apiClient.finishInstallation(installation_id);
      break;
      
    case 'fail':
      await apiClient.failInstallation(installation_id, payload as { reason_code: string; notes?: string });
      break;
      
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false);
  });
}
