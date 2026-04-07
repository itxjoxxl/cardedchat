import type { Variants } from 'framer-motion';

export {
  cardVariants,
  deckVariants,
  handContainerVariants,
} from './card-variants';

export {
  tableVariants,
  overlayVariants,
  resultVariants,
  chipVariants,
} from './table-variants';

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const slideInVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};
