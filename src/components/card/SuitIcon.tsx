import { Suit } from '@/types';

interface SuitIconProps {
  suit: Suit;
  size?: number;
  className?: string;
}

export default function SuitIcon({ suit, size = 16, className }: SuitIconProps) {
  const color = suit === 'hearts' || suit === 'diamonds' ? '#c8102e' : '#1a1a1a';

  const paths: Record<Suit, JSX.Element> = {
    spades: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
        <path d="M12 2C12 2 2 9 2 14.5C2 17.5 4.5 20 7.5 20C9.2 20 10.7 19.1 12 17.5C13.3 19.1 14.8 20 16.5 20C19.5 20 22 17.5 22 14.5C22 9 12 2 12 2ZM12 20C11.4 21.2 10.5 22 9 22H15C13.5 22 12.6 21.2 12 20Z" />
      </svg>
    ),
    hearts: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" />
      </svg>
    ),
    diamonds: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
        <path d="M12 2L2 12L12 22L22 12L12 2Z" />
      </svg>
    ),
    clubs: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
        <path d="M12 2C9.79 2 8 3.79 8 6C8 7.07 8.43 8.03 9.13 8.74C7.32 9.14 6 10.68 6 12.5C6 14.71 7.79 16.5 10 16.5C10.55 16.5 11.07 16.38 11.54 16.17L11 18H13L12.46 16.17C12.93 16.38 13.45 16.5 14 16.5C16.21 16.5 18 14.71 18 12.5C18 10.68 16.68 9.14 14.87 8.74C15.57 8.03 16 7.07 16 6C16 3.79 14.21 2 12 2ZM10 19C9.45 19 9 19.45 9 20V22H15V20C15 19.45 14.55 19 14 19H10Z" />
      </svg>
    ),
  };

  return paths[suit];
}
