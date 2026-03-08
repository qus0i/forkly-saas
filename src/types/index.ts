// ═══════════════ USER & AUTH TYPES ═══════════════

export type UserRole =
  | "system_admin"
  | "restaurant_admin"
  | "kitchen_manager"
  | "branch_manager"
  | "hr_manager"
  | "employee";

export interface Profile {
  id: string;
  tenant_id: string | null;
  email: string;
  full_name: string;
  full_name_ar: string | null;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
  avatar_url: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════ TENANT TYPES ═══════════════

export interface Tenant {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════ BRANCH TYPES ═══════════════

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  auto_checkout_hours: number;
  created_at: string;
}

// ═══════════════ SUPPLY CHAIN TYPES ═══════════════

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  name_ar: string | null;
  sku: string | null;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export type OrderStatus =
  | "new"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  tenant_id: string;
  order_number: string;
  branch_id: string;
  created_by: string;
  status: OrderStatus;
  notes: string | null;
  required_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  branch?: Branch;
  creator?: Profile;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string | null;
  item_name: string;
  item_name_ar: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
}

// ═══════════════ HR TYPES ═══════════════

export interface AttendanceLog {
  id: string;
  tenant_id: string;
  employee_id: string;
  branch_id: string;
  check_in: string;
  check_out: string | null;
  is_auto_checkout: boolean;
  created_at: string;
  // Joined
  employee?: Profile;
  branch?: Branch;
}

export interface EmployeePayroll {
  id: string;
  employee_id: string;
  tenant_id: string;
  base_salary: number;
  base_hours: number;
  overtime_rate: number;
  created_at: string;
  updated_at: string;
}

export type AdjustmentType = "holiday_hours" | "deduction" | "bonus";

export interface PayrollAdjustment {
  id: string;
  employee_id: string;
  tenant_id: string;
  type: AdjustmentType;
  amount: number;
  description: string | null;
  month: string;
  created_by: string | null;
  created_at: string;
}

export interface BranchQRCode {
  id: string;
  branch_id: string;
  tenant_id: string;
  qr_token: string;
  is_active: boolean;
  created_at: string;
}

// ═══════════════ UI TYPES ═══════════════

export type Locale = "en" | "ar";

export interface NavItem {
  title: string;
  titleAr: string;
  href: string;
  icon: string;
  roles: UserRole[];
}
