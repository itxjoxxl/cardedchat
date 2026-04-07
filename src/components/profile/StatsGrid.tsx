import { useProfileStore } from '@/store/profileStore';
import { GAMES } from '@/games/registry';
import { cn } from '@/lib/cn';

export default function StatsGrid() {
  const { stats } = useProfileStore();
  const gamesWithStats = GAMES.map((g) => ({ game: g, stat: stats[g.id] })).filter((x) => x.stat?.played > 0);

  if (gamesWithStats.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 font-ui">
        <div className="text-4xl mb-2">🎮</div>
        <p>Play some games to see your stats!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {gamesWithStats.map(({ game, stat }) => {
        if (!stat) return null;
        const winRate = stat.played > 0 ? Math.round((stat.won / stat.played) * 100) : 0;
        return (
          <div key={game.id} className="bg-felt-dark/60 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{game.emoji}</span>
                <span className="text-sm font-medium text-white font-ui">{game.name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-yellow-400 font-bold font-ui">
                🔥 {stat.streak}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400 font-ui">{stat.won}</div>
                <div className="text-[10px] text-white/40 font-ui uppercase">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-400 font-ui">{stat.lost}</div>
                <div className="text-[10px] text-white/40 font-ui uppercase">Losses</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white/60 font-ui">{stat.played}</div>
                <div className="text-[10px] text-white/40 font-ui uppercase">Played</div>
              </div>
            </div>
            {/* Win rate bar */}
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/30 font-ui mt-1">
              <span>Win rate</span>
              <span>{winRate}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
