import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';
import type { Card as CardType } from '@/types';

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

  // card size: sm = 50x70
  const CARD_W = 50;
  const CARD_H = 70;
  // Vertical offset per card in tableau (show rank/suit of each hidden card)
  const FACE_DOWN_OFFSET = 16;
  const FACE_UP_OFFSET = 22;

  function handleStockClick() {
    doAction({ type: 'stockToWaste', payload: {} });
  }

  function handleWasteClick() {
    if (!topWaste) return;
    if (selected) {
      setSelected(null);
      return;
    }
    // Select top waste card
    setSelected({ source: 'waste', cardId: topWaste.id, cards: [topWaste] });
  }

  function handleTableauCardClick(colIndex: number, card: CardType) {
    const col = tableau[colIndex];
    const cardIdx = col.findIndex((c) => c.id === card.id);
    if (!card.faceUp) return;

    if (selected) {
      // Try to place from waste
      if (selected.source === 'waste') {
        doAction({ type: 'wasteToTableau', payload: { toCol: colIndex } });
      } else {
        doAction({ type: 'tableauToTableau', payload: { fromCol: parseInt(selected.source), toCol: colIndex, cardId: selected.cardId } });
      }
      setSelected(null);
    } else {
      // Select this card and everything below it
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
      // Try auto-move from waste
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

  // Calculate the height needed for a tableau column
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

  return (
    <div className="relative w-full h-full bg-felt-dark flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName=""
        isMyTurn={true}
        onExit={() => navigate('/')}
      />

      {/* Top row: stock + waste | foundations */}
      <div className="flex items-center gap-2 px-3 pt-16 pb-2">
        {/* Stock */}
        <div
          className="rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer transition-transform active:scale-95 flex-shrink-0"
          style={{ width: CARD_W, height: CARD_H }}
          onClick={handleStockClick}
        >
          {stock.length > 0 ? (
            <Card card={stock[stock.length - 1]} faceUp={false} size="sm" />
          ) : (
            <span className="text-white/30 text-lg">↺</span>
          )}
        </div>

        {/* Waste */}
        <div
          className={cn(
            'rounded-lg border-2 border-dashed border-white/10 cursor-pointer flex-shrink-0',
            selected?.source === 'waste' && 'ring-2 ring-yellow-400',
          )}
          style={{ width: CARD_W, height: CARD_H }}
          onClick={handleWasteClick}
        >
          {topWaste && <Card card={topWaste} faceUp size="sm" selected={selected?.source === 'waste'} />}
        </div>

        <div className="flex-1" />

        {/* Foundations */}
        {foundations.map((foundation, i) => {
          const top = foundation[foundation.length - 1];
          return (
            <div
              key={i}
              className="rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ width: CARD_W, height: CARD_H }}
              onClick={() => handleFoundationClick(i)}
            >
              {top ? (
                <Card card={top} faceUp size="sm" />
              ) : (
                <span className="text-white/20 text-sm font-card">A</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tableau — scrollable so tall columns are always reachable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-4">
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
                  if (selected && col.length === 0) {
                    handleTableauEmptyClick(colIndex);
                  }
                }}
              >
                {/* Empty slot placeholder */}
                <div className="absolute inset-x-0 top-0 rounded-lg border-2 border-dashed border-white/10" style={{ height: CARD_H }} />

                {col.map((card, cardIdx) => {
                  const top = col.slice(0, cardIdx).reduce((acc, c) => acc + (c.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET), 0);
                  const isSelected = selected?.cards?.some((c) => c.id === card.id) ?? false;
                  return (
                    <div
                      key={card.id}
                      className="absolute left-0 right-0"
                      style={{ top, zIndex: cardIdx + (isSelected ? 20 : 0) }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTableauCardClick(colIndex, card);
                      }}
                    >
                      <Card card={card} faceUp={card.faceUp} size="sm" selected={isSelected} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection cancel hint */}
      {selected && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/60 text-white/60 text-xs font-ui px-3 py-1.5 rounded-full">
            Tap a column to place · tap card again to deselect
          </div>
        </div>
      )}

      {/* Auto complete */}
      {legalActions.some((a: any) => a.type === 'autoComplete') && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <Button variant="gold" onClick={() => doAction({ type: 'autoComplete', payload: {} })}>
            Auto Complete ✨
          </Button>
        </div>
      )}

      <ResultOverlay
        visible={gameOver}
        winners={localPlayer ? [localPlayer] : []}
        isLocalPlayerWinner={gameOver}
        players={state.players}
        onPlayAgain={restart}
        onExit={() => navigate('/')}
      />
    </div>
  );
}
