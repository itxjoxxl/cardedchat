import { Card as CardType } from '@/types';
import CardStack from '@/components/card/CardStack';
import { cn } from '@/lib/cn';

interface CenterPileProps {
  drawPile: CardType[];
  discardPile: CardType[];
  onDrawClick?: () => void;
  onDiscardClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  drawLabel?: string;
  discardLabel?: string;
}

export default function CenterPile({
  drawPile,
  discardPile,
  onDrawClick,
  onDiscardClick,
  size = 'md',
  className,
  drawLabel = 'Draw',
  discardLabel = 'Discard',
}: CenterPileProps) {
  return (
    <div className={cn('flex items-center justify-center gap-6', className)}>
      <CardStack
        cards={drawPile}
        label={drawLabel}
        faceUp={false}
        onClick={onDrawClick}
        size={size}
      />
      <CardStack
        cards={discardPile}
        label={discardLabel}
        faceUp={true}
        onClick={onDiscardClick}
        size={size}
      />
    </div>
  );
}
