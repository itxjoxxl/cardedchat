import { motion } from 'framer-motion';
import { Card as CardType } from '@/types';
import Card from './Card';
import { cn } from '@/lib/cn';

interface CardStackProps {
  cards: CardType[];
  label?: string;
  faceUp?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  maxVisible?: number;
}

const sizeConfig = {
  sm: { w: 50, h: 70, offset: 2 },
  md: { w: 70, h: 98, offset: 3 },
  lg: { w: 90, h: 126, offset: 4 },
};

export default function CardStack({
  cards,
  label,
  faceUp = false,
  onClick,
  size = 'md',
  className,
  maxVisible = 3,
}: CardStackProps) {
  const cfg = sizeConfig[size];
  const visible = Math.min(cards.length, maxVisible);
  const topCard = cards[cards.length - 1];
  const empty = cards.length === 0;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <motion.div
        whileHover={onClick && !empty ? { scale: 1.04, y: -3 } : undefined}
        whileTap={onClick && !empty ? { scale: 0.97 } : undefined}
        onClick={!empty ? onClick : undefined}
        className={cn(
          'relative',
          onClick && !empty && 'cursor-pointer',
        )}
        style={{ width: cfg.w, height: cfg.h }}
      >
        {empty ? (
          /* Empty slot */
          <div
            className="absolute inset-0 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center"
            style={{ width: cfg.w, height: cfg.h }}
          >
            <span className="text-white/20 text-xs font-ui">{label ?? 'Empty'}</span>
          </div>
        ) : (
          <>
            {/* Shadow cards behind */}
            {Array.from({ length: visible - 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-xl bg-[#f9f6ef] shadow-card"
                style={{
                  width: cfg.w,
                  height: cfg.h,
                  top: -(i + 1) * cfg.offset,
                  left: 0,
                  zIndex: visible - i - 1,
                }}
              />
            ))}
            {/* Top card */}
            {topCard && (
              <Card
                card={topCard}
                faceUp={faceUp}
                size={size}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: visible }}
              />
            )}
            {/* Count badge */}
            {cards.length > 1 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-500 text-yellow-900 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shadow">
                {cards.length}
              </div>
            )}
          </>
        )}
      </motion.div>
      {label && (
        <span className="text-xs text-white/50 font-ui">{label}</span>
      )}
    </div>
  );
}
