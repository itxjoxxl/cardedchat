import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import CardStack from '@/components/card/CardStack';
import Hand from '@/components/hand/Hand';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import type { BoardProps } from '../GameBoard';

export default function GinRummyBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (!state) return null;

  const gin = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponent = state.players.find((p: any) => !p.isLocal);
  const localHand = localPlayer ? (gin.hands?.[localPlayer.id] ?? []) : [];
  const oppHand = opponent ? (gin.hands?.[opponent.id] ?? []) : [];
  const drawPile = gin.drawPile ?? [];
  const discardPile = gin.discardPile ?? [];
  const phase = gin.phase;

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  const canKnock = isMyTurn && phase === 'discard' && selectedCard && legalActions.some((a: any) => a.type === 'knock' && (a.payload as any)?.discardCardId === selectedCard);
  const canGin = isMyTurn && phase === 'discard' && selectedCard && legalActions.some((a: any) => a.type === 'gin');

  return (
    <div className="relative w-full h-full bg-felt flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Opponent */}
      <div className="flex flex-col items-center pt-20 gap-2">
        <Avatar emoji={opponent?.avatar ?? '🤖'} name={opponent?.name} size="sm" isCurrentTurn={state.currentPlayerIndex === state.players.indexOf(opponent!)} />
        <div className="flex gap-1">
          {oppHand.map((c: any, i: number) => (
            <Card key={c.id ?? i} card={c} faceUp={phase === 'knock' || phase === 'ended'} size="sm" />
          ))}
        </div>
        <div className="text-xs text-white/40 font-ui">{oppHand.length} cards</div>
      </div>

      {/* Center */}
      <div className="flex justify-center gap-8 py-4">
        <CardStack cards={drawPile} label="Draw" faceUp={false} onClick={isMyTurn && phase === 'draw' ? () => doAction({ type: 'draw-stock', payload: {} }) : undefined} size="md" />
        <CardStack cards={discardPile} label="Discard" faceUp onClick={isMyTurn && phase === 'draw' ? () => doAction({ type: 'draw-discard', payload: {} }) : undefined} size="md" />
      </div>

      {/* Scores */}
      <div className="flex justify-center gap-6 text-xs text-white/50 font-ui">
        {state.players.map((p: any) => (
          <span key={p.id}>{p.name}: {state.scores[p.id] ?? 0}</span>
        ))}
      </div>

      {/* Player hand */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        {phase === 'discard' && isMyTurn && <p className="text-white/50 text-xs font-ui">Select a card to discard (or knock/gin)</p>}
        <Hand
          cards={localHand}
          playerId={localPlayer?.id ?? ''}
          isLocal
          faceUp
          selectedCardIds={selectedCard ? [selectedCard] : []}
          onCardClick={phase === 'discard' && isMyTurn ? setSelectedCard : undefined}
          size="md"
        />
      </div>

      {/* Actions */}
      {isMyTurn && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-8 pt-8">
          <div className="flex gap-2 justify-center">
            {phase === 'discard' && selectedCard && (
              <>
                <Button variant="danger" onClick={() => { doAction({ type: 'discard', payload: { cardId: selectedCard } }); setSelectedCard(null); }}>
                  Discard
                </Button>
                {canKnock && (
                  <Button variant="secondary" onClick={() => { doAction({ type: 'knock', payload: { discardCardId: selectedCard } }); setSelectedCard(null); }}>
                    Knock 🤜
                  </Button>
                )}
                {canGin && (
                  <Button variant="gold" onClick={() => { doAction({ type: 'gin', payload: { discardCardId: selectedCard } }); setSelectedCard(null); }}>
                    Gin! 🎉
                  </Button>
                )}
              </>
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
