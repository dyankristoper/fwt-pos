import { useState, useCallback, useMemo } from 'react';
import { CompletedOrder, OrderItem, PaymentMethod, DailySummaryData } from './types';

let orderCounter = 1;

export function useDailySummary() {
  const [orders, setOrders] = useState<CompletedOrder[]>([]);

  const completeOrder = useCallback((
    items: OrderItem[],
    total: number,
    paymentMethod: PaymentMethod
  ) => {
    const newOrder: CompletedOrder = {
      id: `ORD-${String(orderCounter++).padStart(4, '0')}`,
      items: [...items],
      total,
      paymentMethod,
      timestamp: new Date(),
    };
    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  }, []);

  const summary: DailySummaryData = useMemo(() => {
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const cashSales = orders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
    const debitSales = orders.filter(o => o.paymentMethod === 'debit').reduce((s, o) => s + o.total, 0);
    const creditSales = orders.filter(o => o.paymentMethod === 'credit').reduce((s, o) => s + o.total, 0);
    const ewalletSales = orders.filter(o => o.paymentMethod === 'ewallet').reduce((s, o) => s + o.total, 0);
    return { totalOrders, totalSales, cashSales, debitSales, creditSales, ewalletSales, orders };
  }, [orders]);

  return { summary, completeOrder };
}
