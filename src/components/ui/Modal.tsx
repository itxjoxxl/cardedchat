import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeClasses = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[60vh]',
  lg: 'max-h-[80vh]',
  full: 'max-h-[92vh]',
};

export default function Modal({ isOpen, onClose, title, children, className, size = 'md' }: ModalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-[#0f3d25] border-t border-white/10 rounded-t-3xl',
              'flex flex-col',
              sizeClasses[size],
              className,
            )}
          >
            {/* Handle */}
            <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {title && (
              <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white font-ui">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
