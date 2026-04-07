import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { tableVariants } from '@/animations/table-variants';

interface TableProps {
  children: React.ReactNode;
  shape?: 'oval' | 'rectangle';
  className?: string;
}

export default function Table({ children, shape = 'oval', className }: TableProps) {
  return (
    <motion.div
      variants={tableVariants}
      initial="hidden"
      animate="visible"
      className={cn('relative w-full h-full flex items-center justify-center', className)}
    >
      {/* Outer wooden rim */}
      <div className={cn(
        'absolute inset-0 bg-[#2c1810]',
        'shadow-felt-rim',
        shape === 'oval' ? 'rounded-[50%]' : 'rounded-3xl',
      )} />

      {/* Inner felt surface */}
      <div className={cn(
        'absolute inset-3 felt-surface',
        shape === 'oval' ? 'rounded-[50%]' : 'rounded-2xl',
        'border border-[#0a2918]',
      )}>
        {/* Felt highlight */}
        <div className={cn(
          'absolute inset-0 pointer-events-none',
          'bg-gradient-to-b from-white/5 to-transparent',
          shape === 'oval' ? 'rounded-[50%]' : 'rounded-2xl',
        )} />
      </div>

      {/* Content layer */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
