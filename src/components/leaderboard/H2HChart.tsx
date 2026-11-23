import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatProfit } from '@/lib/settlement';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

interface H2HChartProps {
  results: { date: string; myProfit: number; opponentProfit: number }[];
  myName: string;
  opponentName: string;
  currency: string;
}

export function H2HChart({ results, myName, opponentName, currency }: H2HChartProps) {
  const chartData = useMemo(() => {
    // Results come newest-first, reverse for chronological order
    const chronological = [...results].reverse();

    // Group by date, summing profits for same-day sessions
    const grouped = new Map<string, { myProfit: number; opponentProfit: number }>();
    for (const r of chronological) {
      const existing = grouped.get(r.date);
      if (existing) {
        existing.myProfit += r.myProfit;
        existing.opponentProfit += r.opponentProfit;
      } else {
        grouped.set(r.date, { myProfit: r.myProfit, opponentProfit: r.opponentProfit });
      }
    }

    let myCum = 0;
    let oppCum = 0;
    return Array.from(grouped.entries()).map(([date, totals]) => {
      myCum += totals.myProfit;
      oppCum += totals.opponentProfit;
      return {
        date: format(parseISO(date), 'MMM d'),
        [myName]: myCum,
        [opponentName]: oppCum,
      };
    });
  }, [results, myName, opponentName]);

  const reduceMotion = usePrefersReducedMotion();
  const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
  const money = (v: number) => `${v < 0 ? '−' : ''}${currency}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  if (chartData.length < 2) return null;

  const last = chartData[chartData.length - 1];
  const summary = `Cumulative profit in sessions you both played, over ${chartData.length} dates: ${myName} ${formatProfit(Number(last[myName]), currency)}, ${opponentName} ${formatProfit(Number(last[opponentName]), currency)}.`;

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="section-header">Cumulative P&L</span>
        </div>
        <div className="flex items-center gap-4 mb-2 text-xs" aria-hidden="true">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--gold))' }} />
            <span className="text-muted-foreground truncate max-w-[120px]" title={myName}>{myName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: "hsl(var(--chart-4))" }} />
            <span className="text-muted-foreground truncate max-w-[120px]" title={opponentName}>{opponentName}</span>
          </div>
        </div>
        <div role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis
              dataKey="date"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={money}
              width={52}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [money(value), name]}
            />
            <Line
              type="monotone"
              dataKey={myName}
              stroke="hsl(var(--gold))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--gold))' }}
              activeDot={{ r: 5 }}
              isAnimationActive={!reduceMotion}
            />
            <Line
              type="monotone"
              dataKey={opponentName}
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: 'hsl(var(--chart-4))' }}
              activeDot={{ r: 5 }}
              isAnimationActive={!reduceMotion}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
