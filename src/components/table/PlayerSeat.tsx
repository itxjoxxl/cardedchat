import { motion } from 'framer-motion';
import { Player } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

interface PlayerSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  score?: number;
  chips?: number;
  cardCount?: number;
  isLocal?: boolean;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right';
  children?: React.ReactNode; // Hand overlay
}

export default function PlayerSeat({
  player,
  isCurrentTurn,
  score,
  chips,
  cardCount,
  isLocal = false,
  className,
  children,
}: PlayerSeatProps) {
  return (
    <motion.div
      animate={{
        scale: isCurrentTurn ? 1.05 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'flex flex-col items-center gap-1',
        className,
      )}
    >
      <Avatar
        emoji={player.avatar}
        name={isLocal ? undefined : player.name}
        size={isLocal ? 'lg' : 'sm'}
        isCurrentTurn={isCurrentTurn}
      />
      {/* Card count badge for opponents */}
      {!isLocal && cardCount !== undefined && (
        <div className="bg-black/40 rounded-full px-2 py-0.5 text-xs text-white/60 font-ui">
          {cardCount} cards
        </div>
      )}
      {/* Score/chips */}
      {(score !== undefined || chips !== undefined) && (
        <div className={cn(
          'rounded-full px-3 py-0.5 text-xs font-medium font-ui',
          isCurrentTurn ? 'bg-yellow-500/20 text-yellow-300' : 'bg-black/30 text-white/60',
        )}>
          {chips !== undefined ? `$${chips}` : score}
        </div>
      )}
      {children}
    </motion.div>
  );
}
