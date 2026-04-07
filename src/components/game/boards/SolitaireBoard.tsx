import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';
import type { Card as CardType, Player } from '@/types';

export default function SolitaireBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [selected, setSelected] = useState<{ source: string; cardId: string; cards: CardType[] } | null>(null);

  if (!state) return null;

  const sol = state as any;
  const stock: CardType[] = sol.stock ?? [];
  const waste: CardType[] = sol.waste ?? [];
  const foundations: CardType[][] = sol.foundations ?? [[], [], [], []];
  const tableau: CardType[][] = sol.tableau ?? [[], [], [], [], [], [], []];
  const topWaste = waste[waste.length - 1];

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const localPlayer = state.players[0];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;
  const overlayWinners = (state.winners as string[])
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const CARD_W = 44;
  const CARD_H = 62;
  const FACE_DOWN_OFFSET = 14;
  const FACE_UP_OFFSET = 20;

  function handleStockClick() {
    doAction({ type: 'stockToWaste', payload: {} });
    setSelected(null);
  }

  function handleWasteClick() {
    if (!topWaste) return;
    if (selected?.source === 'waste') {
      setSelected(null);
      return;
    }
    setSelected({ source: 'waste', cardId: topWaste.id, cards: [topWaste] });
  }

  function handleTableauCardClick(colIndex: number, card: CardType) {
    const col = tableau[colIndex];
    const cardIdx = col.findIndex((c) => c.id === card.id);
    if (!card.faceUp) return;

    if (selected) {
      if (selected.source === 'waste') {
        // FIX: use { colIndex } not { toCol: colIndex }
        doAction({ type: 'wasteToTableau', payload: { colIndex } });
      } else {
        doAction({ type: 'tableauToTableau', payload: { fromCol: parseInt(selected.source), toCol: colIndex, cardId: selected.cardId } });
      }
      setSelected(null);
    } else {
      const cards = col.slice(cardIdx);
      setSelected({ source: String(colIndex), cardId: card.id, cards });
    }
  }

  function handleTableauEmptyClick(colIndex: number) {
    if (!selected) return;
    if (selected.source === 'waste') {
      doAction({ type: 'wasteToTableau', payload: { colIndex } });
    } else {
      doAction({ type: 'tableauToTableau', payload: { fromCol: parseInt(selected.source), toCol: colIndex, cardId: selected.cardId } });
    }
    setSelected(null);
  }

  function handleFoundationClick(idx: number) {
    if (!selected) {
      const canFoundation = legalActions.some((a: any) => a.type === 'wasteToFoundation');
      if (canFoundation) doAction({ type: 'wasteToFoundation', payload: {} });
      return;
    }
    if (selected.source === 'waste') {
      doAction({ type: 'wasteToFoundation', payload: {} });
    } else {
      doAction({ type: 'tableauToFoundation', payload: { fromCol: parseInt(selected.source), cardId: selected.cardId } });
    }
    setSelected(null);
  }

  function columnHeight(col: CardType[]): number {
    if (col.length === 0) return CARD_H;
    let h = 0;
    col.forEach((card, i) => {
      if (i < col.length - 1) {
        h += card.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET;
      }
    });
    return h + CARD_H;
  }

  const maxColHeight = Math.max(...tableau.map(columnHeight), CARD_H);
  const canAutoComplete = legalActions.some((a: any) => a.type === 'autoComplete');

  return (
    <div className="relative w-full h-full bg-felt-dark flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName=""
        isMyTurn={true}
        onExit={() => navigate('/')}
      />

      {/* ── Foundations (top, below HUD) ── */}
      <div className="flex items-center justify-center gap-2 px-3 pt-16 pb-2 flex-shrink-0">
        {foundations.map((foundation, i) => {
          const top = foundation[foundation.length - 1];
          const suits = ['♠', '♥', '♦', '♣'];
          return (
            <motion.div
              key={i}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl border-2 border-dashed border-white/25 flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors hover:border-yellow-400/40 active:border-yellow-400/60"
              style={{ width: CARD_W, height: CARD_H }}
              onClick={() => handleFoundationClick(i)}
            >
              {top ? (
                <Card card={top} faceUp size="sm" />
              ) : (
                <span className="text-white/20 text-sm font-card">{suits[i]}</span>
              )}
            </motion.div>
          );
        })}
        {/* Move count */}
        <div className="ml-2 flex flex-col items-center">
          <span className="text-white/30 text-[9px] font-ui uppercase tracking-widest">Moves</span>
          <span className="text-white/50 text-sm font-bold font-ui">{sol.moves ?? 0}</span>
        </div>
      </div>

      {/* ── Tableau (middle, scrollable) ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-2">
        <div
          className="flex gap-1 w-full"
          style={{ minHeight: maxColHeight + 16 }}
        >
          {tableau.map((col, colIndex) => {
            const colH = columnHeight(col);
            return (
              <div
                key={colIndex}
                className="relative flex-1"
                style={{ height: colH + 8 }}
                onClick={() => {
                  if (selected && col.length === 0) handleTableauEmptyClick(colIndex);
                }}
              >
                {/* Empty slot */}
                <div
                  className={cn(
                    'absolute inset-x-0 top-0 rounded-xl border-2 border-dashed transition-colors',
                    selected ? 'border-white/20 bg-white/5' : 'border-white/10',
                  )}
                  style={{ height: CARD_H }}
                />
                {col.map((card, cardIdx) => {
                  const top = col.slice(0, cardIdx).reduce(
                    (acc, c) => acc + (c.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET),
                    0,
                  );
                  const isSelected = selected?.cards?.some((c) => c.id === card.id) ?? false;
                  return (
                    <motion.div
                      key={card.id}
                      className="absolute left-0 right-0"
                      style={{ top, zIndex: cardIdx + (isSelected ? 20 : 0) }}
                      animate={isSelected ? { y: -4 } : { y: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTableauCardClick(colIndex, card);
                      }}
                    >
                      <Card card={card} faceUp={card.faceUp} size="sm" selected={isSelected} />
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom: Stock + Waste + AutoComplete ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-3 py-3 border-t border-white/5 bg-black/20">
        {/* Stock pile */}
        <motion.div
          whileTap={{ scale: 0.93 }}
          className="rounded-xl border-2 border-dashed border-white/25 flex items-center justify-center cursor-pointer flex-shrink-0 active:border-yellow-400/50"
          style={{ width: CARD_W, height: CARD_H }}
          onClick={handleStockClick}
        >
          {stock.length > 0 ? (
            <Card card={stock[stock.length - 1]} faceUp={false} size="sm" />
          ) : (
            <motion.span
              className="text-white/40 text-xl"
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              key="reset"
            >
              ↺
            </motion.span>
          )}
        </motion.div>
        <span className="text-white/20 text-xs font-ui">{stock.length}</span>

        {/* Waste pile */}
        <motion.div
          whileTap={{ scale: 0.95 }}
          className={cn(
            'rounded-xl border-2 border-dashed cursor-pointer flex-shrink-0 relative transition-colors',
            selected?.source === 'waste'
              ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
              : 'border-white/15 hover:border-white/30',
          )}
          style={{ width: CARD_W, height: CARD_H }}
          onClick={handleWasteClick}
        >
          {topWaste ? (
            <Card card={topWaste} faceUp size="sm" selected={selected?.source === 'waste'} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-white/15 text-xs font-ui">empty</span>
          )}
        </motion.div>
        <span className="text-white/20 text-xs font-ui">{waste.length}</span>

        <div className="flex-1" />

        {/* Auto-complete */}
        <AnimatePresence>
          {canAutoComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
            >
              <Button variant="gold" onClick={() => doAction({ type: 'autoComplete', payload: {} })}>
                Auto ✨
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selection hint */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none"
          >
            <div className="bg-black/70 text-yellow-300/80 text-xs font-ui px-4 py-2 rounded-full border border-yellow-400/20">
              Tap a column to place · tap again to deselect
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ResultOverlay
        visible={gameOver}
        winners={overlayWinners}
        isLocalPlayerWinner={isWinner}
        players={state.players}
        onPlayAgain={restart}
        onExit={() => navigate('/')}
      />
    </div>
  );
}
