import { createContext } from 'react';
import type { Customer } from '../interfaces/Customer';
import type { Transaction } from '../interfaces/Transaction';
import type { Category } from '../interfaces/Category';

export interface LoyaltyState {
  customers: Customer[];
  transactions: Transaction[];
  categories: Category[];
}

export interface LoyaltyContextValue {
  state: LoyaltyState;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  loadSeed: () => void;
  clearData: () => void;
}

export const LoyaltyContext = createContext<LoyaltyContextValue | null>(null);
