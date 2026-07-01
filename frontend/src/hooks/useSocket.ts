import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useWalletStore } from '@/store/useWalletStore';
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket';

export const useSocket = () => {
  const { isAuthenticated } = useAuthStore();
  const { setBalance, addTransaction } = useWalletStore();

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = initSocket(token);

    socket.on('balance_update', (data: { balance: string }) => {
      setBalance(data.balance);
    });

    socket.on('new_transaction', (data: { transaction: any }) => {
      addTransaction(data.transaction);
    });

    socket.on('notification', (data: any) => {
      // You could add a useNotificationStore here or trigger a toast notification
      console.log('New notification:', data);
    });

    return () => {
      socket.off('balance_update');
      socket.off('new_transaction');
      socket.off('notification');
    };
  }, [isAuthenticated, setBalance, addTransaction]);

  return getSocket();
};
