import { cn } from '@/lib/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  emoji: string;
  name?: string;
  size?: AvatarSize;
  isCurrentTurn?: boolean;
  isOnline?: boolean;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { container: string; emoji: string; indicator: string }> = {
  xs: { container: 'w-7 h-7', emoji: 'text-sm', indicator: 'w-2 h-2' },
  sm: { container: 'w-9 h-9', emoji: 'text-lg', indicator: 'w-2.5 h-2.5' },
  md: { container: 'w-11 h-11', emoji: 'text-2xl', indicator: 'w-3 h-3' },
  lg: { container: 'w-14 h-14', emoji: 'text-3xl', indicator: 'w-3.5 h-3.5' },
  xl: { container: 'w-20 h-20', emoji: 'text-5xl', indicator: 'w-4 h-4' },
};

export default function Avatar({ emoji, name, size = 'md', isCurrentTurn, isOnline, className }: AvatarProps) {
  const s = sizeClasses[size];

  return (
    <div className={cn('relative flex flex-col items-center gap-1', className)}>
      <div className={cn(
        'relative rounded-full bg-felt-dark flex items-center justify-center select-none',
        'border-2 transition-all duration-300',
        s.container,
        isCurrentTurn
          ? 'border-yellow-400 shadow-glow animate-pulse-gold'
          : 'border-white/20',
      )}>
        <span className={s.emoji}>{emoji}</span>
        {isOnline !== undefined && (
          <span className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-felt-dark',
            s.indicator,
            isOnline ? 'bg-green-400' : 'bg-gray-500',
          )} />
        )}
      </div>
      {name && (
        <span className="text-xs text-white/70 font-ui max-w-[60px] truncate text-center">{name}</span>
      )}
    </div>
  );
}
