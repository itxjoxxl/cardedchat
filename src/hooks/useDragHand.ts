import { useRef, useState, useCallback } from 'react';
import { useDrag } from '@use-gesture/react';
import type { Card } from '@/types/card';

interface DragHandResult {
  displayOrder: Card[];
  getDragProps: (index: number) => ReturnType<typeof useDrag>;
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Enables touch/mouse drag-to-reorder for a hand of cards.
 *
 * `getDragProps(index)` returns the bind() result from @use-gesture/react's
 * useDrag — spread it onto the card element.
 */
export function useDragHand(
  cards: Card[],
  onReorder: (newOrder: Card[]) => void,
  disabled?: boolean
): DragHandResult {
  const containerRef = useRef<HTMLDivElement>(null!);
  const [displayOrder, setDisplayOrder] = useState<Card[]>(() => [...cards]);
  const draggingIndexRef = useRef<number | null>(null);
  // Track the last committed order so we can restore on cancel
  const committedRef = useRef<Card[]>([...cards]);

  // Keep displayOrder in sync when cards prop changes externally
  // (e.g. after a card is played)
  const prevCardsRef = useRef<Card[]>(cards);
  if (prevCardsRef.current !== cards) {
    prevCardsRef.current = cards;
    committedRef.current = [...cards];
    setDisplayOrder([...cards]);
  }

  /** Reorder array by moving item at `from` to position `to`. */
  function reorder(arr: Card[], from: number, to: number): Card[] {
    if (from === to) return arr;
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  /** Given pointer X within the container, return the target card index. */
  function pointerToIndex(pointerX: number, containerEl: HTMLElement): number {
    const rect = containerEl.getBoundingClientRect();
    const relX = pointerX - rect.left;
    const cardCount = displayOrder.length;
    if (cardCount === 0) return 0;
    const fraction = Math.min(Math.max(relX / rect.width, 0), 0.9999);
    return Math.floor(fraction * cardCount);
  }

  const bind = useDrag(
    ({ args: [startIndex], active, xy: [pointerX], last }) => {
      const containerEl = containerRef.current;
      if (!containerEl) return;

      if (active) {
        draggingIndexRef.current = startIndex as number;
        const targetIndex = pointerToIndex(pointerX, containerEl);
        const reordered = reorder(
          committedRef.current,
          startIndex as number,
          targetIndex
        );
        setDisplayOrder(reordered);
      }

      if (last) {
        const targetIndex = pointerToIndex(pointerX, containerEl);
        const reordered = reorder(
          committedRef.current,
          startIndex as number,
          targetIndex
        );
        committedRef.current = reordered;
        setDisplayOrder(reordered);
        draggingIndexRef.current = null;
        onReorder(reordered);
      }

      if (!active && draggingIndexRef.current !== null && !last) {
        // Restore on cancel
        setDisplayOrder([...committedRef.current]);
        draggingIndexRef.current = null;
      }
    },
    {
      filterTaps: true,
      threshold: 6,
    }
  );

  const getDragProps = useCallback(
    (index: number) => bind(index),
    [bind]
  );

  return {
    displayOrder,
    getDragProps,
    containerRef,
  };
}
