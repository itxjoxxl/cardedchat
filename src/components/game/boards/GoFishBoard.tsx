import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import Hand from '@/components/hand/Hand';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import type { BoardProps } from '../GameBoard';
import type { Rank } from '@/types';

const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

export default function GoFishBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [message, setMessage] = useState('');

  if (!state) return null;

  const gf = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localHand = localPlayer ? (gf.hands?.[localPlayer.id] ?? []) : [];
  const books: Record<string, string[]> = gf.books ?? {};
  const pond = gf.pond ?? [];

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  function handleAsk() {
    if (!selectedTarget || !selectedRank) return;
    doAction({ type: 'ask', payload: { targetId: selectedTarget, rank: selectedRank } });
    setSelectedTarget(null);
    setSelectedRank(null);
  }

  // Get unique ranks in hand
  const handRanks: Rank[] = [...new Set<Rank>(localHand.map((c: any) => c.rank as Rank))];

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
          const oppHand = gf.hands?.[opp.id] ?? [];
          const oppBooks = books[opp.id] ?? [];
          const isCurrent = state.players[state.currentPlayerIndex]?.id === opp.id;
          return (
            <button
              key={opp.id}
              onClick={() => isMyTurn && setSelectedTarget(opp.id)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-2xl transition-all',
                selectedTarget === opp.id && 'bg-yellow-500/20 ring-2 ring-yellow-400',
                isMyTurn && 'cursor-pointer',
              )}
            >
              <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={isCurrent} />
              <div className="text-xs text-white/40 font-ui">{oppHand.length} cards · {oppBooks.length} books</div>
            </button>
          );
        })}
      </div>

      {/* Pond */}
      <div className="flex flex-col items-center py-3">
        <div className="text-xs text-white/40 font-ui mb-1">🐟 Pond ({pond.length} cards)</div>
        <div className="w-[70px] h-[98px] rounded-xl bg-blue-900/40 border-2 border-blue-700/40 flex items-center justify-center">
          <span className="text-2xl">🐟</span>
        </div>
      </div>

      {/* Local player books */}
      {localPlayer && books[localPlayer.id]?.length > 0 && (
        <div className="flex justify-center gap-1 px-4 flex-wrap">
          {(books[localPlayer.id] ?? []).map((rank: string) => (
            <div key={rank} className="bg-yellow-900/40 border border-yellow-700/40 rounded-lg px-2 py-1 text-xs text-yellow-400 font-ui font-bold">
              {rank}s ✓
            </div>
          ))}
        </div>
      )}

      {/* Rank selection */}
      {isMyTurn && selectedTarget && (
        <div className="px-4 py-2">
          <p className="text-white/60 text-xs font-ui text-center mb-2">Ask for rank:</p>
          <div className="flex gap-1 flex-wrap justify-center">
            {handRanks.map((rank) => (
              <button
                key={rank}
                onClick={() => setSelectedRank(rank)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-sm font-bold font-card transition-all',
                  selectedRank === rank
                    ? 'bg-yellow-500 text-yellow-900'
                    : 'bg-black/30 text-white/60 hover:bg-white/10',
                )}
              >
                {rank}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Player hand */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Hand
          cards={localHand}
          playerId={localPlayer?.id ?? ''}
          isLocal
          faceUp
          size="sm"
        />
      </div>

      {/* Actions */}
      {isMyTurn && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-8 pt-8">
          <div className="flex gap-2 justify-center">
            {selectedTarget && selectedRank ? (
              <Button variant="gold" onClick={handleAsk}>
                Ask {opponents.find((o: any) => o.id === selectedTarget)?.name} for {selectedRank}s
              </Button>
            ) : (
              <p className="text-white/30 text-sm font-ui">
                {!selectedTarget ? 'Tap a player to ask' : 'Choose a rank'}
              </p>
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
