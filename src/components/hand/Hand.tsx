import { motion } from 'framer-motion';
import { Card as CardType } from '@/types';
import Card from '@/components/card/Card';
import { useDragHand } from '@/hooks/useDragHand';
import { cn } from '@/lib/cn';

interface HandProps {
  cards: CardType[];
  playerId: string;
  isLocal: boolean;
  faceUp?: boolean;
  selectedCardIds?: string[];
  onCardClick?: (cardId: string) => void;
  onReorder?: (newCards: CardType[]) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  maxFanAngle?: number;
}

export default function Hand({
  cards,
  isLocal,
  faceUp,
  selectedCardIds = [],
  onCardClick,
  onReorder,
  size = 'md',
  className,
  maxFanAngle = 4,
}: HandProps) {
  const shouldBeUp = faceUp ?? isLocal;
  // Drag is enabled for local players (reordering is purely visual if no onReorder supplied)
  const { displayOrder, getDragProps, containerRef } = useDragHand(
    cards,
    onReorder ?? (() => {}),
    !isLocal,
  );

  const count = displayOrder.length;
  const mid = (count - 1) / 2;

  const cardWidths = { sm: 50, md: 70, lg: 90 };
  const cardW = cardWidths[size];
  const overlap = Math.max(0.4, 1 - count * 0.05);
  const visibleWidth = cardW * overlap;

  if (count === 0) {
    return (
      <div className={cn('flex items-center justify-center min-h-[80px]', className)}>
        <span className="text-white/20 text-sm font-ui">No cards</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-end justify-center touch-none', className)}
      style={{
        height: size === 'lg' ? 160 : size === 'md' ? 130 : 100,
        width: Math.min(cardW + (count - 1) * visibleWidth + 20, 380),
      }}
    >
      {displayOrder.map((card, index) => {
        const offset = index - mid;
        const rotate = offset * maxFanAngle * (isLocal ? 1 : 0.6);
        const yOffset = Math.abs(offset) * 2.5;
        const dragProps = isLocal ? getDragProps(index) : {};

        return (
          <motion.div
            key={card.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: selectedCardIds.includes(card.id) ? -yOffset - 18 : -yOffset,
              scale: selectedCardIds.includes(card.id) ? 1.08 : 1,
              rotate,
              zIndex: selectedCardIds.includes(card.id) ? 100 : index,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30, delay: index * 0.04 }}
            style={{
              position: 'absolute',
              left: index * visibleWidth,
              bottom: 0,
              transformOrigin: 'bottom center',
            }}
            {...dragProps}
          >
            <Card
              card={card}
              faceUp={shouldBeUp}
              size={size}
              selected={selectedCardIds.includes(card.id)}
              onClick={onCardClick ? () => onCardClick(card.id) : undefined}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
