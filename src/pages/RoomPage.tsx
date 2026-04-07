import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRoomStore } from '@/store/roomStore';
import { useGameStore } from '@/store/gameStore';
import { useProfileStore } from '@/store/profileStore';
import { useRoom } from '@/hooks/useRoom';
import AppShell from '@/components/layout/AppShell';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room } = useRoomStore();
  const { profile } = useProfileStore();
  const gameState = useGameStore((s) => s.state);

  // Wire up realtime subscriptions, ready, and startGame
  const { setReady, startGame, isHost } = useRoom(code);

  const [starting, setStarting] = useState(false);
  const [readyClicked, setReadyClicked] = useState(false);

  const players = room?.players ?? [];
  const allReady =
    players.length > 1 &&
    players.filter((p) => p.playerId !== room?.hostPlayerId).every((p) => p.isReady);

  // Navigate to game once engine has initialised (status leaves 'idle')
  useEffect(() => {
    if (gameState && gameState.status !== 'idle' && room?.gameId) {
      navigate(`/game/${room.gameId}`);
    }
  }, [gameState, room?.gameId, navigate]);

  async function handleStartGame() {
    if (!room) return;
    setStarting(true);
    try {
      await startGame();
      // Host is also navigated via the useEffect above once gameState updates
    } catch {
      setStarting(false);
    }
  }

  async function handleReady() {
    setReadyClicked(true);
    await setReady();
  }

  return (
    <AppShell showBack title={`Room ${code}`}>
      <div className="flex flex-col gap-6 px-4 pt-6 pb-8">
        {/* Room code display */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/50 text-sm font-ui">Share this code with friends</p>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-black/40 rounded-2xl px-8 py-3 text-3xl font-mono font-bold text-yellow-400 tracking-widest border border-yellow-400/20"
          >
            {code}
          </motion.div>
          <button
            onClick={() => {
              if (code) navigator.clipboard.writeText(code);
            }}
            className="text-yellow-400/70 text-xs font-ui underline hover:text-yellow-400 transition-colors"
          >
            Copy code
          </button>
        </div>

        {/* Player list */}
        <div>
          <h3 className="text-sm text-white/50 font-ui uppercase tracking-widest mb-3">
            Players ({players.length}/{room?.maxPlayers ?? '?'})
          </h3>
          <div className="flex flex-col gap-2">
            {players.length === 0 ? (
              <div className="text-center py-8 text-white/30 font-ui text-sm">
                Waiting for players to join...
              </div>
            ) : (
              players.map((p, i) => {
                const isMe = p.playerId === profile?.id;
                const isRoomHost = p.playerId === room?.hostPlayerId;
                const ready = p.isReady || isRoomHost;
                return (
                  <motion.div
                    key={p.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl p-3 border',
                      isMe
                        ? 'bg-yellow-500/10 border-yellow-400/20'
                        : 'bg-felt-dark/60 border-white/10',
                    )}
                  >
                    <Avatar emoji={p.avatar} size="md" />
                    <div className="flex-1">
                      <p className="text-white font-medium font-ui">
                        {p.name}
                        {isMe && <span className="text-yellow-400 text-xs ml-1">(you)</span>}
                      </p>
                      {isRoomHost && (
                        <p className="text-yellow-400 text-xs font-ui">Host</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-ui',
                        ready ? 'text-green-400' : 'text-white/30',
                      )}
                    >
                      {ready ? '✓ Ready' : '…'}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {isHost ? (
            <Button
              variant="gold"
              size="lg"
              fullWidth
              loading={starting}
              disabled={players.length < 2 || starting}
              onClick={handleStartGame}
            >
              {players.length < 2
                ? 'Waiting for players…'
                : allReady
                ? '🎮 Start Game'
                : '🎮 Start Anyway'}
            </Button>
          ) : (
            <Button
              variant={readyClicked ? 'secondary' : 'gold'}
              size="lg"
              fullWidth
              disabled={readyClicked}
              onClick={handleReady}
            >
              {readyClicked ? '✓ Ready!' : 'I\'m Ready'}
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/')}>
            Leave Room
          </Button>
        </div>

        {/* Waiting indicator */}
        {starting && (
          <div className="text-center text-white/50 text-sm font-ui animate-pulse">
            Starting game…
          </div>
        )}
      </div>
    </AppShell>
  );
}
