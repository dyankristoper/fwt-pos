import { useState, useCallback, useMemo } from 'react';
import { CompletedOrder, OrderItem, PaymentMethod, DailySummaryData, DiscountRecord, VoidRefundRecord } from './types';

let orderCounter = 1;

export function useDailySummary() {
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRecord[]>([]);
  const [voidRefunds, setVoidRefunds] = useState<VoidRefundRecord[]>([]);

  const completeOrder = useCallback((
    items: OrderItem[],
    total: number,
    paymentMethod: PaymentMethod,
    orderSlipNumber?: string
  ) => {
    const id = `ORD-${String(orderCounter++).padStart(4, '0')}`;
    const newOrder: CompletedOrder = {
      id,
      orderSlipNumber: orderSlipNumber || id,
      items: [...items],
      total,
      paymentMethod,
      timestamp: new Date(),
    };
    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  }, []);

  const addDiscount = useCallback((record: DiscountRecord) => {
    setDiscounts(prev => [...prev, record]);
  }, []);

  const addVoidRefund = useCallback((record: VoidRefundRecord) => {
    setVoidRefunds(prev => [...prev, record]);
  }, []);

  const summary: DailySummaryData = useMemo(() => {
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const cashSales = orders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
    const debitSales = orders.filter(o => o.paymentMethod === 'debit').reduce((s, o) => s + o.total, 0);
    const creditSales = orders.filter(o => o.paymentMethod === 'credit').reduce((s, o) => s + o.total, 0);
    const ewalletSales = orders.filter(o => o.paymentMethod === 'ewallet').reduce((s, o) => s + o.total, 0);
    return { totalOrders, totalSales, cashSales, debitSales, creditSales, ewalletSales, orders, discounts, voidRefunds };
  }, [orders, discounts, voidRefunds]);

  return { summary, completeOrder, addDiscount, addVoidRefund };
}
