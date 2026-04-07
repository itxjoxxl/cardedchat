import { useState } from 'react';
import { useProfileStore } from '@/store/profileStore';
import { joinRoom } from '@/lib/realtime';
import { useRoomStore } from '@/store/roomStore';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface RoomJoinProps {
  onJoined: (code: string) => void;
}

export default function RoomJoin({ onJoined }: RoomJoinProps) {
  const { profile } = useProfileStore();
  const { setRoom } = useRoomStore();
  const { showToast } = useUIStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    if (!profile) return;
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) { setError('Code must be 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const player = { id: profile.id, name: profile.name, avatar: profile.avatar, isBot: false, isLocal: true, seatIndex: 0 };
      const room = await joinRoom(trimmed, player);
      if (room) {
        setRoom(room);
        onJoined(trimmed);
      } else {
        // Offline - just navigate with the code
        showToast('Supabase not configured — joining locally', 'info');
        onJoined(trimmed);
      }
    } catch {
      showToast('Room not found', 'error');
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Room Code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="ABCDEF"
        error={error}
        className="text-center text-2xl font-mono tracking-widest uppercase"
        maxLength={6}
        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
      />
      <Button variant="gold" size="lg" loading={loading} onClick={handleJoin} fullWidth disabled={code.length !== 6}>
        🚪 Join Room
      </Button>
    </div>
  );
}
