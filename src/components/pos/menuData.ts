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
  { id: 'classic', name: 'Classic Chicken Sandwich', price: 220, category: 'sandwiches', kcal: 720 },
  { id: 'featherweight', name: 'Featherweight Sandwich', price: 180, category: 'sandwiches', kcal: 725 },
  { id: 'honey-mustard', name: 'Honey Mustard', price: 220, category: 'sandwiches', kcal: 670 },
  { id: 'barbecue', name: 'BBQ Chicken Sandwich', price: 250, category: 'sandwiches', kcal: 730 },
  { id: 'red-heat', name: 'Red Heat Chicken Sandwich', price: 250, category: 'sandwiches', spicy: true, kcal: 760 },

  // Chicken Boxes
  { id: 'box-3', name: 'Box of Three', price: 340, category: 'chicken', kcal: 1450 },
  { id: 'box-5', name: 'Box of Five', price: 490, category: 'chicken', kcal: 2300 },
  { id: 'chicken-rice', name: 'Chicken and Rice Meal', price: 160, category: 'chicken', kcal: 850 },

  // Sides & Add-ons
  { id: 'fries', name: 'Fries (80g)', price: 75, category: 'sides', kcal: 250 },
  { id: 'slaw', name: 'Slaw (120g)', price: 65, category: 'sides', kcal: 180 },
  { id: 'rice', name: 'Rice (190g)', price: 40, category: 'sides', kcal: 250 },

  // Add-ons
  { id: 'cheese', name: 'Cheese (14g)', price: 25, category: 'addons', kcal: 60 },
  { id: 'lettuce', name: 'Lettuce (10g)', price: 15, category: 'addons', kcal: 2 },
  { id: 'pickle', name: 'Pickles (10g)', price: 15, category: 'addons', kcal: 3 },
  { id: 'sig-sauce', name: 'Signature Sauce (60g)', price: 50, category: 'addons', kcal: 150 },
  { id: 'bbq-sauce', name: 'BBQ Sauce (60g)', price: 50, category: 'addons', kcal: 90 },
  { id: 'hm-sauce', name: 'Honey Mustard (60g)', price: 50, category: 'addons', kcal: 90 },
  { id: 'ko-sauce', name: 'KO Sauce (Hot Sauce) (60g)', price: 50, category: 'addons', kcal: 90 },
  { id: 'rh-sauce', name: 'Red Heat Sauce (60g)', price: 50, category: 'addons', kcal: 130 },

  // Beverages
  { id: 'iced-tea', name: 'FWTea (460ml)', price: 80, category: 'beverages', kcal: 190 },
  { id: 'coke', name: 'Coke Products in Can', price: 75, category: 'beverages', kcal: 140 },
  { id: 'water', name: 'Bottled Water (500ml)', price: 30, category: 'beverages', kcal: 0 },
];

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
