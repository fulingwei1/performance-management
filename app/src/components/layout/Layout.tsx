import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
  role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin';
}

export function Layout({ children, role }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} />
      
      <main className="ml-64 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
