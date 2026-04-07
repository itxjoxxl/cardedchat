import { motion } from 'framer-motion';
import { GameConfig } from '@/games/registry';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

interface GameCardProps {
  game: GameConfig;
  onClick: () => void;
  onRulesClick: (e: React.MouseEvent) => void;
}

const categoryColors: Record<string, 'gold' | 'blue' | 'green' | 'red' | 'gray'> = {
  poker: 'gold',
  strategy: 'blue',
  luck: 'red',
  casual: 'green',
  solo: 'gray',
};

export default function GameCard({ game, onClick, onRulesClick }: GameCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative bg-felt-dark/80 border border-white/10 rounded-2xl p-4',
        'flex flex-col items-center gap-2 cursor-pointer',
        'shadow-card active:shadow-none',
      )}
      onClick={onClick}
    >
      {/* Rules button */}
      <button
        onClick={onRulesClick}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 text-white/40 hover:text-white hover:bg-white/20 text-xs flex items-center justify-center transition-colors"
      >
        ?
      </button>

      {/* Emoji */}
      <span className="text-4xl">{game.emoji}</span>

      {/* Name */}
      <span className="text-sm font-medium text-white font-ui text-center leading-tight">{game.name}</span>

      {/* Meta */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <Badge variant={categoryColors[game.category] ?? 'gray'}>
          {game.category}
        </Badge>
        <span className="text-[10px] text-white/30 font-ui">
          {game.minPlayers === game.maxPlayers ? `${game.minPlayers}P` : `${game.minPlayers}-${game.maxPlayers}P`}
        </span>
      </div>
    </motion.div>
  );
}
