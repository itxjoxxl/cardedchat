import type { Variants } from 'framer-motion';

export const cardVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0, y: -20 },
  visible: { scale: 1, opacity: 1, y: 0 },
  hover: {
    y: -16,
    scale: 1.06,
    zIndex: 50,
    transition: { type: 'spring', stiffness: 500, damping: 30 },
  },
  selected: {
    y: -20,
    scale: 1.08,
    boxShadow: '0 0 0 3px #f6e05e, 0 8px 24px rgba(0,0,0,0.4)',
  },
  playing: {
    scale: [1, 1.2, 1],
    transition: { duration: 0.3 },
  },
  win: {
    scale: [1, 1.2, 1],
    rotate: [-5, 5, -5, 0],
    transition: { repeat: 1, duration: 0.5 },
  },
};

export const deckVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.03, y: -2 },
  tap: { scale: 0.97 },
};

export const handContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};
