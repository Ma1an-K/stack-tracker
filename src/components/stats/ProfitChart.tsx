import { useMemo } from 'react';
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
  const isPositive = (data[data.length - 1]?.cumProfit ?? 0) >= 0;
  const colour = isPositive ? '#4ade80' : '#f87171';
  const colourMuted = isPositive ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)';

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
          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colour} stopOpacity={0.25} />
            <stop offset="95%" stopColor={colour} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine y={0} stroke="hsl(38 18% 18%)" strokeDasharray="3 3" />
        <XAxis
          dataKey="sessionNumber"
          ticks={ticks}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: 'hsl(225 10% 45%)' }}
          tickFormatter={v => `#${v}`}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fontSize: 10, fill: 'hsl(225 10% 45%)' }}
          tickFormatter={v => `${currency}${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(225 22% 8%)',
            border: '1px solid hsl(38 18% 18%)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'hsl(225 10% 55%)', marginBottom: 4 }}
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
          fill="url(#profitGradient)"
          dot={false}
          activeDot={{ r: 4, fill: colour, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
