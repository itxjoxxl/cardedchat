import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import CardStack from '@/components/card/CardStack';
import Hand from '@/components/hand/Hand';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';
import type { Suit } from '@/types';

const SUIT_SYMBOLS: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

export default function CrazyEightsBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [choosingSuit, setChoosingSuit] = useState(false);
  const [pendingCard, setPendingCard] = useState<string | null>(null);

  if (!state) return null;

  const ce = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localHand = localPlayer ? (ce.hands?.[localPlayer.id] ?? []) : [];
  const drawPile = ce.drawPile ?? [];
  const discardPile = ce.discardPile ?? [];
  const topCard = discardPile[discardPile.length - 1];
  const currentSuit: Suit = ce.currentSuit ?? topCard?.suit ?? 'spades';
  const direction = ce.direction === 1 ? '↻' : '↺';

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  function handlePlayCard(cardId: string) {
    const card = localHand.find((c: any) => c.id === cardId);
    if (card?.rank === '8') { setPendingCard(cardId); setChoosingSuit(true); }
    else doAction({ type: 'play', payload: { cardId } });
  }

  return (
    <div className="relative w-full h-full bg-felt flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Opponents */}
      <div className="flex justify-around pt-20 pb-2 px-4">
        {opponents.map((opp: any) => {
          const oppHand = ce.hands?.[opp.id] ?? [];
          return (
            <div key={opp.id} className="flex flex-col items-center gap-1">
              <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={state.players[state.currentPlayerIndex]?.id === opp.id} />
              <div className="text-xs text-white/40 font-ui">{oppHand.length} cards</div>
            </div>
          );
        })}
      </div>

      {/* Direction */}
      <div className="text-center text-white/40 text-xl">{direction}</div>

      {/* Center */}
      <div className="flex justify-center items-center gap-6 py-3">
        <CardStack cards={drawPile} label="Draw" faceUp={false} onClick={isMyTurn && legalActions.some((a: any) => a.type === 'draw') ? () => doAction({ type: 'draw', payload: {} }) : undefined} size="md" />
        <div className="relative">
          {topCard && <Card card={topCard} faceUp size="lg" />}
          {/* Suit indicator */}
          <div className={cn('absolute -bottom-6 left-1/2 -translate-x-1/2 text-2xl', currentSuit === 'hearts' || currentSuit === 'diamonds' ? 'text-red-400' : 'text-white/80')}>
            {SUIT_SYMBOLS[currentSuit]}
          </div>
        </div>
      </div>

      {/* Player hand */}
      <div className="flex-1 flex flex-col items-center justify-center mt-4">
        <Hand
          cards={localHand}
          playerId={localPlayer?.id ?? ''}
          isLocal
          faceUp
          onCardClick={isMyTurn ? handlePlayCard : undefined}
          size="md"
        />
      </div>

      {/* Suit chooser */}
      <AnimatePresence>
        {choosingSuit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-30"
          >
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-felt-dark rounded-3xl p-6 flex flex-col items-center gap-4">
              <p className="text-white font-bold font-ui">Choose a suit</p>
              <div className="grid grid-cols-2 gap-3">
                {(['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).map((suit) => (
                  <button
                    key={suit}
                    onClick={() => { doAction({ type: 'play', payload: { cardId: pendingCard, chosenSuit: suit } }); setChoosingSuit(false); setPendingCard(null); }}
                    className={cn('w-20 h-16 rounded-2xl bg-black/40 border-2 border-white/20 text-3xl flex items-center justify-center', (suit === 'hearts' || suit === 'diamonds') ? 'text-red-400' : 'text-white')}
                  >
                    {SUIT_SYMBOLS[suit]}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ResultOverlay
        visible={gameOver}
        winners={winners}
        isLocalPlayerWinner={isWinner}
        scores={state.scores}
        players={state.players}
        onPlayAgain={restart}
        onExit={() => navigate('/')}
      />
    </div>
  );
}
