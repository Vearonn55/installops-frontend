import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/query-client';
import { toast } from 'react-hot-toast';

// Auth hooks
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => apiClient.getCurrentUser().then(res => res.data),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login({ email, password }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.currentUser, data.data.user);
      toast.success('Login successful');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Login failed');
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.clear();
      toast.success('Logged out successfully');
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      // Clear cache anyway
      queryClient.clear();
    },
  });
}

// Users hooks
export function useUsers(params?: { role?: string; store_id?: string }) {
  return useQuery({
    queryKey: [...queryKeys.users, params],
    queryFn: () => apiClient.getUsers(params).then(res => res.data),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: any) => apiClient.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      toast.success('User created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateUser(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(variables.id) });
      toast.success('User updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
}

// Stores hooks
export function useStores() {
  return useQuery({
    queryKey: queryKeys.stores,
    queryFn: () => apiClient.getStores().then(res => res.data),
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (storeData: any) => apiClient.createStore(storeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
      toast.success('Store created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create store');
    },
  });
}

// Customers hooks
export function useCustomers(params?: { q?: string }) {
  return useQuery({
    queryKey: [...queryKeys.customers, params],
    queryFn: () => apiClient.getCustomers(params).then(res => res.data),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => apiClient.getCustomer(id).then(res => res.data),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (customerData: any) => apiClient.createCustomer(customerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
      toast.success('Customer created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create customer');
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateCustomer(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
      queryClient.invalidateQueries({ queryKey: queryKeys.customer(variables.id) });
      toast.success('Customer updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update customer');
    },
  });
}

// Products hooks
export function useProducts(params?: { sku?: string; q?: string }) {
  return useQuery({
    queryKey: [...queryKeys.products, params],
    queryFn: () => apiClient.getProducts(params).then(res => res.data),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productData: any) => apiClient.createProduct(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

// Inventory hooks
export function useInventory(params?: { warehouse?: string; sku?: string }) {
  return useQuery({
    queryKey: [...queryKeys.inventory, params],
    queryFn: () => apiClient.getInventory(params).then(res => res.data),
  });
}

export function useAllocateInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { order_id: string; items: Array<{ product_id: string; qty: number }> }) => 
      apiClient.allocateInventory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
      toast.success('Inventory allocated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to allocate inventory');
    },
  });
}

export function useReleaseInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { order_id: string; items: Array<{ product_id: string; qty: number }> }) => 
      apiClient.releaseInventory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
      toast.success('Inventory released successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to release inventory');
    },
  });
}

// Orders hooks
export function useOrders(params?: { store_id?: string; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.orders, params],
    queryFn: () => apiClient.getOrders(params).then(res => res.data),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => apiClient.getOrder(id).then(res => res.data),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderData: any) => apiClient.createOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      toast.success('Order created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order');
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateOrder(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(variables.id) });
      toast.success('Order updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update order');
    },
  });
}

// Installations hooks
export function useInstallations(params?: { 
  store_id?: string; 
  status?: string; 
  from?: string; 
  to?: string; 
}) {
  return useQuery({
    queryKey: [...queryKeys.installations, params],
    queryFn: () => apiClient.getInstallations(params).then(res => res.data),
  });
}

export function useInstallation(id: string) {
  return useQuery({
    queryKey: queryKeys.installation(id),
    queryFn: () => apiClient.getInstallation(id).then(res => res.data),
    enabled: !!id,
  });
}

export function useCreateInstallation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (installationData: any) => apiClient.createInstallation(installationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installations });
      toast.success('Installation created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create installation');
    },
  });
}

export function useUpdateInstallation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateInstallation(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installations });
      queryClient.invalidateQueries({ queryKey: queryKeys.installation(variables.id) });
      toast.success('Installation updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update installation');
    },
  });
}

export function useAssignCrew() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, crewUserIds }: { id: string; crewUserIds: string[] }) => 
      apiClient.assignCrew(id, crewUserIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installations });
      queryClient.invalidateQueries({ queryKey: queryKeys.installation(variables.id) });
      toast.success('Crew assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign crew');
    },
  });
}

export function useAcceptInstallation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.acceptInstallation(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installations });
      queryClient.invalidateQueries({ queryKey: queryKeys.installation(variables) });
      toast.success('Installation accepted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept installation');
    },
  });
}

export function useStartInstallation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: any }) => 
      apiClient.startInstallation(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installations });
      queryClient.invalidateQueries({ queryKey: queryKeys.installation(variables.id) });
      toast.success('Installation started');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start installation');
    },
  });
}

