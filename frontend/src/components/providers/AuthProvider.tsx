'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { usePathname, useRouter } from 'next/navigation';
import { Preloader } from '@/components/ui/Preloader';

const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, setLoading, isLoading, isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const fetchUser = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/profile');
        const user = response.data.user || response.data.data?.user || response.data;
        login(user, token);
      } catch (error) {
        console.error('Failed to authenticate user', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [login, logout, setLoading]);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    const isPublicRoute = publicRoutes.includes(pathname);

    if (isAuthenticated && isPublicRoute) {
      router.replace('/dashboard');
    } else if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router, isMounted]);

  if (!isMounted || isLoading) {
    return <Preloader message="Authenticating..." />;
  }

  // Prevent flash of protected content while redirecting
  const isPublicRoute = publicRoutes.includes(pathname);
  if ((!isAuthenticated && !isPublicRoute) || (isAuthenticated && isPublicRoute)) {
    return <Preloader message="Redirecting..." />;
  }

  return <>{children}</>;
}
