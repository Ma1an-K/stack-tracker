import { useMemo } from 'react';
import { SessionWithPlayers, Player } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Swords, CalendarDays } from 'lucide-react';
import { H2HChart } from './H2HChart';
import { formatCurrency, formatProfit } from '@/lib/settlement';
import { parseISO, format } from 'date-fns';

interface HeadToHeadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myPlayer: Player | null;
  opponent: Player;
  sessions: SessionWithPlayers[];
  currency: string;
}

interface H2HStats {
  sharedSessions: number;
  myTotalProfit: number;
  opponentTotalProfit: number;
  myWins: number;
  opponentWins: number;
  ties: number;
  myAvgProfit: number;
  opponentAvgProfit: number;
  myBiggestWin: number;
  opponentBiggestWin: number;
  recentResults: {
    date: string;
    myProfit: number;
    opponentProfit: number;
  }[];
}

function calculateH2H(
  sessions: SessionWithPlayers[],
  myPlayerId: string,
  opponentId: string
): H2HStats {
  const shared = sessions.filter(s => {
    const playerIds = s.session_players.map(sp => sp.player_id);
    return playerIds.includes(myPlayerId) && playerIds.includes(opponentId);
  });

  let myTotalProfit = 0;
  let opponentTotalProfit = 0;
  let myWins = 0;
  let opponentWins = 0;
  let ties = 0;
  let myBiggestWin = 0;
  let opponentBiggestWin = 0;

  const recentResults: H2HStats['recentResults'] = [];

  shared
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .forEach(session => {
      const mySp = session.session_players.find(sp => sp.player_id === myPlayerId)!;
      const oppSp = session.session_players.find(sp => sp.player_id === opponentId)!;

      const myProfit = Number(mySp.cash_out) - Number(mySp.buy_in);
      const oppProfit = Number(oppSp.cash_out) - Number(oppSp.buy_in);

      myTotalProfit += myProfit;
      opponentTotalProfit += oppProfit;

      if (myProfit > oppProfit) myWins++;
      else if (oppProfit > myProfit) opponentWins++;
      else ties++;

      if (myProfit > myBiggestWin) myBiggestWin = myProfit;
      if (oppProfit > opponentBiggestWin) opponentBiggestWin = oppProfit;

      recentResults.push({
        date: session.date,
        myProfit,
        opponentProfit: oppProfit,
      });
    });

  const count = shared.length;

  return {
    sharedSessions: count,
    myTotalProfit,
    opponentTotalProfit,
    myWins,
    opponentWins,
    ties,
    myAvgProfit: count > 0 ? myTotalProfit / count : 0,
    opponentAvgProfit: count > 0 ? opponentTotalProfit / count : 0,
    myBiggestWin,
    opponentBiggestWin,
    recentResults,
  };
}

export function HeadToHead({ open, onOpenChange, myPlayer, opponent, sessions, currency }: HeadToHeadProps) {
  const stats = useMemo(() => {
    if (!myPlayer) return null;
    return calculateH2H(sessions, myPlayer.id, opponent.id);
  }, [sessions, myPlayer, opponent]);

  if (!myPlayer || !stats) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-muted-foreground" />
              Head to Head
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center py-6">
            Claim a player to see head-to-head stats
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  if (myPlayer.id === opponent.id) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-muted-foreground" />
              Head to Head
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center py-6">
            That's you! Select another player to compare.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const totalGames = stats.myWins + stats.opponentWins + stats.ties;
  const myWinPct = totalGames > 0 ? Math.round((stats.myWins / totalGames) * 100) : 0;
  const oppWinPct = totalGames > 0 ? Math.round((stats.opponentWins / totalGames) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-muted-foreground" />
            Head to Head
          </DialogTitle>
        </DialogHeader>

        {stats.sharedSessions === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            You and {opponent.name} haven't played together yet
          </p>
        ) : (
          <div className="space-y-4">
            {/* Names header */}
            <div className="grid grid-cols-3 text-center text-sm">
              <div className="font-semibold truncate">{myPlayer.name}</div>
              <div className="text-muted-foreground">vs</div>
              <div className="font-semibold truncate">{opponent.name}</div>
            </div>

            {/* Win record bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.myWins}W</span>
                <span>{stats.sharedSessions} sessions together</span>
                <span>{stats.opponentWins}W</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {myWinPct > 0 && (
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${myWinPct}%` }}
                  />
                )}
                {stats.ties > 0 && (
                  <div
                    className="bg-muted-foreground/30 transition-all"
                    style={{ width: `${100 - myWinPct - oppWinPct}%` }}
                  />
                )}
                {oppWinPct > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${oppWinPct}%` }}
                  />
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-y-3 text-center text-sm">
              <StatCell value={formatProfit(stats.myTotalProfit, currency)} positive={stats.myTotalProfit >= 0} />
              <div className="text-xs text-muted-foreground self-center">Total P&L</div>
              <StatCell value={formatProfit(stats.opponentTotalProfit, currency)} positive={stats.opponentTotalProfit >= 0} />

              <StatCell value={formatProfit(stats.myAvgProfit, currency)} positive={stats.myAvgProfit >= 0} />
              <div className="text-xs text-muted-foreground self-center">Avg/Session</div>
              <StatCell value={formatProfit(stats.opponentAvgProfit, currency)} positive={stats.opponentAvgProfit >= 0} />

              <StatCell value={formatCurrency(stats.myBiggestWin, currency)} positive />
              <div className="text-xs text-muted-foreground self-center">Best Session</div>
              <StatCell value={formatCurrency(stats.opponentBiggestWin, currency)} positive />
            </div>

            {/* Cumulative P&L chart */}
            <H2HChart
              results={stats.recentResults}
              myName={myPlayer.name}
              opponentName={opponent.name}
              currency={currency}
            />

            {/* Recent results */}
            {stats.recentResults.length > 0 && (
              <Card>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Recent Sessions</span>
                  </div>
                  <div className="space-y-1.5">
                    {stats.recentResults.slice(0, 10).map((r, i) => (
                      <div key={i} className="grid grid-cols-3 text-xs tabular-nums">
                        <span className={r.myProfit >= 0 ? 'profit' : 'loss'}>
                          {formatProfit(r.myProfit, currency)}
                        </span>
                        <span className="text-center text-muted-foreground">
                          {format(parseISO(r.date), 'MMM d')}
                        </span>
                        <span className={`text-right ${r.opponentProfit >= 0 ? 'profit' : 'loss'}`}>
                          {formatProfit(r.opponentProfit, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCell({ value, positive }: { value: string; positive: boolean }) {
  return (
    <div className={`font-semibold tabular-nums ${positive ? 'profit' : 'loss'}`}>
      {value}
    </div>
  );
}
