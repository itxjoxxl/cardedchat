import { cn } from '@/lib/cn';

type BackColor = 'blue' | 'red' | 'green' | 'purple';

interface CardBackProps {
  size?: 'sm' | 'md' | 'lg';
  color?: BackColor;
}

const colorConfig: Record<BackColor, { bg: string; stripe: string; center: string }> = {
  blue:   { bg: '#1e3a8a', stripe: '#1e40af', center: '#3b82f6' },
  red:    { bg: '#7f1d1d', stripe: '#991b1b', center: '#ef4444' },
  green:  { bg: '#14532d', stripe: '#166534', center: '#22c55e' },
  purple: { bg: '#4c1d95', stripe: '#5b21b6', center: '#8b5cf6' },
};

export default function CardBack({ size = 'md', color = 'blue' }: CardBackProps) {
  const cfg = colorConfig[color];

  return (
    <div
      className="absolute inset-0 rounded-[inherit] overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        backgroundColor: cfg.bg,
      }}
    >
      {/* Diagonal stripe pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            ${cfg.bg} 0px,
            ${cfg.bg} 3px,
            ${cfg.stripe} 3px,
            ${cfg.stripe} 7px
          )`,
        }}
      />
      {/* Center diamond */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-8 h-8 rotate-45 rounded-sm"
          style={{ backgroundColor: cfg.center, opacity: 0.4 }}
        />
      </div>
      {/* Border inset */}
      <div
        className="absolute inset-[4px] rounded-md"
        style={{ border: `2px solid ${cfg.center}`, opacity: 0.3 }}
      />
    </div>
  );
}
