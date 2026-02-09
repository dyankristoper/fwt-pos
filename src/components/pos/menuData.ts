import { MenuItem, MenuCategory } from './types';

export const COMBO_SURCHARGE = 80;

// Category images
import sandwichImg from '@/assets/pos/sandwich.jpg';
import chickenImg from '@/assets/pos/chicken-box.jpg';
import sidesImg from '@/assets/pos/sides.jpg';
import addonsImg from '@/assets/pos/addons.jpg';
import drinksImg from '@/assets/pos/drinks.jpg';

export const categoryImages: Record<MenuCategory, string> = {
  sandwiches: sandwichImg,
  chicken: chickenImg,
  sides: sidesImg,
  addons: addonsImg,
  beverages: drinksImg,
};

export const menuItems: MenuItem[] = [
  // Signature Sandwiches
  { id: 'featherweight', name: 'Featherweight', price: 160, category: 'sandwiches' },
  { id: 'classic', name: 'Classic', price: 200, category: 'sandwiches' },
  { id: 'honey-mustard', name: 'Honey Mustard', price: 220, category: 'sandwiches' },
  { id: 'red-heat', name: 'Red Heat', price: 250, category: 'sandwiches', spicy: true },
  { id: 'barbecue', name: 'Barbecue', price: 220, category: 'sandwiches' },

  // More Chicken
  { id: 'box-3', name: 'Box of Three', price: 220, category: 'chicken' },
  { id: 'box-5', name: 'Box of Five', price: 360, category: 'chicken' },
  { id: 'chicken-rice', name: 'Chicken + Rice Box', price: 220, category: 'chicken' },

  // Sides
  { id: 'fries', name: 'Fries', price: 80, category: 'sides' },
  { id: 'slaw', name: 'Slaw', price: 80, category: 'sides' },
  { id: 'rice', name: 'Rice', price: 25, category: 'sides' },

  // Add-ons
  { id: 'cheese', name: 'Cheese', price: 20, category: 'addons' },
  { id: 'lettuce', name: 'Lettuce', price: 20, category: 'addons' },
  { id: 'pickle', name: 'Pickle', price: 20, category: 'addons' },

  // Beverages
  { id: 'iced-tea', name: 'FWT Iced Tea', price: 80, category: 'beverages' },
  { id: 'soda', name: 'Soda', price: 80, category: 'beverages' },
  { id: 'water', name: 'Bottled Water', price: 50, category: 'beverages' },
];

export const categoryLabels: Record<MenuCategory, string> = {
  sandwiches: 'Signature Sandwiches',
  chicken: 'More Chicken',
  sides: 'Sides',
  addons: 'Add-ons',
  beverages: 'Beverages',
};

export const categoryOrder: MenuCategory[] = ['sandwiches', 'chicken', 'sides', 'addons', 'beverages'];

export const beverageItems = menuItems.filter(item => item.category === 'beverages');
