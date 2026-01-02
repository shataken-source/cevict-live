/**
 * PROGNOSTICATION ADMIN PAGE
 * Bot control and risk management interface
 * Updated with Claude's new GUI design
 */

import AdminDashboardNew from '@/components/AdminDashboardNew';

export const metadata = {
  title: 'Admin Dashboard | Prognostication',
  description: 'Real-time bot control and risk management',
};

export default function AdminPage() {
  return <AdminDashboardNew />;
}
