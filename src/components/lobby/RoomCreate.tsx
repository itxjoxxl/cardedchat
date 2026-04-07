import { useState } from 'react';
import { useProfileStore } from '@/store/profileStore';
import { useRoomStore } from '@/store/roomStore';
import { createRoom, generateRoomCode } from '@/lib/realtime';
import { getGame } from '@/games/registry';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';

interface RoomCreateProps {
  gameId: string;
  onCreated: (code: string) => void;
}

export default function RoomCreate({ gameId, onCreated }: RoomCreateProps) {
  const { profile } = useProfileStore();
  const { setRoom } = useRoomStore();
  const { showToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const game = getGame(gameId);
  const maxPlayers = game?.maxPlayers ?? 6;

  async function handleCreate() {
    if (!profile) return;
    setLoading(true);
    try {
      const roomCode = generateRoomCode();
      const hostPlayer = { id: profile.id, name: profile.name, avatar: profile.avatar, isBot: false, isLocal: true, seatIndex: 0 };
      const room = await createRoom(gameId, hostPlayer, maxPlayers);
      if (room) {
        setRoom(room);
        setCode(room.code);
        onCreated(room.code);
      } else {
        // Offline mode - just create a local code
        setCode(roomCode);
        onCreated(roomCode);
        showToast('Supabase not configured — using offline mode', 'info');
      }
    } catch {
      showToast('Failed to create room', 'error');
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {code ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/60 text-sm font-ui">Room created! Share this code:</p>
          <div className="bg-black/40 rounded-2xl px-8 py-4 text-4xl font-mono font-bold text-yellow-400 tracking-widest">
            {code}
          </div>
          <p className="text-white/30 text-xs font-ui text-center">Ask friends to enter this code to join your room</p>
          <button
            onClick={() => { navigator.clipboard.writeText(code); showToast('Code copied!', 'success'); }}
            className="text-yellow-400 text-sm font-ui underline"
          >
            Copy code
          </button>
        </div>
      ) : (
        <Button variant="gold" size="lg" loading={loading} onClick={handleCreate} fullWidth>
          🏠 Create Room
        </Button>
      )}
    </div>
  );
}
