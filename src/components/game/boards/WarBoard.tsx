import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import type { BoardProps } from '../GameBoard';

export default function WarBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);

  if (!state) return null;

  const war = state as any;
  const phase = war.phase;
  const playerDecks = war.playerDecks ?? [[], []];
  const flippedCards: [any, any] = war.flippedCards ?? [null, null];
  const warPile = war.warPile ?? [];
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponentPlayer = state.players.find((p: any) => !p.isLocal);
  const localIdx = localPlayer ? state.players.indexOf(localPlayer) : 0;
  const oppIdx = opponentPlayer ? state.players.indexOf(opponentPlayer) : 1;
  const localDeck = playerDecks[localIdx] ?? [];
  const oppDeck = playerDecks[oppIdx] ?? [];
  const localFlippedCard = flippedCards[localIdx];
  const oppFlippedCard = flippedCards[oppIdx];
  const isWar = phase === 'war';
  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  return (
    <div className="relative w-full h-full bg-felt flex flex-col items-center overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Opponent pile */}
      <div className="flex flex-col items-center pt-20 gap-2">
        <div className="text-white/50 text-xs font-ui uppercase tracking-widest">{opponentPlayer?.name ?? 'Bot'}</div>
        <div className="w-[70px] h-[98px] rounded-xl border-2 border-white/20 flex items-center justify-center">
          {oppDeck.length > 0 && <Card card={oppDeck[0]} faceUp={false} size="md" />}
        </div>
        <div className="text-white/40 text-xs font-ui">{oppDeck.length} cards</div>
      </div>

      {/* Battle area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AnimatePresence>
          {isWar && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-3xl font-bold text-red-400 font-card tracking-widest"
            >
              ⚔️ WAR! ⚔️
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-8 items-center">
          {oppFlippedCard && (
            <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Card card={oppFlippedCard} faceUp={true} size="lg" />
            </motion.div>
          )}
          <div className="text-white/30 text-2xl">VS</div>
          {localFlippedCard && (
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Card card={localFlippedCard} faceUp={true} size="lg" />
            </motion.div>
          )}
        </div>

        {warPile.length > 0 && (
          <div className="text-white/50 text-sm font-ui">{warPile.length} cards at war</div>
        )}
      </div>

      {/* Player pile */}
      <div className="flex flex-col items-center gap-2 pb-24">
        <div className="text-white/40 text-xs font-ui">{localDeck.length} cards</div>
        <div className="w-[70px] h-[98px] rounded-xl border-2 border-white/20 flex items-center justify-center">
          {localDeck.length > 0 && <Card card={localDeck[0]} faceUp={false} size="md" />}
        </div>
        <div className="text-white/50 text-xs font-ui uppercase tracking-widest">You</div>
      </div>

      {/* Action */}
      {isMyTurn && legalActions.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6">
          <Button variant="gold" size="lg" onClick={() => doAction(legalActions[0])} className="w-full max-w-xs">
            {phase === 'flip' ? '🃏 Flip Card' : 'Collect Winnings'}
          </Button>
        </div>
      )}

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
