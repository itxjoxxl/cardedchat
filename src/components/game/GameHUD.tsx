import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getGame } from '@/games/registry';
import RulesModal from '@/components/lobby/RulesModal';
import { cn } from '@/lib/cn';

interface GameHUDProps {
  gameId: string;
  currentPlayerName: string;
  isMyTurn: boolean;
  turnNumber?: number;
  onExit?: () => void;
  className?: string;
}

export default function GameHUD({
  gameId,
  currentPlayerName,
  isMyTurn,
  turnNumber,
  onExit,
  className,
}: GameHUDProps) {
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();
  const game = getGame(gameId);

  function handleExit() {
    if (onExit) onExit();
    else navigate('/');
  }

  return (
    <>
      <div className={cn(
        'absolute top-0 left-0 right-0 z-20',
        'flex items-center justify-between',
        'px-4 py-3 safe-top',
        'bg-gradient-to-b from-black/50 to-transparent',
        className,
      )}>
        {/* Left: exit */}
        <button
          onClick={handleExit}
          className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-colors"
        >
          ←
        </button>

        {/* Center: turn indicator */}
        <motion.div
          animate={{ scale: isMyTurn ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: isMyTurn ? Infinity : 0, duration: 1.5 }}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-ui font-medium',
            isMyTurn ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/40' : 'bg-black/30 text-white/60',
          )}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: isMyTurn ? '#f6e05e' : 'rgba(255,255,255,0.4)' }}
          />
          {isMyTurn ? 'Your turn' : `${currentPlayerName}'s turn`}
          {turnNumber !== undefined && (
            <span className="text-xs opacity-60">#{turnNumber}</span>
          )}
        </motion.div>

        {/* Right: rules */}
        <button
          onClick={() => setShowRules(true)}
          className="w-9 h-9 rounded-full bg-black/30 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-colors font-bold"
        >
          ?
        </button>
      </div>

      <RulesModal gameId={gameId} isOpen={showRules} onClose={() => setShowRules(false)} />
    </>
  );
}
