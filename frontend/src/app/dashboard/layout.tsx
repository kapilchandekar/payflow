import { DashboardLayout } from '@/components/layout/DashboardLayout';

export const metadata = {
  title: 'Dashboard - PayFlow',
  description: 'Manage your finances',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
