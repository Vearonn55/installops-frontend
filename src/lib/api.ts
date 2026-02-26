import type { ApiResponse, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.title || 'An error occurred'
        );
      }

      return data;
    } catch (error) {
      throw new Error(
        'Failed to connect to server'
      );
    }
  }

  // Auth endpoints
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ access_token: string; refresh_token: string; user: User }>> {
    const response = await this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
    }
    
    return response;
  }

  async refreshToken(): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.data.access_token) {
      this.setToken(response.data.access_token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
      localStorage.removeItem('refresh_token');
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/users/me');
  }

  // Users endpoints
  async getUsers(params?: { role?: string; store_id?: string }): Promise<ApiResponse<User[]>> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.store_id) searchParams.append('store_id', params.store_id);
    
    const query = searchParams.toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  // Stores endpoints
  async getStores(): Promise<ApiResponse<any[]>> {
    return this.request('/stores');
  }

  async createStore(storeData: any): Promise<ApiResponse<any>> {
    return this.request('/stores', {
      method: 'POST',
      body: JSON.stringify(storeData),
    });
  }

  // Customers endpoints
  async getCustomers(params?: { q?: string }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.append('q', params.q);
    
    const query = searchParams.toString();
    return this.request(`/customers${query ? `?${query}` : ''}`);
  }

  async getCustomer(id: string): Promise<ApiResponse<any>> {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(customerData: any): Promise<ApiResponse<any>> {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id: string, customerData: any): Promise<ApiResponse<any>> {
    return this.request(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(customerData),
    });
  }

  // Products endpoints
  async getProducts(params?: { sku?: string; q?: string }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.sku) searchParams.append('sku', params.sku);
    if (params?.q) searchParams.append('q', params.q);
    
    const query = searchParams.toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  }

  async createProduct(productData: any): Promise<ApiResponse<any>> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  // Inventory endpoints
  async getInventory(params?: { warehouse?: string; sku?: string }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.warehouse) searchParams.append('warehouse', params.warehouse);
    if (params?.sku) searchParams.append('sku', params.sku);
    
    const query = searchParams.toString();
    return this.request(`/inventory${query ? `?${query}` : ''}`);
  }

  async allocateInventory(data: { order_id: string; items: Array<{ product_id: string; qty: number }> }): Promise<ApiResponse<any>> {
    return this.request('/inventory/allocate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async releaseInventory(data: { order_id: string; items: Array<{ product_id: string; qty: number }> }): Promise<ApiResponse<any>> {
    return this.request('/inventory/release', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Orders endpoints
  async getOrders(params?: { store_id?: string; status?: string }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.store_id) searchParams.append('store_id', params.store_id);
    if (params?.status) searchParams.append('status', params.status);
    
    const query = searchParams.toString();
    return this.request(`/orders${query ? `?${query}` : ''}`);
  }

  async getOrder(id: string): Promise<ApiResponse<any>> {
    return this.request(`/orders/${id}`);
  }

  async createOrder(orderData: any): Promise<ApiResponse<any>> {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrder(id: string, orderData: any): Promise<ApiResponse<any>> {
    return this.request(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(orderData),
    });
  }

  // Installations endpoints
  async getInstallations(params?: { 
    store_id?: string; 
    status?: string; 
    from?: string; 
    to?: string; 
  }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.store_id) searchParams.append('store_id', params.store_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    
    const query = searchParams.toString();
    return this.request(`/installations${query ? `?${query}` : ''}`);
  }

  async getInstallation(id: string): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}`);
  }

  async createInstallation(installationData: any): Promise<ApiResponse<any>> {
    return this.request('/installations', {
      method: 'POST',
      body: JSON.stringify(installationData),
    });
  }

  async updateInstallation(id: string, installationData: any): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(installationData),
    });
  }

  async assignCrew(id: string, crewUserIds: string[]): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ crew_user_ids: crewUserIds }),
    });
  }

  async acceptInstallation(id: string): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/accept`, {
      method: 'POST',
    });
  }

  async startInstallation(id: string, data?: { timestamp?: string; geostamp?: any }): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async finishInstallation(id: string): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/finish`, {
      method: 'POST',
    });
  }

  async failInstallation(id: string, data: { reason_code: string; notes?: string }): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Calendar endpoints
  async getCalendarSlots(params: { store_id: string; date: string }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    searchParams.append('store_id', params.store_id);
    searchParams.append('date', params.date);
    
    return this.request(`/calendar/slots?${searchParams.toString()}`);
  }

  async holdSlot(data: any): Promise<ApiResponse<any>> {
    return this.request('/calendar/slots/hold', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmSlot(data: any): Promise<ApiResponse<any>> {
    return this.request('/calendar/slots/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Checklist endpoints
  async getChecklistTemplates(): Promise<ApiResponse<any[]>> {
    return this.request('/checklists/templates');
  }

  async getInstallationChecklist(id: string): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/checklist`);
  }

  async submitChecklist(id: string, responses: any[]): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  }

  // Media endpoints
  async getPresignedUrls(id: string, data: { count: number; names: string[]; types: string[] }): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/media/presign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeMediaUpload(id: string, data: { files: Array<{ name: string; url: string; sha256: string; tags: any }> }): Promise<ApiResponse<any>> {
    return this.request(`/installations/${id}/media/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInstallationMedia(id: string): Promise<ApiResponse<any[]>> {
    return this.request(`/installations/${id}/media`);
  }

  // Pick lists endpoints
  async getPickLists(params?: { status?: string }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    
    const query = searchParams.toString();
    return this.request(`/picklists${query ? `?${query}` : ''}`);
  }

  async createPickList(data: any): Promise<ApiResponse<any>> {
    return this.request('/picklists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePickList(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request(`/picklists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Reports endpoints
  async getKPIs(params?: { from?: string; to?: string; store_id?: string }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    if (params?.store_id) searchParams.append('store_id', params.store_id);
    
    const query = searchParams.toString();
    return this.request(`/reports/kpis${query ? `?${query}` : ''}`);
  }

  async getSLAReport(): Promise<ApiResponse<any>> {
    return this.request('/reports/sla');
  }

  async getFailureReport(): Promise<ApiResponse<any>> {
    return this.request('/reports/failures');
  }

  // Audit endpoints
  async getAuditLogs(params?: { 
    actor?: string; 
    entity?: string; 
    from?: string; 
    to?: string; 
  }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.actor) searchParams.append('actor', params.actor);
    if (params?.entity) searchParams.append('entity', params.entity);
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);
    
    const query = searchParams.toString();
    return this.request(`/audit${query ? `?${query}` : ''}`);
  }

  // Webhooks endpoints
  async getWebhooks(): Promise<ApiResponse<any[]>> {
    return this.request('/webhooks');
  }

  async createWebhook(data: any): Promise<ApiResponse<any>> {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWebhook(id: string): Promise<ApiResponse<void>> {
    return this.request(`/webhooks/${id}`, {
      method: 'DELETE',
    });
  }

  async getWebhookEvents(params?: { status?: string }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    
    const query = searchParams.toString();
    return this.request(`/webhook-events${query ? `?${query}` : ''}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
