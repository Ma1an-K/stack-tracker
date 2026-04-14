import { GrinderBadge } from '@/components/badges/icons/BadgeIcons';
import { getStaticBadgeImage } from '@/assets/badges/static_badges';
import { ComponentType } from 'react';

interface BadgeDef {
  id: string;
  name: string;
  Badge?: ComponentType<{ size?: number; className?: string }>;
  category: 'competitive' | 'milestone' | 'achievement';
  description: string;
  awardedTo: string;
  accent: string;
  border: string;
}

const BADGES: BadgeDef[] = [
  {
    id: 'high_roller',
    name: 'High Roller',
    category: 'competitive',
    description: 'The most coveted badge at the table. Holds the all-time record for the single biggest winning session in this homegame.',
    awardedTo: 'Biggest single-session profit (all-time)',
    accent: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  {
    id: 'donkey',
    name: 'Donkey',
    category: 'competitive',
    description: 'The badge nobody wants to hold. Carries the all-time record for the single biggest losing session.',
    awardedTo: 'Biggest single-session loss (all-time)',
    accent: 'text-red-400',
    border: 'border-red-500/30',
  },
  {
    id: 'shark',
    name: 'Shark',
    category: 'competitive',
    description: 'The apex predator. Sitting at the top of the all-time leaderboard. Only one player can hold this.',
    awardedTo: 'Monthly leaderboard leader',
    accent: 'text-teal-400',
    border: 'border-teal-500/30',
  },
  {
    id: 'atm',
    name: 'ATM',
    category: 'competitive',
    description: "The table's personal cash machine. Has donated more to the group than anyone else across all sessions.",
    awardedTo: 'Biggest total losses this month',
    accent: 'text-red-400',
    border: 'border-red-500/25',
  },
  {
    id: 'grinder',
    name: 'Grinder',
    Badge: GrinderBadge,
    category: 'milestone',
    description: 'Committed to the craft. Has sat down at the table more than anyone else in the group.',
    awardedTo: 'Most sessions played',
    accent: 'text-amber-400',
    border: 'border-amber-500/25',
  },
  {
    id: 'dead_money',
    name: 'Dead Money',
    category: 'achievement',
    description: 'The ghost of poker past. Has posted a losing net result for 3 consecutive calendar months.',
    awardedTo: '3 losing months in a row',
    accent: 'text-slate-400',
    border: 'border-slate-500/25',
  },
  {
    id: 'whale',
    name: 'Whale',
    category: 'milestone',
    description: 'High stakes, high life. Has the biggest average buy-in per session — consistently puts the most on the line.',
    awardedTo: 'Highest average buy-in per session (min. 3 sessions)',
    accent: 'text-blue-400',
    border: 'border-blue-500/25',
  },
];

const CAT = {
  competitive: { label: 'Competitive', dot: 'bg-amber-500', pill: 'text-amber-400 bg-amber-500/10 border border-amber-500/30', note: 'Held by one player at a time' },
  milestone:   { label: 'Milestone',   dot: 'bg-blue-400',  pill: 'text-blue-400 bg-blue-500/10 border border-blue-500/30',   note: 'Leader recalculated each session' },
  achievement: { label: 'Achievement', dot: 'bg-slate-400', pill: 'text-slate-300 bg-slate-500/10 border border-slate-500/30', note: 'Condition-based, stays until lost' },
};

function BadgeDisplay({ badge, size }: { badge: BadgeDef; size: number }) {
  const img = getStaticBadgeImage(badge.id);
  if (img) {
    return <img src={img} alt={badge.name} style={{ width: size, height: size }} className="object-contain" />;
  }
  if (badge.Badge) {
    return <badge.Badge size={size} />;
  }
  return null;
}

export function BadgePreviewPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-5 py-10 space-y-10">

        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Card Crew Ledger</p>
          <h1 className="text-3xl font-bold tracking-tight">Badge Gallery</h1>
          <p className="text-muted-foreground text-sm">Give feedback before these go live</p>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(CAT) as [keyof typeof CAT, typeof CAT[keyof typeof CAT]][]).map(([key, c]) => (
            <div key={key} className="flex items-start gap-3 rounded-lg bg-card border border-border/50 p-3">
              <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
              <div>
                <p className="text-sm font-semibold">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Badge cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BADGES.map(b => {
            const c = CAT[b.category];
            return (
              <div key={b.id}
                className={`rounded-xl border ${b.border} bg-card p-5 flex flex-col gap-4`}>
                {/* Badge + name */}
                <div className="flex items-center gap-4">
                  <BadgeDisplay badge={b} size={96} />
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-bold text-xl leading-tight">{b.name}</h3>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${c.pill}`}>
                      {c.label}
                    </span>
                  </div>
                </div>
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
                {/* Awarded to */}
                <div className="mt-auto border-t border-border/30 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Awarded to
                  </p>
                  <p className={`text-sm font-semibold ${b.accent}`}>{b.awardedTo}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scale demo */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">How They Scale</h2>
          <div className="rounded-xl bg-card border border-border/50 p-6 space-y-8">

            {/* 96px */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                96px — My Stats / profile cards
              </p>
              <div className="flex gap-3 flex-wrap items-end">
                {BADGES.map(b => <BadgeDisplay key={b.id} badge={b} size={96} />)}
              </div>
            </div>

            {/* 48px in pill */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                48px — badge pill in stats sections
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                {BADGES.map(b => (
                  <div key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 pr-2.5">
                    <BadgeDisplay badge={b} size={48} />
                    <span className="text-xs font-medium text-muted-foreground">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock leaderboard at 28px */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                28px — leaderboard row
              </p>
              <div className="space-y-1.5 max-w-sm">
                {BADGES.slice(0, 4).map((b, i) => (
                  <div key={b.id}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-medium">Player {i + 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeDisplay badge={b} size={28} />

                      <span className="text-sm font-semibold text-green-500 tabular-nums">
                        +{(1200 - i * 310).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
