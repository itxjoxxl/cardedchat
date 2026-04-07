import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import UnoCardComponent from '@/components/card/UnoCardComponent';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';
import type { UnoColor } from '@/types';

const COLOR_STYLES: Record<string, string> = {
  red: 'bg-red-600 border-red-400',
  yellow: 'bg-yellow-400 border-yellow-200',
  green: 'bg-green-600 border-green-400',
  blue: 'bg-blue-600 border-blue-400',
};

export default function UnoBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [choosingColor, setChoosingColor] = useState(false);
  const [pendingCard, setPendingCard] = useState<string | null>(null);

  if (!state) return null;

  const uno = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localHand: any[] = localPlayer ? (uno.hands?.[localPlayer.id] ?? []) : [];
  const drawPile: any[] = uno.drawPile ?? [];
  const discardPile: any[] = uno.discardPile ?? [];
  const topCard = discardPile[discardPile.length - 1];
  const currentColor: UnoColor = uno.currentColor ?? 'red';
  const direction = uno.direction === 1 ? '→' : '←';
  const phase = uno.phase;

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  const colorBg: Record<UnoColor, string> = {
    red: 'bg-red-700',
    yellow: 'bg-yellow-500',
    green: 'bg-green-700',
    blue: 'bg-blue-700',
    wild: 'bg-purple-700',
  };

  function handlePlayCard(cardId: string) {
    const card = localHand.find((c: any) => c.id === cardId);
    if (!card) return;
    if (card.color === 'wild') {
      setPendingCard(cardId);
      setChoosingColor(true);
    } else {
      doAction({ type: 'play', payload: { cardId } });
    }
  }

  function handleChooseColor(color: UnoColor) {
    if (pendingCard) doAction({ type: 'play', payload: { cardId: pendingCard, chosenColor: color } });
    else doAction({ type: 'choose-color', payload: { color } });
    setChoosingColor(false);
    setPendingCard(null);
  }

  const hasUno = localHand.length === 2;

  return (
    <div className={cn('relative w-full h-full flex flex-col overflow-hidden transition-colors duration-500', colorBg[currentColor] + '/20', 'bg-felt')}>
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Opponents */}
      <div className="flex justify-around pt-20 pb-2 px-4">
        {opponents.map((opp: any) => {
          const oppHand = uno.hands?.[opp.id] ?? [];
          const isCurrent = state.players[state.currentPlayerIndex]?.id === opp.id;
          return (
            <div key={opp.id} className="flex flex-col items-center gap-1">
              <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={isCurrent} />
              <div className="text-xs text-white/50 font-ui">{oppHand.length} cards</div>
            </div>
          );
        })}
      </div>

      {/* Direction indicator */}
      <div className="text-center text-white/40 text-xs font-ui">{direction} {direction} {direction}</div>

      {/* Center: draw + discard */}
      <div className="flex justify-center items-center gap-6 py-4">
        {/* Draw pile */}
        <div
          className={cn('w-[70px] h-[98px] rounded-xl bg-gray-800 border-2 border-white/20 flex items-center justify-center cursor-pointer transition-transform active:scale-95', isMyTurn && legalActions.some((a: any) => a.type === 'draw') && 'hover:scale-105')}
          onClick={isMyTurn && legalActions.some((a: any) => a.type === 'draw') ? () => doAction({ type: 'draw', payload: {} }) : undefined}
        >
          <span className="text-white/30 text-xs font-ui">{drawPile.length}</span>
        </div>

        {/* Discard pile */}
        <div className="relative">
          {topCard && (
            <UnoCardComponent card={topCard} size="lg" />
          )}
          {/* Current color indicator ring */}
          <div className={cn('absolute -inset-1 rounded-2xl border-4 opacity-60', COLOR_STYLES[currentColor])} />
        </div>
      </div>

      {/* Draw pending info */}
      {uno.drawPending > 0 && (
        <div className="text-center text-red-400 text-sm font-bold font-ui">
          Draw +{uno.drawPending} incoming!
        </div>
      )}

      {/* Player hand */}
      <div className="flex-1 flex flex-col items-center justify-end pb-28">
        <div className="flex gap-1 flex-wrap justify-center px-2 pb-2">
          {localHand.map((card: any) => {
            const canPlay = isMyTurn && legalActions.some((a: any) => a.type === 'play' && (a.payload as any)?.cardId === card.id);
            return (
              <UnoCardComponent
                key={card.id}
                card={card}
                size="md"
                disabled={!canPlay}
                onClick={canPlay ? () => handlePlayCard(card.id) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* UNO button */}
      {isMyTurn && hasUno && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <button
            onClick={() => doAction({ type: 'call-uno', payload: {} })}
            className="bg-red-600 text-white font-bold text-lg px-6 py-3 rounded-2xl shadow-lg animate-bounce border-2 border-red-300"
          >
            UNO!
          </button>
        </div>
      )}

      {/* Color chooser modal */}
      <AnimatePresence>
        {(choosingColor || (isMyTurn && phase === 'choosing-color')) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-30"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-felt-dark rounded-3xl p-6 flex flex-col items-center gap-4"
            >
              <p className="text-white font-bold font-ui">Choose a color</p>
              <div className="grid grid-cols-2 gap-3">
                {(['red', 'yellow', 'green', 'blue'] as UnoColor[]).map((color) => (
                  <button
                    key={color}
                    onClick={() => handleChooseColor(color)}
                    className={cn('w-20 h-20 rounded-2xl border-4 border-white/30 font-bold text-lg uppercase', COLOR_STYLES[color])}
                  >
                    {color[0].toUpperCase() + color.slice(1)}
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
