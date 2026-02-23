import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OrderItem } from './types';
import { calculateItemTotal } from './useOrderState';
import { toast } from 'sonner';

export interface DeductionItem {
  sku_code: string;
  quantity: number;
}

export interface StockCheckResult {
  sku_code: string;
  available_stock: number;
  sufficient: boolean;
}

export interface InventoryDeductRequest {
  transaction_id: string;
  order_id: string;
  location_id: string;
  actual_date: string;
  items: DeductionItem[];
  user_id: string;
  timestamp: string;
}

type DeductStatus = 'idle' | 'checking' | 'deducting' | 'success' | 'failed' | 'offline';

const LOCATION_ID = 'DEFAULT'; // TODO: make configurable per branch

function generateTransactionId(): string {
  return crypto.randomUUID();
}

function buildDeductionItems(orderItems: OrderItem[]): DeductionItem[] {
  const skuMap = new Map<string, number>();

  for (const item of orderItems) {
    if (item.isCombo) {
      // Use dedicated combo SKU from DB instead of hardcoded map
      const comboSku = item.menuItem.combo_sku;
      if (comboSku) {
        skuMap.set(comboSku, (skuMap.get(comboSku) || 0) + item.quantity);
      } else {
        // Fallback: deduct sandwich + drink individually if no combo SKU mapping
        const skuCode = item.menuItem.sku_code;
        if (skuCode) skuMap.set(skuCode, (skuMap.get(skuCode) || 0) + item.quantity);
        if (item.comboDrink?.sku_code) {
          skuMap.set(item.comboDrink.sku_code, (skuMap.get(item.comboDrink.sku_code) || 0) + item.quantity);
        }
      }
    } else {
      const skuCode = item.menuItem.sku_code;
      if (skuCode) skuMap.set(skuCode, (skuMap.get(skuCode) || 0) + item.quantity);
    }

    // Add-ons always deducted individually
    for (const addon of item.addOns) {
      if (addon.sku_code) {
        skuMap.set(addon.sku_code, (skuMap.get(addon.sku_code) || 0) + item.quantity);
      }
    }
  }

  return Array.from(skuMap.entries()).map(([sku_code, quantity]) => ({ sku_code, quantity }));
}

