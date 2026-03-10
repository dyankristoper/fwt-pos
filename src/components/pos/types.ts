export interface MenuItem {
  id: string;
  sku_code: string;
  name: string;
  price: number;
  category: MenuCategory;
  spicy?: boolean;
  kcal?: number | null;
  grossMarginPercent?: number | null;
  combo_sku?: string | null;
  is_combo_eligible?: boolean;
}

export type MenuCategory = 'sandwiches' | 'chicken' | 'sides' | 'addons' | 'beverages';

export interface ItemDiscount {
  type: 'percent' | 'fixed';
  value: number;
  reason: string;
  discount_id?: string;
  discount_name?: string;
  discount_code?: string;
  id_number?: string;
  id_type?: string;
  customer_name?: string;
  promo_code_used?: string;
  approved_by?: string;
  is_vat_exempt?: boolean;
}

export interface OrderItem {
  instanceId: string;
  menuItem: MenuItem;
  quantity: number;
  isCombo: boolean;
  comboDrink?: MenuItem;
  addOns: MenuItem[];
  discount?: ItemDiscount;
  specialInstruction?: string;
}

export interface CompletedOrder {
  id: string;
  orderSlipNumber: string;
  items: OrderItem[];
  total: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
}

export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'ewallet';

export interface DiscountRecord {
  discountType: string;
  originalTotal: number;
  discountAmount: number;
  vatRemoved: number;
  finalAmount: number;
  orderId: string;
}

export interface VoidRefundRecord {
  orderId: string;
  type: 'void' | 'refund';
  amount: number;
}

export interface DailySummaryData {
  totalOrders: number;
  totalSales: number;
  cashSales: number;
  debitSales: number;
  creditSales: number;
  ewalletSales: number;
  orders: CompletedOrder[];
  discounts: DiscountRecord[];
  voidRefunds: VoidRefundRecord[];
}

export interface SlipRecord {
  id?: string;
  slipNumber: string;
  saleId?: string;
  branchId: string;
  deviceId: string;
  cashierName: string;
  total: number;
  status: 'ACTIVE' | 'VOID';
  voidReason?: string;
  voidNote?: string;
  voidBy?: string;
  voidTimestamp?: string;
  createdAt?: string;
}

export interface ReprintRecord {
  slipNumber: string;
  reason: string;
  note?: string;
  supervisor: string;
}
