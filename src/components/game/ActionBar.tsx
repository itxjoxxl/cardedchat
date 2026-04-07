import { GameAction } from '@/types';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface ActionItem {
  label: string;
  action: GameAction;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
}

interface ActionBarProps {
  actions: ActionItem[];
  onAction: (action: GameAction) => void;
  className?: string;
}

export default function ActionBar({ actions, onAction, className }: ActionBarProps) {
  if (actions.length === 0) return null;

  return (
    <div className={cn(
      'absolute bottom-0 left-0 right-0 z-20 safe-bottom',
      'bg-gradient-to-t from-black/60 to-transparent',
      'px-4 pb-4 pt-8',
      className,
    )}>
      <div className={cn(
        'flex gap-2 justify-center',
        actions.length > 3 && 'overflow-x-auto pb-1 scrollbar-thin',
      )}>
        {actions.map((item, i) => (
          <Button
            key={i}
            variant={item.variant ?? (i === 0 ? 'gold' : 'secondary')}
            size="md"
            disabled={item.disabled}
            onClick={() => onAction(item.action)}
            className="flex-shrink-0 min-w-[80px]"
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
