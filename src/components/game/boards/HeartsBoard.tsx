import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import Hand from '@/components/hand/Hand';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';

export default function HeartsBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [selectedForPass, setSelectedForPass] = useState<Set<string>>(new Set());

  if (!state) return null;

  const hearts = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localHand = localPlayer ? (hearts.hands?.[localPlayer.id] ?? []) : [];
  const trick = hearts.trick ?? [];
  const phase = hearts.phase;
  const passDirection = hearts.passDirection;

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  function togglePassCard(id: string) {
    if (!isMyTurn || phase !== 'passing') return;
    setSelectedForPass((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  function handlePass() {
    doAction({ type: 'pass', payload: { cardIds: passDirection === 'none' ? [] : [...selectedForPass] } });
    setSelectedForPass(new Set());
  }

  function handlePlay(cardId: string) {
    doAction({ type: 'play', payload: { cardId } });
  }

  // Positions around the table
  const positions = [
    { label: 'North', player: opponents[0] },
    { label: 'East', player: opponents[1] },
    { label: 'West', player: opponents[2] },
  ];

  return (
    <div className="relative w-full h-full bg-felt flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Scores */}
      <div className="absolute top-14 right-3 z-20 bg-black/40 rounded-xl p-2 flex flex-col gap-0.5">
        {state.players.map((p: any) => (
          <div key={p.id} className="flex items-center gap-1 text-xs font-ui">
            <span>{p.avatar}</span>
            <span className="text-white/60">{p.name}: </span>
            <span className="text-yellow-400 font-bold">{state.scores[p.id] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Opponents (top area) */}
      <div className="flex justify-around pt-20 pb-2 px-4">
        {opponents.map((opp: any) => {
          const oppHand = hearts.hands?.[opp.id] ?? [];
          const isCurrent = state.players[state.currentPlayerIndex]?.id === opp.id;
          return (
            <div key={opp.id} className="flex flex-col items-center gap-1">
              <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={isCurrent} />
              <div className="text-xs text-white/40 font-ui">{oppHand.length}</div>
            </div>
          );
        })}
      </div>

      {/* Center trick area */}
      <div className="flex justify-center items-center gap-2 py-2 min-h-[100px]">
        {trick.map((t: any) => (
          <Card key={t.card.id} card={t.card} faceUp size="sm" />
        ))}
        {trick.length === 0 && (
          <div className="text-white/20 text-sm font-ui">
            {phase === 'passing' ? `Pass 3 cards ${passDirection}` : 'Trick area'}
          </div>
        )}
      </div>

      {/* Pass phase hint */}
      {phase === 'passing' && isMyTurn && (
        <div className="text-center text-white/50 text-xs font-ui">
          Select 3 cards to pass {passDirection} ({selectedForPass.size}/3)
        </div>
      )}

      {/* Player hand */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Hand
          cards={localHand}
          playerId={localPlayer?.id ?? ''}
          isLocal
          faceUp
          selectedCardIds={phase === 'passing' ? [...selectedForPass] : []}
          onCardClick={
            isMyTurn && phase === 'passing'
              ? togglePassCard
              : isMyTurn && phase === 'playing'
              ? (id) => { if (legalActions.some((a: any) => (a.payload as any)?.cardId === id)) handlePlay(id); }
              : undefined
          }
          size="md"
        />
      </div>

      {/* Actions */}
      {isMyTurn && phase === 'passing' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-8 pt-8">
          {passDirection === 'none' ? (
            <Button variant="gold" onClick={handlePass} className="w-full max-w-xs mx-auto block">
              No Pass Round — Continue →
            </Button>
          ) : selectedForPass.size === 3 ? (
            <Button variant="gold" onClick={handlePass} className="w-full max-w-xs mx-auto block">
              Pass Cards →
            </Button>
          ) : null}
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
