import { cn } from '@/lib/cn';

type BadgeVariant = 'red' | 'black' | 'gold' | 'green' | 'blue' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  red: 'bg-red-900/60 text-red-300 border-red-700/50',
  black: 'bg-gray-900/60 text-gray-300 border-gray-700/50',
  gold: 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50',
  green: 'bg-felt/60 text-green-300 border-felt-border',
  blue: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
  gray: 'bg-white/10 text-white/60 border-white/15',
};

export default function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border font-ui',
      variantClasses[variant],
      className,
    )}>
      {children}
    </span>
  );
}
