import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

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

  if (chartData.length < 2) return null;

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Cumulative P&L</span>
        </div>
        <div className="flex items-center gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            <span className="text-muted-foreground truncate max-w-[80px]">{myName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-muted-foreground truncate max-w-[80px]">{opponentName}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${currency}${v}`}
              width={45}
              className="fill-muted-foreground"
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [`${currency}${value.toFixed(0)}`, name]}
            />
            <Line
              type="monotone"
              dataKey={myName}
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, fill: '#22c55e' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey={opponentName}
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: '#ef4444' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
