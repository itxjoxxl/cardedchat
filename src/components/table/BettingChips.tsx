import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface BettingChipsProps {
  amount: number;
  className?: string;
  label?: string;
}

const CHIP_DENOMS = [
  { value: 100, color: '#2d3748', label: '100' },
  { value: 25, color: '#3182ce', label: '25' },
  { value: 10, color: '#38a169', label: '10' },
  { value: 5, color: '#e53e3e', label: '5' },
  { value: 1, color: '#f7fafc', textColor: '#1a1a1a', label: '1' },
];

function getChips(amount: number) {
  const chips: typeof CHIP_DENOMS = [];
  let rem = amount;
  for (const denom of CHIP_DENOMS) {
    while (rem >= denom.value && chips.length < 8) {
      chips.push(denom);
      rem -= denom.value;
    }
  }
  return chips;
}

export default function BettingChips({ amount, className, label }: BettingChipsProps) {
  const chips = getChips(Math.min(amount, 500));

  if (amount === 0) return null;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative h-8 flex items-end">
        {chips.map((chip, i) => (
          <motion.div
            key={i}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="absolute w-8 h-3.5 rounded-sm shadow-chip border-b-2"
            style={{
              backgroundColor: chip.color,
              bottom: i * 3,
              left: 0,
              borderBottomColor: 'rgba(0,0,0,0.3)',
            }}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-yellow-400 font-ui">${amount}</span>
      {label && <span className="text-[10px] text-white/40 font-ui">{label}</span>}
    </div>
  );
}
