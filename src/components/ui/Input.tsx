import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-white/80 font-ui">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl px-4 py-3 text-white font-ui text-base',
            'bg-felt-dark/80 border border-white/15',
            'placeholder:text-white/30',
            'focus:outline-none focus:border-yellow-400 focus:bg-felt-dark',
            'transition-colors duration-150',
            'min-h-[48px]',
            error && 'border-red-500 focus:border-red-400',
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400 font-ui">{error}</p>}
        {hint && !error && <p className="text-sm text-white/40 font-ui">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
