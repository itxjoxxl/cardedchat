import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRoomStore } from '@/store/roomStore';
import { useProfileStore } from '@/store/profileStore';
import AppShell from '@/components/layout/AppShell';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room } = useRoomStore();
  const { profile } = useProfileStore();

  const isHost = room?.hostPlayerId === profile?.id;
  const players = room?.players ?? [];
  const allReady = players.length > 1 && players.filter((p) => p.playerId !== room?.hostPlayerId).every((p) => p.isReady);

  return (
    <AppShell showBack title={`Room ${code}`}>
      <div className="flex flex-col gap-6 px-4 pt-6 pb-8">
        {/* Room code */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/50 text-sm font-ui">Share this code to invite friends</p>
          <div className="bg-black/40 rounded-2xl px-8 py-3 text-3xl font-mono font-bold text-yellow-400 tracking-widest">
            {code}
          </div>
        </div>

        {/* Players */}
        <div>
          <h3 className="text-sm text-white/50 font-ui uppercase tracking-widest mb-3">
            Players ({players.length}/{room?.maxPlayers ?? 6})
          </h3>
          <div className="flex flex-col gap-2">
            {players.length === 0 ? (
              <div className="text-center py-6 text-white/30 font-ui text-sm">Waiting for players to join...</div>
            ) : (
              players.map((p) => (
                <motion.div
                  key={p.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-felt-dark/60 rounded-2xl p-3 border border-white/10"
                >
                  <Avatar emoji={p.avatar} size="md" />
                  <div className="flex-1">
                    <p className="text-white font-medium font-ui">{p.name}</p>
                    {p.playerId === room?.hostPlayerId && (
                      <p className="text-yellow-400 text-xs font-ui">Host</p>
                    )}
                  </div>
                  <span className={cn('text-sm', p.isReady || p.playerId === room?.hostPlayerId ? 'text-green-400' : 'text-white/30')}>
                    {p.isReady || p.playerId === room?.hostPlayerId ? '✓ Ready' : '...'}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isHost ? (
            <Button
              variant="gold"
              size="lg"
              fullWidth
              disabled={players.length < 2}
              onClick={() => navigate(`/game/${room?.gameId}`)}
            >
              {players.length < 2 ? 'Waiting for players...' : '🎮 Start Game'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => {/* setReady */}}
            >
              ✓ Ready
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/')}>Leave Room</Button>
        </div>
      </div>
    </AppShell>
  );
}
