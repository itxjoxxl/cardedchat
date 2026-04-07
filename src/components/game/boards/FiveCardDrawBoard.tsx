import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';

export default function FiveCardDrawBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [selectedDiscards, setSelectedDiscards] = useState<Set<string>>(new Set());

  if (!state) return null;

  const draw = state as any;
  const phase = draw.phase;
  const fcdPlayers: any[] = draw.fcdPlayers ?? [];
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localFcdPlayer = localPlayer ? fcdPlayers.find((p: any) => p.playerId === localPlayer.id) : null;
  const localHand = localFcdPlayer?.hand ?? [];
  const pot = draw.pot ?? 0;

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  function toggleDiscard(cardId: string) {
    setSelectedDiscards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else if (next.size < 4) next.add(cardId);
      return next;
    });
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
      <div className="flex justify-around px-6 pt-20 pb-4">
        {opponents.map((opp: any) => {
          const oppFcdPlayer = fcdPlayers.find((p: any) => p.playerId === opp.id);
          const oppHand = oppFcdPlayer?.hand ?? [];
          const isCurrent = state.players[state.currentPlayerIndex]?.id === opp.id;
          return (
            <div key={opp.id} className="flex flex-col items-center gap-2">
              <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={isCurrent} />
              <div className="flex gap-0.5">
                {oppHand.slice(0, 5).map((c: any, i: number) => (
                  <Card key={c.id ?? i} card={c} faceUp={phase === 'showdown'} size="sm" />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center pot */}
      <div className="flex justify-center py-2">
        <div className="bg-black/40 rounded-full px-5 py-2 text-yellow-400 font-bold font-ui">
          💰 Pot: ${pot}
        </div>
      </div>

      {/* Player hand */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {phase === 'draw' && isMyTurn && (
          <p className="text-white/60 text-sm font-ui">Tap cards to discard (0-4)</p>
        )}
        <div className="flex gap-2 flex-wrap justify-center px-4">
          {localHand.map((card: any) => {
            const isSelected = selectedDiscards.has(card.id);
            return (
              <div key={card.id} className="relative">
                <Card
                  card={card}
                  faceUp
                  size="md"
                  selected={isSelected}
                  onClick={phase === 'draw' && isMyTurn ? () => toggleDiscard(card.id) : undefined}
                />
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">✕</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {isMyTurn && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-8 pt-12">
          <div className="flex gap-2 justify-center flex-wrap">
            {phase === 'draw' ? (
              <Button variant="gold" onClick={() => { doAction({ type: 'discard', payload: { cardIds: [...selectedDiscards] } }); setSelectedDiscards(new Set()); }}>
                Draw {selectedDiscards.size > 0 ? `(${selectedDiscards.size} discarded)` : '(Stand Pat)'}
              </Button>
            ) : (
              legalActions.map((a: any) => {
                const labels: Record<string, string> = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', ante: 'Post Ante', 'all-in': 'All In' };
                return (
                  <Button
                    key={a.type}
                    variant={a.type === 'fold' ? 'danger' : a.type === 'check' || a.type === 'call' ? 'secondary' : 'gold'}
                    onClick={() => doAction(a)}
                  >
                    {labels[a.type] ?? a.type}
                  </Button>
                );
              })
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
