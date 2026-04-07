import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAMES, GameConfig } from '@/games/registry';
import GameCard from './GameCard';
import RulesModal from './RulesModal';
import { cn } from '@/lib/cn';

const CATEGORIES = ['All', 'poker', 'strategy', 'luck', 'casual', 'solo'] as const;

export default function GameSelector() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [rulesGame, setRulesGame] = useState<string | null>(null);

  const filtered = activeCategory === 'All'
    ? GAMES
    : GAMES.filter((g) => g.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium font-ui flex-shrink-0 capitalize transition-colors',
              activeCategory === cat
                ? 'bg-yellow-500 text-yellow-900'
                : 'bg-white/10 text-white/60 hover:bg-white/20',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onClick={() => navigate(`/lobby/${game.id}`)}
            onRulesClick={(e) => { e.stopPropagation(); setRulesGame(game.id); }}
          />
        ))}
      </div>

      {rulesGame && (
        <RulesModal
          gameId={rulesGame}
          isOpen={!!rulesGame}
          onClose={() => setRulesGame(null)}
        />
      )}
    </div>
  );
}
