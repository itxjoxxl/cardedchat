import { useGameStore } from '@/store/gameStore';
import { BotDifficulty } from '@/types';
import { cn } from '@/lib/cn';

const DIFFICULTIES: { value: BotDifficulty; label: string; emoji: string; desc: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '😊', desc: 'Relaxed play' },
  { value: 'medium', label: 'Medium', emoji: '😐', desc: 'A real challenge' },
  { value: 'hard', label: 'Hard', emoji: '😤', desc: 'Bring your A game' },
];

interface BotConfigProps {
  minBots: number;
  maxBots: number;
  botCount: number;
  onBotCountChange: (n: number) => void;
}

export default function BotConfig({ minBots, maxBots, botCount, onBotCountChange }: BotConfigProps) {
  const { botDifficulty, setBotDifficulty } = useGameStore();
  const range = Array.from({ length: Math.max(0, maxBots - minBots + 1) }, (_, i) => minBots + i).filter((n) => n >= 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Number of bots */}
      <div>
        <label className="text-sm text-white/60 font-ui mb-2 block">Number of Opponents</label>
        <div className="flex gap-2 flex-wrap">
          {range.map((n) => (
            <button
              key={n}
              onClick={() => onBotCountChange(n)}
              className={cn(
                'w-10 h-10 rounded-xl font-bold text-sm transition-all font-ui',
                botCount === n
                  ? 'bg-yellow-500 text-yellow-900'
                  : 'bg-black/30 text-white/60 hover:bg-white/10',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="text-sm text-white/60 font-ui mb-2 block">Bot Difficulty</label>
        <div className="flex flex-col gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setBotDifficulty(d.value)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border transition-all text-left',
                botDifficulty === d.value
                  ? 'bg-yellow-500/15 border-yellow-500/50 text-white'
                  : 'bg-black/20 border-white/10 text-white/60 hover:bg-white/5',
              )}
            >
              <span className="text-xl">{d.emoji}</span>
              <div>
                <div className="font-medium text-sm font-ui">{d.label}</div>
                <div className="text-xs text-white/40 font-ui">{d.desc}</div>
              </div>
              {botDifficulty === d.value && (
                <span className="ml-auto text-yellow-400 text-sm">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
