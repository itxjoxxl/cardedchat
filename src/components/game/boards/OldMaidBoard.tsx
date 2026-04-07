import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import Card from '@/components/card/Card';
import Hand from '@/components/hand/Hand';
import GameHUD from '@/components/game/GameHUD';
import ResultOverlay from '@/components/game/ResultOverlay';
import Avatar from '@/components/ui/Avatar';
import type { BoardProps } from '../GameBoard';

export default function OldMaidBoard({ gameId }: BoardProps) {
  const navigate = useNavigate();
  const { state, legalActions, doAction, isMyTurn, restart } = useGame(gameId);

  if (!state) return null;

  const om = state as any;
  const localPlayer = state.players.find((p: any) => p.isLocal);
  const opponents = state.players.filter((p: any) => !p.isLocal);
  const localHand = localPlayer ? (om.hands?.[localPlayer.id] ?? []) : [];
  const pairs: Record<string, number> = om.discardedPairs ?? {};
  const phase = om.phase;

  const gameOver = state.status === 'finished' || state.status === 'ended';
  const winners = state.winners.map((wid: string) => state.players.find((p: any) => p.id === wid)).filter(Boolean) as any[];
  const isWinner = localPlayer ? state.winners.includes(localPlayer.id) : false;

  const drawActions = legalActions.filter((a: any) => a.type === 'draw');

  return (
    <div className="relative w-full h-full bg-felt flex flex-col overflow-hidden">
      <GameHUD
        gameId={gameId}
        currentPlayerName={state.players[state.currentPlayerIndex]?.name ?? ''}
        isMyTurn={isMyTurn}
        onExit={() => navigate('/')}
      />

      {/* Opponents with face-down fans */}
      <div className="flex justify-around pt-20 pb-4 px-4">
        {opponents.map((opp: any) => {
          const oppHand = om.hands?.[opp.id] ?? [];
          const isCurrent = state.players[state.currentPlayerIndex]?.id === opp.id;
          const canDraw = isMyTurn && drawActions.some((a: any) => (a.payload as any)?.fromPlayerId === opp.id);

          return (
            <div key={opp.id} className="flex flex-col items-center gap-2">
              <Avatar emoji={opp.avatar} name={opp.name} size="sm" isCurrentTurn={isCurrent} />
              {/* Face-down fan - clickable to draw */}
              <div className="relative" style={{ height: 80, width: Math.min(oppHand.length * 16 + 50, 180) }}>
                {oppHand.map((card: any, idx: number) => (
                  <motion.div
                    key={card.id ?? idx}
                    whileHover={canDraw ? { y: -12, scale: 1.05 } : undefined}
                    className="absolute cursor-pointer"
                    style={{ left: idx * 16, top: 0, zIndex: idx }}
                    onClick={canDraw ? () => doAction({ type: 'draw', payload: { fromPlayerId: opp.id, cardIndex: idx } }) : undefined}
                  >
                    <Card card={card} faceUp={false} size="sm" />
                  </motion.div>
                ))}
              </div>
              <div className="text-xs text-white/40 font-ui">
                {oppHand.length} cards · {pairs[opp.id] ?? 0} pairs
              </div>
            </div>
          );
        })}
      </div>

      {/* Player hand with pairs info */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="text-white/50 text-xs font-ui">{pairs[localPlayer?.id ?? ''] ?? 0} pairs discarded</div>
        <Hand
          cards={localHand}
          playerId={localPlayer?.id ?? ''}
          isLocal
          faceUp
          size="md"
        />
      </div>

      {/* Phase message */}
      {isMyTurn && (
        <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-sm font-ui px-4">
          {phase === 'discard-pairs' ? 'Pairs are being removed...' : 'Pick a card from an opponent\'s hand'}
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
