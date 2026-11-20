import { useReducer, useEffect, type ReactNode } from 'react';
import type { Customer } from '../interfaces/Customer';
import type { Transaction } from '../interfaces/Transaction';
import {
  loadCustomers,
  saveCustomers,
  loadTransactions,
  saveTransactions,
  loadCategories,
  saveCategories,
  clearAll,
} from '../services/storage';
import { generateSeedData } from '../utils/seed';
import {
  LoyaltyContext,
  type LoyaltyState,
  type LoyaltyContextValue,
} from './loyaltyContextDef';

// ---- Actions ----
type Action =
  | { type: 'SET_ALL'; payload: LoyaltyState }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'LOAD_SEED' }
  | { type: 'CLEAR_DATA' };

// ---- Reducer ----
function reducer(state: LoyaltyState, action: Action): LoyaltyState {
  switch (action.type) {
    case 'SET_ALL':
      return action.payload;

    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };

    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      };

    case 'DELETE_CUSTOMER': {
      const customerId = action.payload;
      return {
        ...state,
        customers: state.customers.filter((c) => c.id !== customerId),
        transactions: state.transactions.filter(
          (t) => t.customerId !== customerId,
        ),
      };
    }

    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, action.payload],
      };

    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        ),
      };

    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(
          (t) => t.id !== action.payload,
        ),
      };

    case 'LOAD_SEED': {
      clearAll();
      const seed = generateSeedData();
      saveCustomers(seed.customers);
      saveTransactions(seed.transactions);
      saveCategories(seed.categories);
      return seed;
    }

    case 'CLEAR_DATA': {
      clearAll();
      return {
        customers: [],
        transactions: [],
        categories: [],
      };
    }

    default:
      return state;
  }
}

// ---- Provider ----
export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    // Starts with whatever is in storage (defaults to empty arrays)
    return {
      customers: loadCustomers(),
      transactions: loadTransactions(),
      categories: loadCategories(),
    };
  });

  // Persist on every state change
  useEffect(() => {
    saveCustomers(state.customers);
    saveTransactions(state.transactions);
    saveCategories(state.categories);
  }, [state]);

  const value: LoyaltyContextValue = {
    state,
    addCustomer: (c) => dispatch({ type: 'ADD_CUSTOMER', payload: c }),
    updateCustomer: (c) => dispatch({ type: 'UPDATE_CUSTOMER', payload: c }),
    deleteCustomer: (id) => dispatch({ type: 'DELETE_CUSTOMER', payload: id }),
    addTransaction: (t) => dispatch({ type: 'ADD_TRANSACTION', payload: t }),
    updateTransaction: (t) =>
      dispatch({ type: 'UPDATE_TRANSACTION', payload: t }),
    deleteTransaction: (id) =>
      dispatch({ type: 'DELETE_TRANSACTION', payload: id }),
    loadSeed: () => dispatch({ type: 'LOAD_SEED' }),
    clearData: () => dispatch({ type: 'CLEAR_DATA' }),
  };

  return (
    <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>
  );
}
