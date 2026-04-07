import { Link, useNavigate } from 'react-router-dom';
import { useProfileStore } from '@/store/profileStore';
import { cn } from '@/lib/cn';

interface AppShellProps {
  children: React.ReactNode;
  showBack?: boolean;
  title?: string;
  className?: string;
}

export default function AppShell({ children, showBack, title, className }: AppShellProps) {
  const navigate = useNavigate();
  const { profile } = useProfileStore();

  return (
    <div className={cn('w-full h-full flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 safe-top flex-shrink-0 bg-felt-dark/80 border-b border-white/5">
        {/* Left */}
        <div className="w-10">
          {showBack && (
            <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white transition-colors text-xl">
              ←
            </button>
          )}
        </div>

        {/* Center */}
        {title ? (
          <h1 className="text-base font-bold text-white font-ui">{title}</h1>
        ) : (
          <Link to="/" className="text-xl font-bold text-yellow-400 font-card tracking-wider">
            CARDED
          </Link>
        )}

        {/* Right: Avatar */}
        <Link to="/profile" className="flex items-center gap-1">
          <span className="text-xl">{profile?.avatar ?? '👤'}</span>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 safe-bottom border-t border-white/5 bg-felt-dark/80">
        <div className="flex">
          <Link to="/" className="flex-1 flex flex-col items-center py-3 text-white/60 hover:text-white transition-colors">
            <span className="text-xl">🃏</span>
            <span className="text-[10px] font-ui mt-0.5">Games</span>
          </Link>
          <Link to="/profile" className="flex-1 flex flex-col items-center py-3 text-white/60 hover:text-white transition-colors">
            <span className="text-xl">👤</span>
            <span className="text-[10px] font-ui mt-0.5">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
