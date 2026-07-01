import { create } from 'zustand';
import api from '@/lib/api';

export interface Transaction {
  id: number | string;
  amount: string | number;
  status: 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded';
  type: 'deposit' | 'withdrawal' | 'transfer' | 'stripe_charge' | 'refund' | 'sent' | 'received';
  description?: string;
  from?: string;
  to?: string;
  fromEmail?: string;
  toEmail?: string;
  aiCategory?: string;
  aiCategoryConf?: number;
  aiTags?: string[];
  timestamp: string;
  createdAt?: string;
}

interface WalletState {
  balance: string;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  
  fetchWallet: () => Promise<void>;
  fetchTransactions: (page?: number) => Promise<void>;
  setBalance: (balance: string) => void;
  addTransaction: (tx: Transaction) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: '0.00',
  transactions: [],
  isLoading: false,
  error: null,
  hasMore: true,
  page: 0,

  fetchWallet: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/wallet');
      const { wallet } = response.data;
      set({ 
        balance: wallet.balance, 
        // We'll set transactions separately or initially via fetchTransactions
        isLoading: false 
      });
    } catch (err: any) {
      set({ 
        error: err.response?.data?.error?.message || 'Failed to fetch wallet details',
        isLoading: false 
      });
    }
  },

  fetchTransactions: async (page = 0) => {
    set({ isLoading: true, error: null });
    try {
      const limit = 10;
      const offset = page * limit;
      // Use the generic transfer history or wallet transactions API
      const response = await api.get(`/wallet/transactions?limit=${limit}&offset=${offset}`);
      const newTransactions = response.data.transactions;
      
      set((state) => ({
        transactions: page === 0 ? newTransactions : [...state.transactions, ...newTransactions],
        hasMore: response.data.pagination.hasMore,
        page,
        isLoading: false
      }));
    } catch (err: any) {
      set({ 
        error: err.response?.data?.error?.message || 'Failed to fetch transactions',
        isLoading: false 
      });
    }
  },

  setBalance: (balance: string) => set({ balance }),
  
  addTransaction: (tx: Transaction) => set((state) => ({
    // Add to top of list
    transactions: [tx, ...state.transactions],
  })),
}));
