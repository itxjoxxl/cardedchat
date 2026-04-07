import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import type { BoardProps } from '../GameBoard';

export default function SnapBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);

  if (!state) return null;

  const snap = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const playerDecks: Record<string, any[]> = snap.playerDecks ?? {};
  const centerPile: any[] = snap.centralPile ?? [];
  const topCard = centerPile[centerPile.length - 1];
  const prevCard = centerPile[centerPile.length - 2];
  const isSnap = topCard && prevCard && topCard.rank === prevCard.rank;
  const snapClaimed = snap.snapClaimed;

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  const canFlip = legalActions.some((a: any) => a.type === 'flip');
  const canSnap = legalActions.some((a: any) => a.type === 'snap');

  return (
    <div className="relative w-full h-full bg-felt flex flex-col items-center overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Opponent */}
      {opponents.map((opp: any) => {
        const deck = playerDecks[opp.id] ?? [];
        return (
          <div key={opp.id} className="flex flex-col items-center pt-20 gap-2">
            <Avatar emoji={opp.avatar} name={opp.name} size="sm" />
            <div className="w-[70px] h-[98px] rounded-xl border-2 border-white/20 flex items-center justify-center">
              {deck.length > 0 ? <Card card={deck[0]} faceUp={false} size="md" /> : <span className="text-white/20 text-xs">Empty</span>}
            </div>
            <div className="text-xs text-white/40 font-ui">{deck.length} cards</div>
          </div>
        );
      })}

      {/* Center pile */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 relative">
        {/* SNAP flash */}
        <AnimatePresence>
          {isSnap && !snapClaimed && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <span className="text-6xl font-black text-yellow-400 rotate-[-10deg] drop-shadow-2xl">SNAP!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          {topCard && (
            <motion.div
              key={topCard.id}
              initial={{ scale: 0.5, opacity: 0, y: -30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className={isSnap ? 'ring-4 ring-yellow-400 rounded-2xl animate-pulse' : ''}
            >
              <Card card={topCard} faceUp size="lg" />
            </motion.div>
          )}
          {!topCard && (
            <div className="w-[90px] h-[126px] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
              <span className="text-white/20 text-sm font-ui">Empty</span>
            </div>
          )}
        </div>
        <div className="text-white/40 text-sm font-ui">{centerPile.length} cards</div>
      </div>

      {/* SNAP button - prominent */}
      {canSnap && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => doAction({ type: 'snap', payload: { playerId: localPlayer?.id ?? '' } })}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white text-3xl font-black shadow-2xl border-4 border-red-300 active:from-red-600 active:to-red-800 flex items-center justify-center z-20"
        >
          SNAP!
        </motion.button>
      )}

      {/* Player deck + flip */}
      <div className="flex flex-col items-center pb-4 gap-2">
        {localPlayer && (
          <>
            <div className="text-xs text-white/40 font-ui">{(playerDecks[localPlayer.id] ?? []).length} cards</div>
            <Button
              variant="gold"
              size="lg"
              disabled={!canFlip}
              onClick={() => doAction({ type: 'flip', payload: {} })}
              className="w-full max-w-[200px]"
            >
              🃏 Flip Card
            </Button>
          </>
        )}
      </div>

      <ResultOverlay
        visible={gameOver}
        winners={winners}
        isLocalPlayerWinner={isWinner}
        players={state.players}
        onPlayAgain={restart}
        onExit={() => navigate('/')}
      />
    </div>
  );
}
