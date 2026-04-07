import { cn } from '@/lib/cn';

interface GameLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function GameLayout({ children, className }: GameLayoutProps) {
  return (
    <div className={cn('w-full h-full relative overflow-hidden', className)}>
      {children}
    </div>
  );
}
