import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameLayout from '@/components/layout/GameLayout';
import GameBoard from '@/components/game/GameBoard';
import { useGameStore } from '@/store/gameStore';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const storeGameId = useGameStore((s) => s.gameId);
  const endGame = useGameStore((s) => s.endGame);
  const checkedRef = useRef(false);

  // Redirect home only on initial mount if there's no active game
  // (e.g. user typed the URL directly without going through the lobby)
  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      if (!storeGameId) {
        navigate('/', { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear game state when the user navigates away from the game screen
  useEffect(() => {
    return () => {
      endGame();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gameId) return null;

  return (
    <GameLayout>
      <GameBoard gameId={gameId} />
    </GameLayout>
  );
}
