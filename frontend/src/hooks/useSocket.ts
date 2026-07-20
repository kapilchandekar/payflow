import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useWalletStore } from '@/store/useWalletStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket';

export const useSocket = () => {
  const { isAuthenticated } = useAuthStore();
  const { setBalance, addTransaction } = useWalletStore();
  const { addNotification } = useNotificationStore();
  const connectedWithToken = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      connectedWithToken.current = null;
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    // If already connected with the same token, don't reconnect
    if (connectedWithToken.current === token) {
      const existing = getSocket();
      if (existing?.connected) return;
    }

    connectedWithToken.current = token;
    const socket = initSocket(token);

    socket.on('balance_update', (data: { balance: string }) => {
      setBalance(data.balance);
    });

    socket.on('new_transaction', (data: { transaction: any }) => {
      addTransaction(data.transaction);
    });

    socket.on('notification', (data: any) => {
      addNotification(data.notification || data);
    });

    return () => {
      socket.off('balance_update');
      socket.off('new_transaction');
      socket.off('notification');
    };
  }, [isAuthenticated, setBalance, addTransaction, addNotification]);

  return getSocket();
};
