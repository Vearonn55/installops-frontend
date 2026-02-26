// Core types for InstallOps application

export type UserRole = 'ADMIN' | 'STORE_MANAGER' | 'CREW';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  store_id?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  address_id: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address_id: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
  };
  weight: number;
  hazardous: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockItem {
  id: string;
  product_id: string;
  warehouse: string;
  quantity: number;
  reserved: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  customer_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  placed_at: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export type InstallationStatus =
  | 'pending'
  | 'staged'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'after_sale_service'
  | 'scheduled'
  | 'canceled';

export interface Installation {
  id: string;
  order_id: string;
  store_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: InstallationStatus;
  capacity_slot_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InstallationItem {
  id: string;
  installation_id: string;
  order_item_id: string;
  room_tag?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface CrewAssignment {
  id: string;
  installation_id: string;
  crew_user_id: string;
  role: string;
  accepted_at?: string;
  declined_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  version: string;
  rules: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  template_id: string;
  label: string;
  type: 'boolean' | 'text' | 'number' | 'photo';
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistResponse {
  id: string;
  installation_id: string;
  item_id: string;
  value: any;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  installation_id: string;
  url: string;
  type: 'photo' | 'signature';
  tags: Record<string, any>;
  sha256: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  kind: 'email' | 'sms' | 'push' | 'webhook';
  payload: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  attempt_count: number;
  last_attempt_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  name: string;
  target_url: string;
  secret: string;
  events: string[];
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  event: string;
  payload: Record<string, any>;
  delivered: boolean;
  signature: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  data: Record<string, any>;
  ip: string;
  ts: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}


// Form types

export interface CreateOrderForm {
  store_id: string;
  customer_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    room_tag?: string;
    notes?: string;
  }>;
  notes?: string;
}

export interface CreateInstallationForm {
  order_id: string;
  scheduled_start: string;
  scheduled_end: string;
  crew_user_ids?: string[];
  notes?: string;
  items: Array<{
    order_item_id: string;
    room_tag?: string;
    special_instructions?: string;
  }>;
}

export interface CreateCustomerForm {
  full_name: string;
  phone: string;
  email: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
}

// Dashboard types
export interface DashboardStats {
  today_installs: number;
  on_time_percentage: number;
  sla_breaches: number;
  reschedule_rate: number;
  crew_utilization: number;
}

export interface KPIMetrics {
  completion_rate: number;
  reschedule_rate: number;
  failure_reasons: Record<string, number>;
  crew_utilization: number;
  stockout_trends: Array<{
    date: string;
    count: number;
  }>;
}

// Offline queue types for Crew PWA
export interface OfflineAction {
  id: string;
  type: 'accept' | 'start' | 'checklist' | 'media' | 'finish' | 'fail';
  installation_id: string;
  payload: Record<string, any>;
  timestamp: string;
  retry_count: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}
