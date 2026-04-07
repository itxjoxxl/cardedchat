import { Card } from '@/types';
import SuitIcon from './SuitIcon';
import { cn } from '@/lib/cn';

interface CardFaceProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { corner: 'text-[9px]', iconSize: 8, centerIconSize: 20, centerText: 'text-lg', w: 50, h: 70 },
  md: { corner: 'text-[11px]', iconSize: 10, centerIconSize: 28, centerText: 'text-2xl', w: 70, h: 98 },
  lg: { corner: 'text-sm', iconSize: 13, centerIconSize: 36, centerText: 'text-4xl', w: 90, h: 126 },
};

const FACE_CARD_ART: Record<string, string> = {
  J: '🤴',
  Q: '👸',
  K: '🤴',
  A: '⭐',
};

export default function CardFace({ card, size = 'md' }: CardFaceProps) {
  const cfg = sizeConfig[size];
  const isRed = card.color === 'red';
  const textColor = isRed ? 'text-[#c8102e]' : 'text-[#1a1a1a]';
  const isFace = ['J', 'Q', 'K', 'A'].includes(card.rank);

  return (
    <div
      className="absolute inset-0 rounded-[inherit] bg-[#f9f6ef] flex flex-col"
      style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
    >
      {/* Top-left corner */}
      <div className={cn('absolute top-1 left-1 flex flex-col items-center leading-none', textColor)}>
        <span className={cn('font-card font-bold leading-none', cfg.corner)}>{card.rank}</span>
        <SuitIcon suit={card.suit} size={cfg.iconSize} />
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className={cn('absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180', textColor)}>
        <span className={cn('font-card font-bold leading-none', cfg.corner)}>{card.rank}</span>
        <SuitIcon suit={card.suit} size={cfg.iconSize} />
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center">
        {isFace ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className={cfg.centerText}>{FACE_CARD_ART[card.rank]}</span>
            {card.rank !== 'A' && (
              <span className={cn('font-card font-bold', cfg.corner, textColor)}>{card.rank}</span>
            )}
          </div>
        ) : (
          <div className={cn('flex items-center justify-center', textColor)}>
            <SuitIcon suit={card.suit} size={cfg.centerIconSize} />
          </div>
        )}
      </div>

      {/* Subtle border inside */}
      <div className="absolute inset-[3px] rounded-[calc(inherit-2px)] border border-[#d4c9b8]/50 pointer-events-none" />
    </div>
  );
}
