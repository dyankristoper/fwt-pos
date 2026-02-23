import { MenuItem, MenuCategory } from './types';

export const COMBO_SURCHARGE = 80;


export const menuItems: MenuItem[] = [
  // Signature Sandwiches
  { id: 'classic', sku_code: 'FW-MENU-SAN-0001', name: 'Classic Chicken Sandwich', price: 220, category: 'sandwiches', kcal: 720 },
  { id: 'featherweight', sku_code: 'FW-MENU-SAN-0002', name: 'Featherweight Sandwich', price: 180, category: 'sandwiches', kcal: 725 },
  { id: 'honey-mustard', sku_code: 'FW-MENU-SAN-0003', name: 'Honey Mustard', price: 220, category: 'sandwiches', kcal: 670 },
  { id: 'barbecue', sku_code: 'FW-MENU-SAN-0004', name: 'BBQ Chicken Sandwich', price: 250, category: 'sandwiches', kcal: 730 },
  { id: 'red-heat', sku_code: 'FW-MENU-SAN-0005', name: 'Red Heat Chicken Sandwich', price: 250, category: 'sandwiches', spicy: true, kcal: 760 },

  // Chicken Boxes
  { id: 'box-3', sku_code: 'FW-MENU-CHK-0001', name: 'Box of Three', price: 340, category: 'chicken', kcal: 1450 },
  { id: 'box-5', sku_code: 'FW-MENU-CHK-0002', name: 'Box of Five', price: 490, category: 'chicken', kcal: 2300 },
  { id: 'chicken-rice', sku_code: 'FW-MENU-CHK-0003', name: 'Chicken and Rice Meal', price: 160, category: 'chicken', kcal: 850 },

  // Sides & Add-ons
  { id: 'fries', sku_code: 'FW-MENU-SID-0001', name: 'Fries (80g)', price: 75, category: 'sides', kcal: 250 },
  { id: 'slaw', sku_code: 'FW-MENU-SID-0002', name: 'Slaw (120g)', price: 65, category: 'sides', kcal: 180 },
  { id: 'rice', sku_code: 'FW-MENU-SID-0003', name: 'Rice (190g)', price: 40, category: 'sides', kcal: 250 },

  // Add-ons
  { id: 'cheese', sku_code: 'FW-MENU-SID-0004', name: 'Cheese (14g)', price: 25, category: 'addons', kcal: 60 },
  { id: 'lettuce', sku_code: 'FW-MENU-SID-0005', name: 'Lettuce (10g)', price: 15, category: 'addons', kcal: 2 },
  { id: 'pickle', sku_code: 'FW-MENU-SID-0006', name: 'Pickles (10g)', price: 15, category: 'addons', kcal: 3 },
  { id: 'sig-sauce', sku_code: 'FW-MENU-SID-0007', name: 'Signature Sauce (60g)', price: 50, category: 'addons', kcal: 150 },
  { id: 'bbq-sauce', sku_code: 'FW-MENU-SID-0008', name: 'BBQ Sauce (60g)', price: 50, category: 'addons', kcal: 90 },
  { id: 'hm-sauce', sku_code: 'FW-MENU-SID-0009', name: 'Honey Mustard (60g)', price: 50, category: 'addons', kcal: 90 },
  { id: 'ko-sauce', sku_code: 'FW-MENU-SID-0010', name: 'KO Sauce (Hot Sauce) (60g)', price: 50, category: 'addons', kcal: 90 },
  { id: 'rh-sauce', sku_code: 'FW-MENU-SID-0011', name: 'Red Heat Sauce (60g)', price: 50, category: 'addons', kcal: 130 },

  // Beverages
  { id: 'iced-tea', sku_code: 'FW-MENU-BEV-0001', name: 'FWTea (460ml)', price: 80, category: 'beverages', kcal: 190 },
  { id: 'coke-regular', sku_code: 'FW-MENU-BEV-0002', name: 'Coke Regular', price: 75, category: 'beverages', kcal: 140 },
  { id: 'sprite', sku_code: 'FW-MENU-BEV-0004', name: 'Sprite', price: 75, category: 'beverages', kcal: 140 },
  { id: 'royal', sku_code: 'FW-MENU-BEV-0005', name: 'Royal', price: 75, category: 'beverages', kcal: 140 },
  { id: 'water', sku_code: 'FW-MENU-BEV-0003', name: 'Bottled Water (500ml)', price: 30, category: 'beverages', kcal: 0 },
];

// Combo SKU mapping is now DB-driven via menu_items.combo_sku column
// Managed through Admin Panel → Menu Items → Combo Eligible toggle

export const categoryLabels: Record<MenuCategory, string> = {
  sandwiches: 'Signature Sandwiches',
  chicken: 'Chicken Boxes',
  sides: 'Sides',
  addons: 'Add-ons',
  beverages: 'Beverages',
};

export const categoryOrder: MenuCategory[] = ['sandwiches', 'chicken', 'sides', 'addons', 'beverages'];

export const comboEligibleDrinks = menuItems.filter(
  item => item.id === 'iced-tea'
);

export const addOnItems = menuItems.filter(item => item.category === 'addons');

// Keep beverageItems for backward compat
export const beverageItems = menuItems.filter(item => item.category === 'beverages');
