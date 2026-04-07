import { motion } from 'framer-motion';
import { Card as CardType } from '@/types';
import CardFace from './CardFace';
import CardBack from './CardBack';
import { cn } from '@/lib/cn';
import { useSettingsStore } from '@/store/settingsStore';

type CardSize = 'sm' | 'md' | 'lg';

interface CardProps {
  card: CardType;
  faceUp: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: CardSize;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  layoutId?: string;
  dragging?: boolean;
}

const sizeClasses: Record<CardSize, string> = {
  sm: 'w-[50px] h-[70px] rounded-lg',
  md: 'w-[70px] h-[98px] rounded-xl',
  lg: 'w-[90px] h-[126px] rounded-2xl',
};

export default function Card({
  card,
  faceUp,
  selected = false,
  disabled = false,
  size = 'md',
  className,
  onClick,
  style,
  layoutId,
  dragging = false,
}: CardProps) {
  const { cardBackColor } = useSettingsStore();

  return (
    <motion.div
      layoutId={layoutId ?? card.id}
      onClick={disabled ? undefined : onClick}
      whileHover={onClick && !disabled && !dragging ? { y: -10, scale: 1.05 } : undefined}
      whileTap={onClick && !disabled ? { scale: 0.97 } : undefined}
      animate={{
        y: selected ? -16 : 0,
        scale: dragging ? 1.1 : 1,
        zIndex: dragging ? 100 : selected ? 10 : 1,
        filter: disabled ? 'brightness(0.7)' : 'brightness(1)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      style={{
        perspective: '1000px',
        ...style,
      }}
      className={cn(
        'relative flex-shrink-0 cursor-pointer select-none',
        sizeClasses[size],
        selected && 'ring-2 ring-yellow-400 shadow-card-selected',
        !selected && 'shadow-card',
        disabled && 'cursor-default',
        className,
      )}
    >
      {/* 3D flip container */}
      <motion.div
        className="absolute inset-0 preserve-3d"
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <CardFace card={card} size={size} />
        <CardBack size={size} color={cardBackColor as 'blue' | 'red' | 'green' | 'purple'} />
      </motion.div>
    </motion.div>
  );
}
