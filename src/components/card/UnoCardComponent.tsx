import { motion } from 'framer-motion';
import { UnoCard, UnoColor } from '@/types';
import { cn } from '@/lib/cn';

interface UnoCardProps {
  card: UnoCard;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const colorStyles: Record<UnoColor, string> = {
  red: 'bg-red-600',
  yellow: 'bg-yellow-400',
  green: 'bg-green-600',
  blue: 'bg-blue-600',
  wild: 'bg-gradient-to-br from-red-500 via-blue-500 to-green-500',
};

const textStyles: Record<UnoColor, string> = {
  red: 'text-white',
  yellow: 'text-yellow-900',
  green: 'text-white',
  blue: 'text-white',
  wild: 'text-white',
};

const valueLabels: Record<string, string> = {
  skip: '⊘',
  reverse: '⇄',
  draw2: '+2',
  wild: 'W',
  wild4: 'W+4',
};

const sizeClasses = {
  sm: 'w-[42px] h-[60px] rounded-lg',
  md: 'w-[60px] h-[84px] rounded-xl',
  lg: 'w-[80px] h-[112px] rounded-2xl',
};

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export default function UnoCardComponent({ card, selected, disabled, size = 'md', onClick, className }: UnoCardProps) {
  const label = valueLabels[card.value] ?? card.value;
  const colorClass = colorStyles[card.color];
  const textClass = textStyles[card.color];

  return (
    <motion.div
      whileHover={onClick && !disabled ? { y: -10, scale: 1.05 } : undefined}
      whileTap={onClick && !disabled ? { scale: 0.97 } : undefined}
      animate={{ y: selected ? -16 : 0, scale: selected ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'relative select-none shadow-card flex-shrink-0',
        sizeClasses[size],
        colorClass,
        disabled && 'opacity-50 cursor-default',
        onClick && !disabled && 'cursor-pointer',
        selected && 'ring-2 ring-yellow-400',
        className,
      )}
    >
      {/* White oval center */}
      <div className="absolute inset-[6px] rounded-full bg-white/25 flex items-center justify-center">
        <span className={cn('font-card font-bold', textClass, textSizes[size])}>
          {label}
        </span>
      </div>
      {/* Corner labels */}
      <span className={cn('absolute top-0.5 left-1 font-card font-bold leading-none', textClass, 'text-[9px]')}>
        {label}
      </span>
      <span className={cn('absolute bottom-0.5 right-1 font-card font-bold leading-none rotate-180', textClass, 'text-[9px]')}>
        {label}
      </span>
    </motion.div>
  );
}
