import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import CenterPile from '@/components/table/CenterPile';
import Hand from '@/components/hand/Hand';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import type { BoardProps } from '../GameBoard';

export default function RummyBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  if (!state) return null;

  const rummy = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localHand = localPlayer ? (rummy.hands?.[localPlayer.id] ?? []) : [];
  const drawPile = rummy.stock ?? [];
  const discardPile = rummy.discardPile ?? [];
  const phase = rummy.phase ?? 'draw';

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  function toggleCard(id: string) {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const canDrawStock = isMyTurn && legalActions.some((a: any) => a.type === 'drawFromStock');
  const canDrawDiscard = isMyTurn && legalActions.some((a: any) => a.type === 'drawFromDiscard');
  const canMeld = isMyTurn && phase === 'meld' && selectedCards.size >= 3 && legalActions.some((a: any) => a.type === 'layMeld');
  const canDiscard = isMyTurn && phase === 'meld' && selectedCards.size === 1 && legalActions.some((a: any) => a.type === 'discard');

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
          const oppHand = rummy.hands?.[opp.id] ?? [];
          return (
            <div key={opp.id} className="flex flex-col items-center gap-1">
              <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={state.players[state.currentPlayerIndex]?.id === opp.id} />
              <div className="text-xs text-white/40 font-ui">{oppHand.length} cards</div>
            </div>
          );
        })}
      </div>

      {/* Center piles */}
      <CenterPile
        drawPile={drawPile}
        discardPile={discardPile}
        onDrawClick={canDrawStock ? () => doAction({ type: 'drawFromStock', payload: {} }) : undefined}
        onDiscardClick={canDrawDiscard ? () => doAction({ type: 'drawFromDiscard', payload: {} }) : undefined}
        size="md"
        className="py-3"
      />

      {/* Phase hint */}
      {isMyTurn && (
        <div className="text-center text-xs text-white/40 font-ui">
          {phase === 'draw' ? 'Draw a card from the pile or discard' : 'Form melds, lay off, or discard a card'}
        </div>
      )}

      {/* Player hand */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Hand
          cards={localHand}
          playerId={localPlayer?.id ?? ''}
          isLocal={true}
          faceUp
          selectedCardIds={[...selectedCards]}
          onCardClick={isMyTurn ? toggleCard : undefined}
          size="md"
        />
      </div>

      {/* Actions */}
      {isMyTurn && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-8 pt-8">
          <div className="flex gap-2 justify-center flex-wrap">
            {canMeld && (
              <Button variant="gold" onClick={() => { doAction({ type: 'layMeld', payload: { cardIds: [...selectedCards] } }); setSelectedCards(new Set()); }}>
                Lay Meld ({selectedCards.size})
              </Button>
            )}
            {canDiscard && (
              <Button variant="danger" onClick={() => { doAction({ type: 'discard', payload: { cardId: [...selectedCards][0] } }); setSelectedCards(new Set()); }}>
                Discard
              </Button>
            )}
            {!canMeld && !canDiscard && phase !== 'draw' && (
              <p className="text-white/30 text-sm font-ui">Select cards to meld or discard</p>
            )}
          </div>
        </div>
      )}

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
