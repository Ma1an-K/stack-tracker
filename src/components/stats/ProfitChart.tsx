import { useId, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { SessionDataPoint } from '@/hooks/usePersonalStats';
import { formatProfit } from '@/lib/settlement';

interface ProfitChartProps {
  data: SessionDataPoint[];
  currency?: string;
  height?: number;
}

export function ProfitChart({ data, currency = '$', height = 160 }: ProfitChartProps) {
  // Brand line (gold) with a 20% fill; sign is carried by the axis and tooltip
  // values, not by hue alone (chart guidance from the design skill).
  const colour = 'hsl(var(--gold))';
  const gradientId = `profitGradient-${useId().replace(/:/g, '')}`;

  const ticks = useMemo(() => {
    if (data.length <= 6) return data.map(d => d.sessionNumber);
    const step = Math.ceil(data.length / 6);
    return data.filter(d => d.sessionNumber % step === 0 || d.sessionNumber === data.length).map(d => d.sessionNumber);
  }, [data]);

  if (data.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colour} stopOpacity={0.22} />
            <stop offset="95%" stopColor={colour} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.45} strokeDasharray="4 4" />
        <XAxis
          dataKey="sessionNumber"
          ticks={ticks}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={v => `#${v}`}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={v => `${currency}${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 12,
            fontSize: 12,
            boxShadow: '0 12px 30px -12px rgb(0 0 0 / 0.9)',
          }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
          labelFormatter={(v, payload) => {
            const d = payload?.[0]?.payload as SessionDataPoint | undefined;
            return d ? `Session #${v} · ${format(parseISO(d.date), 'MMM d, yyyy')}` : `Session #${v}`;
          }}
          formatter={(value: number) => [formatProfit(value, currency), 'Cumulative']}
          cursor={{ stroke: colour, strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Area
          type="monotone"
          dataKey="cumProfit"
          stroke={colour}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, fill: colour, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
