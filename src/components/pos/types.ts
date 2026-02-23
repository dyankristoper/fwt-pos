export interface MenuItem {
  id: string;
  sku_id: string;
  name: string;
  price: number;
  category: MenuCategory;
  spicy?: boolean;
  kcal?: number | null;
  grossMarginPercent?: number | null;
}

export type MenuCategory = 'sandwiches' | 'chicken' | 'sides' | 'addons' | 'beverages';

export interface OrderItem {
  instanceId: string;
  menuItem: MenuItem;
  quantity: number;
  isCombo: boolean;
  comboDrink?: MenuItem;
  addOns: MenuItem[];
}

export interface CompletedOrder {
  id: string;
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
