import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/types';
import Button from '@/components/ui/Button';
import { resultVariants } from '@/animations/table-variants';
import { cn } from '@/lib/cn';

interface ResultOverlayProps {
  visible: boolean;
  winners: Player[];
  isLocalPlayerWinner: boolean;
  scores?: Record<string, number>;
  players?: Player[];
  onPlayAgain: () => void;
  onExit: () => void;
}

const CONFETTI = ['🎉', '🎊', '⭐', '🏆', '✨', '🎯', '💎', '🌟'];

export default function ResultOverlay({
  visible,
  winners,
  isLocalPlayerWinner,
  scores,
  players,
  onPlayAgain,
  onExit,
}: ResultOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            variants={resultVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mx-6 w-full max-w-sm bg-felt-dark border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl"
          >
            {/* Confetti burst */}
            {isLocalPlayerWinner && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                {CONFETTI.map((emoji, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 0, x: `${(i / CONFETTI.length) * 100}%`, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: [-20, -80 - Math.random() * 60],
                      scale: [0, 1.2, 0.8],
                      rotate: Math.random() * 360,
                    }}
                    transition={{ delay: i * 0.1, duration: 1.2 }}
                    className="absolute top-8 text-2xl"
                  >
                    {emoji}
                  </motion.span>
                ))}
              </div>
            )}

            {/* Title */}
            <div className="text-center">
              {isLocalPlayerWinner ? (
                <>
                  <div className="text-5xl mb-2">🏆</div>
                  <h2 className="text-3xl font-bold text-yellow-400 font-card">You Win!</h2>
                  <p className="text-white/60 mt-1 font-ui">Excellent play!</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-2">
                    {winners[0]?.avatar ?? '🤖'}
                  </div>
                  <h2 className="text-2xl font-bold text-white font-card">
                    {winners[0]?.name ?? 'Bot'} Wins!
                  </h2>
                  <p className="text-white/60 mt-1 font-ui">Better luck next time!</p>
                </>
              )}
            </div>

            {/* Scores */}
            {scores && players && (
              <div className="w-full bg-black/20 rounded-2xl p-4 flex flex-col gap-2">
                <h3 className="text-xs text-white/50 uppercase tracking-wider font-ui mb-1">Final Scores</h3>
                {players
                  .slice()
                  .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{p.avatar}</span>
                        <span className="text-sm text-white font-ui">{p.name}</span>
                      </div>
                      <span className={cn(
                        'text-sm font-bold font-ui',
                        winners.some((w) => w.id === p.id) ? 'text-yellow-400' : 'text-white/60',
                      )}>
                        {scores[p.id] ?? 0}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <Button variant="secondary" onClick={onExit} className="flex-1">
                Exit
              </Button>
              <Button variant="gold" onClick={onPlayAgain} className="flex-1">
                Play Again
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