export function useInventoryIntegration() {
  const [status, setStatus] = useState<DeductStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Retry pending transactions when coming back online
  useEffect(() => {
    if (isOnline) {
      retryPendingTransactions();
    }
  }, [isOnline]);

  // Periodic retry every 30 seconds
  useEffect(() => {
    retryIntervalRef.current = setInterval(() => {
      if (isOnline) retryPendingTransactions();
    }, 30_000);
    return () => {
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [isOnline]);

  const retryPendingTransactions = useCallback(async () => {
    const { data: pending } = await (supabase
      .from('pending_transactions') as any)
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(10);

    if (!pending?.length) return;

    for (const tx of pending) {
      try {
        const { data, error } = await supabase.functions.invoke('pos-deduct', {
          body: {
            transaction_id: tx.transaction_id,
            order_id: tx.order_id,
            location_id: tx.location_id,
            actual_date: tx.actual_date,
            items: tx.items,
            user_id: tx.user_id,
            timestamp: new Date().toISOString(),
          },
        });

        if (error) throw error;

        if (data?.status === 'SUCCESS') {
          await (supabase
            .from('pending_transactions') as any)
            .update({ status: 'SUCCESS' })
            .eq('transaction_id', tx.transaction_id);
          toast.success(`Queued order ${tx.order_id} inventory confirmed ✓`);
        } else {
          await (supabase
            .from('pending_transactions') as any)
            .update({
              status: data?.status === 'FAILED' ? 'FAILED' : 'PENDING',
              retry_count: tx.retry_count + 1,
              last_error: data?.message || 'Unknown error',
            })
            .eq('transaction_id', tx.transaction_id);

          if (data?.status === 'FAILED') {
            toast.error(`Queued order ${tx.order_id}: ${data.message}`);
          }
        }
      } catch {
        await (supabase
          .from('pending_transactions') as any)
          .update({ retry_count: tx.retry_count + 1, last_error: 'Network error' })
          .eq('transaction_id', tx.transaction_id);
      }
    }
  }, []);

  const checkStock = useCallback(async (orderItems: OrderItem[]): Promise<{ ok: boolean; results?: StockCheckResult[] }> => {
    if (!isOnline) return { ok: true }; // Skip pre-check when offline

    const items = buildDeductionItems(orderItems);
    if (items.length === 0) return { ok: true };

    try {
      setStatus('checking');
      const { data, error } = await supabase.functions.invoke('stock-check', {
        body: { location_id: LOCATION_ID, items },
      });

      if (error) throw error;

      if (data?.status === 'OK') {
        const insufficient = data.results?.filter((r: StockCheckResult) => !r.sufficient) || [];
        if (insufficient.length > 0) {
          setStatus('failed');
          setErrorMessage(`Insufficient stock: ${insufficient.map((r: StockCheckResult) => r.sku_code).join(', ')}`);
          return { ok: false, results: data.results };
        }
        setStatus('idle');
        return { ok: true, results: data.results };
      }

      setStatus('idle');
      return { ok: true };
    } catch {
      // If stock-check fails, allow sale to proceed (optional check)
      setStatus('idle');
      return { ok: true };
    }
  }, [isOnline]);

  const deductInventory = useCallback(async (
    orderItems: OrderItem[],
    orderId: string,
    paymentMethod: string,
    orderTotal: number,
  ): Promise<{ success: boolean; queued?: boolean; error?: string }> => {
    const items = buildDeductionItems(orderItems);
    if (items.length === 0) return { success: true };

    const transactionId = generateTransactionId();
    const now = new Date();

    // Offline → queue
    if (!isOnline) {
      setStatus('offline');
      await (supabase.from('pending_transactions') as any).insert({
        transaction_id: transactionId,
        order_id: orderId,
        location_id: LOCATION_ID,
        actual_date: now.toISOString().slice(0, 10),
        items,
        payment_method: paymentMethod,
        order_total: orderTotal,
        order_items: orderItems.map(i => ({
          name: i.menuItem.name,
           sku_code: i.menuItem.sku_code,
          quantity: i.quantity,
          total: calculateItemTotal(i),
        })),
        user_id: 'POS',
        status: 'PENDING',
      });
      toast.info('Offline — order queued for inventory validation');
      setStatus('idle');
      return { success: true, queued: true };
    }

    // Online → call API
    try {
      setStatus('deducting');
      setErrorMessage(null);

      const { data, error } = await supabase.functions.invoke('pos-deduct', {
        body: {
          transaction_id: transactionId,
          order_id: orderId,
          location_id: LOCATION_ID,
          actual_date: now.toISOString().slice(0, 10),
          items,
          user_id: 'POS',
          timestamp: now.toISOString(),
        },
      });

      if (error) throw error;

      if (data?.status === 'SUCCESS') {
        setStatus('success');
        return { success: true };
      }

      // Failure (e.g. insufficient stock)
      setStatus('failed');
      const msg = data?.message || 'Inventory deduction failed';
      setErrorMessage(msg);
      return { success: false, error: msg };
    } catch {
      // Network error during deduction → queue for retry
      setStatus('offline');
      await (supabase.from('pending_transactions') as any).insert({
        transaction_id: transactionId,
        order_id: orderId,
        location_id: LOCATION_ID,
        actual_date: now.toISOString().slice(0, 10),
        items,
        payment_method: paymentMethod,
        order_total: orderTotal,
        order_items: orderItems.map(i => ({
          name: i.menuItem.name,
          sku_code: i.menuItem.sku_code,
          quantity: i.quantity,
          total: calculateItemTotal(i),
        })),
        user_id: 'POS',
        status: 'PENDING',
      });
      toast.info('Connection lost — order queued for inventory validation');
      setStatus('idle');
      return { success: true, queued: true };
    }
  }, [isOnline]);

  const resetStatus = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return {
    status,
    errorMessage,
    isOnline,
    checkStock,
    deductInventory,
    resetStatus,
    retryPendingTransactions,
  };
}
