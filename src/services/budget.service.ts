import type { Expense, BudgetSummary } from '../types';
import { apiCall } from './apiCall';

export const budgetAPI = {
  getAll: async (householdId: string): Promise<Expense[]> => {
    const response = await apiCall<Array<{
      id: number | string;
      amount: number;
      date: string;
      category?: string;
      note?: string;
      store?: string;
      receipt_link?: string;
      created_at?: string;
    }>>('/expenses');
    
    return response.map((expense) => ({
      id: String(expense.id),
      amount: expense.amount,
      date: expense.date,
      category: expense.category || 'Other',
      note: expense.note || '',
      store: expense.store,
      receiptLink: expense.receipt_link,
      householdId,
      createdAt: expense.created_at || new Date().toISOString(),
    }));
  },

  getById: async (id: string, householdId: string): Promise<Expense | null> => {
    try {
      const response = await apiCall<{
        id: number | string;
        amount: number;
        date: string;
        category?: string;
        note?: string;
        store?: string;
        receipt_link?: string;
        created_at?: string;
      }>(`/expenses/${id}`);
      
      return {
        id: String(response.id),
        amount: response.amount,
        date: response.date,
        category: response.category || 'Other',
        note: response.note || '',
        store: response.store,
        receiptLink: response.receipt_link,
        householdId,
        createdAt: response.created_at || new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  },

  create: async (expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
    const requestBody: {
      amount: number;
      date: string;
      category?: string;
      note?: string;
      store?: string;
      receipt_link?: string;
    } = {
      amount: expense.amount,
      date: expense.date,
    };

    if (expense.category) {
      requestBody.category = expense.category;
    }

    if (expense.note) {
      requestBody.note = expense.note;
    }

    if (expense.store) {
      requestBody.store = expense.store;
    }

    if (expense.receiptLink) {
      requestBody.receipt_link = expense.receiptLink;
    }

    const response = await apiCall<{
      id: number | string;
      amount: number;
      date: string;
      category?: string;
      note?: string;
      store?: string;
      receipt_link?: string;
      created_at?: string;
    }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    return {
      id: String(response.id),
      amount: response.amount,
      date: response.date,
      category: response.category || 'Other',
      note: response.note || '',
      store: response.store,
      receiptLink: response.receipt_link,
      householdId: expense.householdId,
      createdAt: response.created_at || new Date().toISOString(),
    };
  },

  update: async (id: string, expense: Partial<Expense>, householdId: string): Promise<Expense> => {
    const requestBody: {
      amount?: number;
      date?: string;
      category?: string;
      note?: string;
      store?: string;
      receipt_link?: string;
    } = {};

    if (expense.amount !== undefined) {
      requestBody.amount = expense.amount;
    }

    if (expense.date !== undefined) {
      requestBody.date = expense.date;
    }

    if (expense.category !== undefined) {
      requestBody.category = expense.category;
    }

    if (expense.note !== undefined) {
      requestBody.note = expense.note;
    }

    if (expense.store !== undefined) {
      requestBody.store = expense.store;
    }

    if (expense.receiptLink !== undefined) {
      requestBody.receipt_link = expense.receiptLink;
    }

    const response = await apiCall<{
      id: number | string;
      amount: number;
      date: string;
      category?: string;
      note?: string;
      store?: string;
      receipt_link?: string;
      created_at?: string;
    }>(`/expenses/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    return {
      id: String(response.id),
      amount: response.amount,
      date: response.date,
      category: response.category || 'Other',
      note: response.note || '',
      store: response.store,
      receiptLink: response.receipt_link,
      householdId,
      createdAt: response.created_at || new Date().toISOString(),
    };
  },

  delete: async (id: string, householdId: string): Promise<void> => {
    await apiCall(`/expenses/${id}/delete`, {
      method: 'POST',
    });
  },

  getSummary: async (householdId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<BudgetSummary> => {
    return apiCall<BudgetSummary>(`/expenses/summary?period=${period}`);
  },
};

