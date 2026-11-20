import type { Customer } from '../interfaces/Customer';
import type { Transaction } from '../interfaces/Transaction';
import type { Category } from '../interfaces/Category';

const PREFIX = 'lwl:';

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

function removeItem(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

// --- Customers ---
export function loadCustomers(): Customer[] {
  return getItem<Customer[]>('customers', []);
}

export function saveCustomers(customers: Customer[]): void {
  setItem('customers', customers);
}

// --- Transactions ---
export function loadTransactions(): Transaction[] {
  return getItem<Transaction[]>('transactions', []);
}

export function saveTransactions(transactions: Transaction[]): void {
  setItem('transactions', transactions);
}

// --- Categories ---
export function loadCategories(): Category[] {
  return getItem<Category[]>('categories', []);
}

export function saveCategories(categories: Category[]): void {
  setItem('categories', categories);
}

// --- Seed loaded flag ---
export function isSeedLoaded(): boolean {
  return getItem<boolean>('seedLoaded', false);
}

export function markSeedLoaded(): void {
  setItem('seedLoaded', true);
}

// --- Clear all ---
export function clearAll(): void {
  removeItem('customers');
  removeItem('transactions');
  removeItem('categories');
  removeItem('seedLoaded');
}
