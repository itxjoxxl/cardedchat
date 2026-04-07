import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';

const typeClasses = {
  success: 'bg-green-900/90 border-green-600 text-green-200',
  error: 'bg-red-900/90 border-red-600 text-red-200',
  info: 'bg-blue-900/90 border-blue-600 text-blue-200',
};

const typeIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export default function Toast() {
  const { toast, dismissToast } = useUIStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, 3000);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full px-4 max-w-sm">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md pointer-events-auto',
              typeClasses[toast.type],
            )}
            onClick={dismissToast}
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-current/20 text-xs font-bold flex-shrink-0">
              {typeIcons[toast.type]}
            </span>
            <p className="text-sm font-medium font-ui">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
