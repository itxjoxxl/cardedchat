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

export default function SpadesBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [bidAmount, setBidAmount] = useState(3);

  if (!state) return null;

  const spades = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localHand = localPlayer ? (spades.hands?.[localPlayer.id] ?? []) : [];
  const trick = spades.trick ?? [];
  const bids: Record<string, number> = spades.bids ?? {};
  const tricksTaken: Record<string, number> = spades.tricksTaken ?? {};
  const teamScores: [number, number] = spades.teamScores ?? [0, 0];
  const phase = spades.phase;

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  const localIdx = state.players.findIndex((p: any) => p.isLocal);
  const teamLabel = localIdx % 2 === 0 ? 'Team A' : 'Team B';
  const myTeamScore = teamScores[localIdx % 2];
  const oppTeamScore = teamScores[(localIdx + 1) % 2];

  return (
    <div className="relative w-full h-full bg-felt flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Team scores */}
      <div className="absolute top-14 right-3 z-20 bg-black/40 rounded-xl p-2 text-xs font-ui">
        <div className="text-yellow-400 font-bold">{teamLabel}: {myTeamScore}</div>
        <div className="text-white/50">Opp: {oppTeamScore}</div>
      </div>

      {/* Opponents */}
      <div className="flex justify-around pt-20 pb-2 px-4">
        {opponents.map((opp: any) => {
          const isCurrent = state.players[state.currentPlayerIndex]?.id === opp.id;
          const oppBid = bids[opp.id];
          const oppTricks = tricksTaken[opp.id] ?? 0;
          return (
            <div key={opp.id} className="flex flex-col items-center gap-1">
              <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={isCurrent} />
              {oppBid !== undefined && (
                <div className="text-xs text-white/40 font-ui">
                  {oppTricks}/{oppBid}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center trick */}
      <div className="flex justify-center items-center gap-2 py-3 min-h-[100px]">
        {trick.map((t: any) => (
          <Card key={t.card.id} card={t.card} faceUp size="sm" />
        ))}
        {trick.length === 0 && (
          <div className="text-white/20 text-sm font-ui">♠ Spades always trump</div>
        )}
      </div>

      {/* Bidding phase */}
      {phase === 'bidding' && isMyTurn && (
        <div className="flex flex-col items-center gap-3 px-6">
          <p className="text-white/60 text-sm font-ui">How many tricks will you take?</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setBidAmount(Math.max(0, bidAmount - 1))}
              className="w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center"
            >−</button>
            <span className="text-3xl font-bold text-yellow-400 w-12 text-center font-card">{bidAmount}</span>
            <button
              onClick={() => setBidAmount(Math.min(13, bidAmount + 1))}
              className="w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center"
            >+</button>
          </div>
          <Button variant="gold" onClick={() => doAction({ type: 'bid', payload: { amount: bidAmount } })}>
            Bid {bidAmount} {bidAmount === 0 ? '(Nil)' : 'tricks'}
          </Button>
        </div>
      )}

      {/* Player bid status */}
      {phase === 'playing' && localPlayer && (
        <div className="text-center text-xs text-white/40 font-ui">
          Your bid: {bids[localPlayer.id] ?? '?'} | Taken: {tricksTaken[localPlayer.id] ?? 0}
        </div>
      )}

      {/* Player hand */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Hand
          cards={localHand}
          playerId={localPlayer?.id ?? ''}
          isLocal
          faceUp
          onCardClick={isMyTurn && phase === 'playing' ? (id) => { if (legalActions.some((a: any) => (a.payload as any)?.cardId === id)) doAction({ type: 'play', payload: { cardId: id } }); } : undefined}
          size="md"
        />
      </div>

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
