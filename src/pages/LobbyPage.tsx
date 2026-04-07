import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import BotConfig from '@/components/lobby/BotConfig';
import RoomCreate from '@/components/lobby/RoomCreate';
import RoomJoin from '@/components/lobby/RoomJoin';
import RulesModal from '@/components/lobby/RulesModal';
import Button from '@/components/ui/Button';
import { getGame } from '@/games/registry';
import { useProfileStore } from '@/store/profileStore';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/cn';

type Tab = 'bots' | 'online';

export default function LobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const { startGame } = useGameStore();
  const [tab, setTab] = useState<Tab>('bots');
  const game = gameId ? getGame(gameId) : null;

  // Default bots = enough to meet minPlayers (user counts as 1)
  const minBots = Math.max(0, (game?.minPlayers ?? 1) - 1);
  const maxBots = Math.max(minBots, Math.min((game?.maxPlayers ?? 1) - 1, 5));
  const [botCount, setBotCount] = useState(minBots);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    setBotCount(minBots);
  }, [minBots]);

  if (!game || !gameId) {
    return <div className="text-white p-8">Game not found</div>;
  }

  const isSolo = game.maxPlayers === 1;

  function handleStartLocal() {
    if (!profile || !game) return;
    const localPlayer = { id: profile.id, name: profile.name, avatar: profile.avatar, isBot: false, isLocal: true, seatIndex: 0 };
    const bots = Array.from({ length: botCount }, (_, i) => ({
      id: `bot-${i}`,
      name: ['Alex', 'Sam', 'Jordan', 'Morgan', 'Casey'][i] ?? `Bot ${i + 1}`,
      avatar: ['🤖', '🎭', '🦊', '🐼', '🦁'][i] ?? '🤖',
      isBot: true,
      isLocal: false,
      seatIndex: i + 1,
    }));
    startGame(gameId as import('@/types/game').GameId, [localPlayer, ...bots]);
    navigate(`/game/${gameId}`);
  }

  return (
    <AppShell showBack title={game.name}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 px-4 pt-6 pb-8"
      >
        {/* Game header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl">{game.emoji}</span>
          <h1 className="text-xl font-bold text-white font-ui">{game.name}</h1>
          <p className="text-white/50 text-sm font-ui max-w-xs">{game.description}</p>
          <button onClick={() => setShowRules(true)} className="text-yellow-400 text-sm font-ui underline">
            View Rules
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-black/30 p-1 gap-1">
          {([['bots', '🤖 vs Bots'], ['online', '🌐 Online']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-medium font-ui transition-all',
                tab === t ? 'bg-felt text-white shadow' : 'text-white/50 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'bots' ? (
          <div className="flex flex-col gap-5">
            {!isSolo && (
              <BotConfig
                minBots={minBots}
                maxBots={maxBots}
                botCount={botCount}
                onBotCountChange={setBotCount}
              />
            )}
            <Button variant="gold" size="lg" onClick={handleStartLocal} fullWidth>
              🎮 Start Game
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-medium text-white/60 font-ui mb-3">Create a Room</h3>
              <RoomCreate gameId={gameId} onCreated={(code) => navigate(`/room/${code}`)} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs font-ui">or join</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/60 font-ui mb-3">Join a Room</h3>
              <RoomJoin onJoined={(code) => navigate(`/room/${code}`)} />
            </div>
          </div>
        )}
      </motion.div>

      <RulesModal gameId={gameId} isOpen={showRules} onClose={() => setShowRules(false)} />
    </AppShell>
  );
}
