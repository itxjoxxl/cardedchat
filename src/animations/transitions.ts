export const cardSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 35,
  mass: 0.8,
};

export const fastSpring = {
  type: 'spring' as const,
  stiffness: 600,
  damping: 40,
  mass: 0.6,
};

export const slowSpring = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 30,
  mass: 1,
};

export const dealTween = {
  type: 'tween' as const,
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export const flipTransition = {
  type: 'tween' as const,
  duration: 0.35,
  ease: 'easeInOut' as const,
};

export const overlayTransition = {
  type: 'tween' as const,
  duration: 0.2,
  ease: 'easeOut' as const,
};
