export type Role = "STAFF" | "MANAGER" | "OWNER";
export type OrderStatus =
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";
export type User = { id: string; username: string; name: string; phone?: string; role: Role };
export type UserAccount = { id: string; username: string; phone?: string; name: string; role: Role; active: boolean; createdAt: string };
export type ZaloStatus = 'DISCONNECTED' | 'WAITING_QR' | 'SCANNED' | 'CONNECTED' | 'EXPIRED' | 'ERROR';
export type ZaloConnection = { status: ZaloStatus; qrImage?: string; account?: { uid?: string; displayName: string; avatar?: string }; error?: string };
export type Customer = {
  id: string;
  phone: string;
  name?: string;
  address?: string;
  note?: string;
  laundryPreference?: string;
  marketingOptIn: boolean;
  totalOrders: number;
  totalPoints: number;
  totalKg: string;
  totalSpent: string;
  firstOrderAt?: string;
  lastOrderAt?: string;
};
export type CustomerDetail = Customer & {
  orders: Array<{
    id: string;
    code: string;
    status: OrderStatus;
    total?: string;
    createdAt: string;
    items: Array<{ serviceName: string; quantity: string; unit: string }>;
    payments: Array<{ method: string; amount: string }>;
  }>;
  loyalty: Array<{
    id: string;
    points: number;
    type: string;
    orderId?: string;
    createdAt: string;
  }>;
};
export type Service = {
  id: string;
  name: string;
  stt: number;
  isDefault: boolean;
  unit: "KG" | "ITEM" | "PAIR";
  price: string;
  active: boolean;
};
export type Expense = {
  id: string;
  amount: string;
  category: string;
  description: string;
  expenseDate: string;
  paymentMethod: "CASH" | "BANK_TRANSFER";
  receiptUrl?: string;
  voidedAt?: string;
  voidReason?: string;
  createdBy: { id: string; name: string };
  voidedBy?: { id: string; name: string };
};
export type Shift = {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: { id: string; name: string };
  closedBy?: { id: string; name: string };
  cashRevenue?: string;
  bankTransferRevenue?: string;
  cashExpenses?: string;
  bankTransferExpenses?: string;
  systemCash?: string;
  actualCash?: string;
  difference?: string;
};
export type DashboardDailyPoint = {
  date: string;
  revenue: string;
  expenses: string;
  estimatedProfit: string;
  orders: number;
  kg: string;
};

export type DashboardPrevious = {
  revenue: string;
  expenses: string;
  estimatedProfit: string;
  orders: number;
};

export type Dashboard = {
  revenue: string;
  expenses: string;
  estimatedProfit: string;
  orders: number;
  kg: string;
  processing: number;
  ready: number;
  cash: string;
  bankTransfer: string;
  unpaid: string;
  newCustomers: number;
  returningCustomers: number;
  daily: DashboardDailyPoint[];
  previous: DashboardPrevious;
};
export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
  user: User;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
export const EXPENSE_CATEGORIES = [
  "Sửa chữa",
  "Nước giặt / nước xả",
  "Hóa chất",
  "Túi / bao bì",
  "Giấy bill",
  "Điện",
  "Nước",
  "Tiền nhà",
  "Lương",
  "Ship",
  "Marketing",
  "Đồ dùng cửa hàng",
  "Khác",
];

export type ReceivedService = { serviceId: string; serviceName: string };

export type Order = {
  id: string;
  code: string;
  status: OrderStatus;
  note?: string;
  customerUnknown: boolean;
  customer?: Customer;
  dueDate?: string;
  duePeriod?: "MORNING" | "AFTERNOON";
  deliveryAddress?: string;
  receivedServices: ReceivedService[];
  createdAt: string;
  updatedAt: string;
  readyAt?: string;
  completedAt?: string;
  weight?: string;
  subtotal?: string;
  discount?: string;
  total?: string;
  createdBy: { name: string };
  items: Array<{
    id: string;
    serviceId: string;
    serviceName: string;
    unit: string;
    quantity: string;
    baseUnitPrice: string;
    unitPrice: string;
    lineTotal: string;
    priceAdjustmentReason?: string;
  }>;
  payments: Array<{ id: string; method: string; amount: string }>;
  notifications: Array<{ id: string; status: string; error?: string }>;
  printJobs: Array<{
    id: string;
    status: "PENDING" | "PRINTING" | "PRINTED" | "FAILED";
    attempts: number;
    lastError?: string;
    createdAt: string;
    printedAt?: string;
    failedAt?: string;
  }>;
  pointsToEarn?: number;
};
