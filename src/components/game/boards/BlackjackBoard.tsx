import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import { useProfileStore } from '@/store/profileStore';
import Hand from '@/components/hand/Hand';
import Card from '@/components/card/Card';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';

export default function BlackjackBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [betAmount, setBetAmount] = useState(25);

  if (!state) return null;

  const bj = state as any;
  const phase = bj.phase;
  const dealerHand = bj.dealerHand ?? [];
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const bjPlayer = localPlayer ? (bj.bjPlayers ?? []).find((p: any) => p.playerId === localPlayer.id) : null;
  const activeHand = bjPlayer?.hands?.[bjPlayer?.activeHandIndex ?? 0];
  const handCards = activeHand?.cards ?? [];
  const chips = bjPlayer?.chips ?? 1000;
  const handValue = (() => {
    let sum = 0, aces = 0;
    for (const c of handCards) {
      if (['J', 'Q', 'K'].includes(c.rank)) sum += 10;
      else if (c.rank === 'A') { sum += 11; aces++; }
      else sum += parseInt(c.rank);
    }
    while (sum > 21 && aces > 0) { sum -= 10; aces--; }
    return sum;
  })();

  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;
  const gameOver = state.status === 'finished' || state.status === 'ended';

  const CHIP_VALUES = [5, 10, 25, 50, 100];

  function handleAction(type: string, extra?: Record<string, unknown>) {
    doAction({ type, payload: extra ?? {} });
  }

  return (
    <div className="relative w-full h-full bg-felt flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Dealer area */}
      <div className="flex flex-col items-center pt-20 pb-4 flex-1">
        <div className="text-white/50 text-xs font-ui uppercase tracking-widest mb-3">Dealer</div>
        <div className="flex gap-2 justify-center flex-wrap px-4">
          {dealerHand.map((card: any, i: number) => (
            <Card
              key={card.id}
              card={card}
              faceUp={i === 0 || phase === 'dealer' || phase === 'payout'}
              size="md"
            />
          ))}
        </div>
        {phase === 'dealer' && (
          <div className="mt-2 text-white/60 text-sm font-ui">Dealer playing...</div>
        )}
      </div>

      {/* Pot display */}
      <div className="flex justify-center">
        <div className="bg-black/30 rounded-full px-4 py-1.5 text-sm text-yellow-400 font-bold font-ui">
          💰 ${activeHand?.bet ?? betAmount}
        </div>
      </div>

      {/* Player hand */}
      <div className="flex flex-col items-center py-4 gap-3">
        <div className="text-white/50 text-xs font-ui uppercase tracking-widest">
          Your Hand {handCards.length > 0 && (
          <span className={cn('font-bold', handValue > 21 ? 'text-red-400' : 'text-yellow-400')}> — {handValue}{handValue > 21 ? ' BUST' : ''}</span>
        )}
        </div>
        <div className="flex gap-2 justify-center flex-wrap px-4">
          {handCards.map((card: any) => (
            <Card key={card.id} card={card} faceUp size="md" />
          ))}
        </div>

        {/* Bet phase */}
        {phase === 'betting' && isMyTurn && (
          <div className="flex flex-col items-center gap-3 w-full px-6">
            <div className="text-white/60 text-sm font-ui">Chips: <span className="text-yellow-400 font-bold">${chips}</span></div>
            <div className="flex gap-2 flex-wrap justify-center">
              {CHIP_VALUES.map((v) => (
                <button
                  key={v}
                  onClick={() => setBetAmount(v)}
                  className={cn(
                    'w-12 h-12 rounded-full font-bold text-sm border-2 transition-all',
                    betAmount === v
                      ? 'bg-yellow-500 text-yellow-900 border-yellow-300 scale-110'
                      : 'bg-blue-900 text-white border-blue-600',
                  )}
                >
                  ${v}
                </button>
              ))}
            </div>
            <Button variant="gold" size="lg" onClick={() => handleAction('bet', { amount: betAmount })}>
              Place Bet ${betAmount}
            </Button>
          </div>
        )}

        {/* Playing phase actions */}
        {phase === 'player' && isMyTurn && (
          <div className="flex gap-2 flex-wrap justify-center px-4">
            {legalActions.map((a: any) => {
              const labels: Record<string, string> = { hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split', insurance: 'Insurance', 'no-insurance': 'No Insurance' };
              return (
                <Button
                  key={a.type}
                  variant={a.type === 'stand' ? 'danger' : a.type === 'hit' ? 'gold' : 'secondary'}
                  onClick={() => doAction(a)}
                >
                  {labels[a.type] ?? a.type}
                </Button>
              );
            })}
          </div>
        )}
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
