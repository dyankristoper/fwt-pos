import { useState, useCallback, useMemo, useRef } from 'react';
import { MenuItem, OrderItem } from './types';
import { COMBO_SURCHARGE } from './menuData';

let nextId = 1;
const generateId = () => `oi-${nextId++}-${Date.now()}`;

export function calculateItemTotal(item: OrderItem): number {
  let total = item.menuItem.price * item.quantity;
  if (item.isCombo) {
    total += COMBO_SURCHARGE * item.quantity;
  }
  const addOnsTotal = item.addOns.reduce((sum, a) => sum + a.price, 0);
  total += addOnsTotal * item.quantity;
  return total;
}

export function useOrderState() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [pendingComboItemId, setPendingComboItemId] = useState<string | null>(null);
  const lastMainItemIdRef = useRef<string | null>(null);

  const addItem = useCallback((menuItem: MenuItem) => {
    const isSandwich = menuItem.category === 'sandwiches';
    const isMainItem = menuItem.category === 'sandwiches' || menuItem.category === 'chicken';
    const isAddOn = menuItem.category === 'addons';

    // Add-ons: attach to last main item, or add standalone
    if (isAddOn) {
      const lastId = lastMainItemIdRef.current;
      setItems(prev => {
        if (lastId) {
          const mainExists = prev.some(i => i.instanceId === lastId);
          if (mainExists) {
            return prev.map(item =>
              item.instanceId === lastId
                ? { ...item, addOns: [...item.addOns, menuItem] }
                : item
            );
          }
        }
        // standalone add-on
        return [...prev, {
          instanceId: generateId(),
          menuItem,
          quantity: 1,
          isCombo: false,
          addOns: [],
        }];
      });
      return;
    }

    // Sides & beverages: increment existing or create new
    if (!isMainItem) {
      setItems(prev => {
        const existing = prev.find(
          item => item.menuItem.id === menuItem.id && !item.isCombo && item.addOns.length === 0
        );
        if (existing) {
          return prev.map(item =>
            item.instanceId === existing.instanceId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, {
          instanceId: generateId(),
          menuItem,
          quantity: 1,
          isCombo: false,
          addOns: [],
        }];
      });
      return;
    }

    // Main items (sandwiches, chicken): always new line
    const newId = generateId();
    setItems(prev => [...prev, {
      instanceId: newId,
      menuItem,
      quantity: 1,
      isCombo: false,
      addOns: [],
    }]);
    lastMainItemIdRef.current = newId;

    if (isSandwich) {
      setPendingComboItemId(newId);
    }
  }, []);

  const makeCombo = useCallback((instanceId: string, drink: MenuItem) => {
    setItems(prev => prev.map(item =>
      item.instanceId === instanceId
        ? { ...item, isCombo: true, comboDrink: drink }
        : item
    ));
    setPendingComboItemId(null);
  }, []);

  const declineCombo = useCallback(() => {
    setPendingComboItemId(null);
  }, []);

  const removeItem = useCallback((instanceId: string) => {
    setItems(prev => prev.filter(item => item.instanceId !== instanceId));
    if (instanceId === lastMainItemIdRef.current) {
      lastMainItemIdRef.current = null;
    }
  }, []);

  const incrementQuantity = useCallback((instanceId: string) => {
    setItems(prev => prev.map(item =>
      item.instanceId === instanceId
        ? { ...item, quantity: item.quantity + 1 }
        : item
    ));
  }, []);

  const decrementQuantity = useCallback((instanceId: string) => {
    setItems(prev => {
      const item = prev.find(i => i.instanceId === instanceId);
      if (item && item.quantity <= 1) {
        if (instanceId === lastMainItemIdRef.current) {
          lastMainItemIdRef.current = null;
        }
        return prev.filter(i => i.instanceId !== instanceId);
      }
      return prev.map(i =>
        i.instanceId === instanceId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  }, []);

  const removeAddOn = useCallback((instanceId: string, addOnIndex: number) => {
    setItems(prev => prev.map(item =>
      item.instanceId === instanceId
        ? { ...item, addOns: item.addOns.filter((_, i) => i !== addOnIndex) }
        : item
    ));
  }, []);

  const clearOrder = useCallback(() => {
    setItems([]);
    lastMainItemIdRef.current = null;
    setPendingComboItemId(null);
  }, []);

  const restoreOrder = useCallback((savedItems: OrderItem[]) => {
    setItems(savedItems);
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  }, [items]);

  const pendingComboItem = useMemo(() => {
    if (!pendingComboItemId) return null;
    return items.find(item => item.instanceId === pendingComboItemId) || null;
  }, [items, pendingComboItemId]);

  return {
    items,
    total,
    pendingComboItem,
    addItem,
    makeCombo,
    declineCombo,
    removeItem,
    incrementQuantity,
    decrementQuantity,
    removeAddOn,
    clearOrder,
    restoreOrder,
  };
}
