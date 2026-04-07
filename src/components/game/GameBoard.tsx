import { lazy, Suspense } from 'react';
import Spinner from '@/components/ui/Spinner';

export interface BoardProps {
  gameId: string;
}

const BOARD_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<BoardProps>>> = {
  'blackjack': lazy(() => import('./boards/BlackjackBoard')),
  'war': lazy(() => import('./boards/WarBoard')),
  'go-fish': lazy(() => import('./boards/GoFishBoard')),
  'crazy-eights': lazy(() => import('./boards/CrazyEightsBoard')),
  'solitaire': lazy(() => import('./boards/SolitaireBoard')),
  'old-maid': lazy(() => import('./boards/OldMaidBoard')),
  'snap': lazy(() => import('./boards/SnapBoard')),
  'five-card-draw': lazy(() => import('./boards/FiveCardDrawBoard')),
  'texas-holdem': lazy(() => import('./boards/TexasHoldemBoard')),
  'rummy': lazy(() => import('./boards/RummyBoard')),
  'gin-rummy': lazy(() => import('./boards/GinRummyBoard')),
  'uno': lazy(() => import('./boards/UnoBoard')),
  'hearts': lazy(() => import('./boards/HeartsBoard')),
  'spades': lazy(() => import('./boards/SpadesBoard')),
};

function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <Spinner size="lg" />
    </div>
  );
}

export default function GameBoard({ gameId }: BoardProps) {
  const Board = BOARD_MAP[gameId];

  if (!Board) {
    return (
      <div className="flex items-center justify-center h-full text-white/60 font-ui">
        Game not found: {gameId}
      </div>
    );
  }

  return (
    <Suspense fallback={<Loading />}>
      <Board gameId={gameId} />
    </Suspense>
  );
}
