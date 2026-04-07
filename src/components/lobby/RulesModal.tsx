import Modal from '@/components/ui/Modal';
import { getGame } from '@/games/registry';

interface RulesModalProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ gameId, isOpen, onClose }: RulesModalProps) {
  const game = getGame(gameId);
  if (!game) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${game.emoji} ${game.name} Rules`} size="lg">
      <div className="flex flex-col gap-5 font-ui">
        {/* Objective */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-yellow-400 mb-2">Objective</h3>
          <p className="text-white/80 text-sm leading-relaxed">{game.rules.objective}</p>
        </div>

        {/* How to Play */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-yellow-400 mb-2">How to Play</h3>
          <ol className="flex flex-col gap-2">
            {game.rules.howToPlay.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </span>
                <span className="text-white/70 text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Scoring */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-yellow-400 mb-2">Scoring</h3>
          <p className="text-white/70 text-sm leading-relaxed">{game.rules.scoring}</p>
        </div>

        {/* Tips */}
        {game.rules.tips.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-widest text-yellow-400 mb-2">💡 Tips</h3>
            <ul className="flex flex-col gap-2">
              {game.rules.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-white/60">
                  <span className="text-yellow-500 flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
