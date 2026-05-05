import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';

interface LayoutProps {
  children: ReactNode;
  role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin';
}

export function Layout({ children, role }: LayoutProps) {
  const { token, user, refreshCurrentUser } = useAuthStore();

  useEffect(() => {
    if (!token || !user || user.capabilities?.canSubmitSelfSummary !== undefined) return;
    refreshCurrentUser().catch((error) => {
      console.error('刷新用户能力失败:', error);
    });
  }, [refreshCurrentUser, token, user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar role={role} />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Main Content */}
      <main className="min-h-screen md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 md:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
