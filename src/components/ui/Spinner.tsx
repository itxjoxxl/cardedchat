import { cn } from '@/lib/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-10 h-10 border-3',
};

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div className={cn(
      'rounded-full border-yellow-400 border-t-transparent animate-spin',
      sizeClasses[size],
      className,
    )} />
  );
}