export function useFinishInstallation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.finishInstallation(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installations });
      queryClient.invalidateQueries({ queryKey: queryKeys.installation(variables) });
      toast.success('Installation completed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to complete installation');
    },
  });
}

export function useFailInstallation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason_code: string; notes?: string } }) => 
      apiClient.failInstallation(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installations });
      queryClient.invalidateQueries({ queryKey: queryKeys.installation(variables.id) });
      toast.success('Installation marked as failed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark installation as failed');
    },
  });
}

// Calendar hooks
export function useCalendarSlots(storeId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.calendarSlots(storeId, date),
    queryFn: () => apiClient.getCalendarSlots({ store_id: storeId, date }).then(res => res.data),
    enabled: !!storeId && !!date,
  });
}

export function useHoldSlot() {
  return useMutation({
    mutationFn: (data: any) => apiClient.holdSlot(data),
    onError: (error: any) => {
      toast.error(error.message || 'Failed to hold slot');
    },
  });
}

export function useConfirmSlot() {
  return useMutation({
    mutationFn: (data: any) => apiClient.confirmSlot(data),
    onError: (error: any) => {
      toast.error(error.message || 'Failed to confirm slot');
    },
  });
}

// Checklist hooks
export function useChecklistTemplates() {
  return useQuery({
    queryKey: queryKeys.checklistTemplates,
    queryFn: () => apiClient.getChecklistTemplates().then(res => res.data),
  });
}

export function useInstallationChecklist(id: string) {
  return useQuery({
    queryKey: queryKeys.installationChecklist(id),
    queryFn: () => apiClient.getInstallationChecklist(id).then(res => res.data),
    enabled: !!id,
  });
}

export function useSubmitChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, responses }: { id: string; responses: any[] }) => 
      apiClient.submitChecklist(id, responses),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installationChecklist(variables.id) });
      toast.success('Checklist submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit checklist');
    },
  });
}

// Media hooks
export function useInstallationMedia(id: string) {
  return useQuery({
    queryKey: queryKeys.installationMedia(id),
    queryFn: () => apiClient.getInstallationMedia(id).then(res => res.data),
    enabled: !!id,
  });
}

export function usePresignedUrls() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { count: number; names: string[]; types: string[] } }) => 
      apiClient.getPresignedUrls(id, data),
    onError: (error: any) => {
      toast.error(error.message || 'Failed to get presigned URLs');
    },
  });
}

export function useCompleteMediaUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { files: Array<{ name: string; url: string; sha256: string; tags: any }> } }) => 
      apiClient.completeMediaUpload(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.installationMedia(variables.id) });
      toast.success('Media uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload media');
    },
  });
}

// Pick Lists hooks
export function usePickLists(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.pickLists, params],
    queryFn: () => apiClient.getPickLists(params).then(res => res.data),
  });
}

export function useCreatePickList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.createPickList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pickLists });
      toast.success('Pick list created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create pick list');
    },
  });
}

export function useUpdatePickList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updatePickList(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pickLists });
      queryClient.invalidateQueries({ queryKey: queryKeys.pickList(variables.id) });
      toast.success('Pick list updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update pick list');
    },
  });
}

// Reports hooks
export function useKPIs(params?: { from?: string; to?: string; store_id?: string }) {
  return useQuery({
    queryKey: [...queryKeys.kpis, params],
    queryFn: () => apiClient.getKPIs(params).then(res => res.data),
  });
}

export function useSLAReport() {
  return useQuery({
    queryKey: queryKeys.slaReport,
    queryFn: () => apiClient.getSLAReport().then(res => res.data),
  });
}

export function useFailureReport() {
  return useQuery({
    queryKey: queryKeys.failureReport,
    queryFn: () => apiClient.getFailureReport().then(res => res.data),
  });
}

// Audit hooks
export function useAuditLogs(params?: { 
  actor?: string; 
  entity?: string; 
  from?: string; 
  to?: string; 
}) {
  return useQuery({
    queryKey: [...queryKeys.auditLogs, params],
    queryFn: () => apiClient.getAuditLogs(params).then(res => res.data),
  });
}

// Webhooks hooks
export function useWebhooks() {
  return useQuery({
    queryKey: queryKeys.webhooks,
    queryFn: () => apiClient.getWebhooks().then(res => res.data),
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.createWebhook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
      toast.success('Webhook created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create webhook');
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks });
      toast.success('Webhook deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete webhook');
    },
  });
}

export function useWebhookEvents(params?: { status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.webhookEvents, params],
    queryFn: () => apiClient.getWebhookEvents(params).then(res => res.data),
  });
}
