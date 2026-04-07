import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import Hand from '@/components/hand/Hand';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';

export default function TexasHoldemBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [raiseAmount, setRaiseAmount] = useState(20);

  if (!state) return null;

  const holdem = state as any;
  const phase = holdem.phase ?? 'preflop';
  const communityCards = holdem.communityCards ?? [];
  const pot = holdem.pot ?? 0;
  const holdemPlayers: any[] = holdem.holdemPlayers ?? [];
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localHoldemPlayer = localPlayer ? holdemPlayers.find((p: any) => p.playerId === localPlayer.id) : null;
  const localHand = localHoldemPlayer?.holeCards ?? [];
  const currentBet = holdem.currentBet ?? 0;
  const playerBet = localHoldemPlayer?.totalBet ?? 0;
  const callAmount = Math.max(0, currentBet - playerBet);

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  const phaseLabels: Record<string, string> = {
    ante: 'Blinds', preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown'
  };

  // Position opponents around oval (top area)
  const positions = ['top-left', 'top', 'top-right', 'left', 'right'];

  return (
    <div className="relative w-full h-full bg-felt flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Table area */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4">

        {/* Opponent seats */}
        <div className="absolute top-16 left-0 right-0 flex justify-around px-4">
          {opponents.map((opp: any, i: number) => {
            const oppHoldemPlayer = holdemPlayers.find((p: any) => p.playerId === opp.id);
            const oppHand = oppHoldemPlayer?.holeCards ?? [];
            const isCurrent = state.currentPlayerIndex === state.players.indexOf(opp);
            const isFolded = oppHoldemPlayer?.folded ?? false;
            return (
              <div key={opp.id} className={cn('flex flex-col items-center gap-1 transition-opacity', isFolded && 'opacity-40')}>
                <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={isCurrent} />
                <div className="flex gap-0.5">
                  {oppHand.slice(0, 2).map((c: any) => (
                    <Card key={c.id} card={c} faceUp={phase === 'showdown'} size="sm" />
                  ))}
                </div>
                <div className="text-xs text-white/40 font-ui">${oppHoldemPlayer?.chips ?? 1000}</div>
              </div>
            );
          })}
        </div>

        {/* Oval felt table */}
        <div
          className="relative felt-surface rounded-[50%] flex flex-col items-center justify-center gap-3"
          style={{ width: '90%', height: 200 }}
        >
          {/* Phase badge */}
          <div className="absolute top-3 text-xs uppercase tracking-widest text-white/40 font-ui">
            {phaseLabels[phase] ?? phase}
          </div>

          {/* Community cards */}
          <div className="flex gap-1.5 items-center">
            {Array.from({ length: 5 }).map((_, i) => {
              const card = communityCards[i];
              return card ? (
                <Card key={card.id} card={card} faceUp size="sm" />
              ) : (
                <div key={i} className="w-[50px] h-[70px] rounded-lg border border-dashed border-white/15" />
              );
            })}
          </div>

          {/* Pot */}
          <div className="bg-black/30 rounded-full px-3 py-1 text-sm text-yellow-400 font-bold font-ui">
            💰 ${pot}
          </div>
        </div>

        {/* Local player hand */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {localHand.map((c: any) => (
              <Card key={c.id} card={c} faceUp size="md" />
            ))}
          </div>
          {localPlayer && (
            <div className="text-xs text-white/40 font-ui">
              {localPlayer.name} — ${localHoldemPlayer?.chips ?? 1000}
              {localHoldemPlayer?.folded && <span className="text-red-400 ml-1">(folded)</span>}
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      {isMyTurn && legalActions.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-12">
          <div className="flex gap-2 justify-center flex-wrap mb-2">
            {legalActions.filter((a: any) => a.type !== 'raise').map((a: any) => {
              const labels: Record<string, string> = {
                fold: 'Fold', check: 'Check', call: `Call $${callAmount}`,
                'all-in': 'All In', 'post-blind': `Blind $${a.payload?.amount ?? 0}`,
              };
              return (
                <Button
                  key={a.type}
                  variant={a.type === 'fold' ? 'danger' : a.type === 'call' ? 'secondary' : 'gold'}
                  onClick={() => doAction(a)}
                >
                  {labels[a.type] ?? a.type}
                </Button>
              );
            })}
          </div>
          {legalActions.some((a: any) => a.type === 'raise') && (
            <div className="flex items-center gap-3 justify-center">
              <input
                type="range"
                min={currentBet * 2 || 20}
                max={localHoldemPlayer?.chips ?? 200}
                step={10}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                className="flex-1 max-w-[160px] accent-yellow-400"
              />
              <Button variant="gold" onClick={() => doAction({ type: 'raise', payload: { amount: raiseAmount } })}>
                Raise ${raiseAmount}
              </Button>
            </div>
          )}
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
