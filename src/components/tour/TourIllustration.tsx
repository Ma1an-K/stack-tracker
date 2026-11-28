import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TourCard } from '@/lib/onboarding/tour';

type Illustration = TourCard['illustration'];

/** A small mocked bit of app UI. Decorative: the card's title and body carry the meaning. */
export function TourIllustration({ kind }: { kind: Illustration }) {
  return (
    <div
      aria-hidden="true"
      className="relative grid h-[150px] place-items-center overflow-hidden rounded-[18px] border border-border bg-[radial-gradient(120%_90%_at_50%_0%,hsl(var(--gold)/0.12),hsl(var(--card)))]"
    >
      {DRAWINGS[kind]}
    </div>
  );
}

function Pill({ on, title, note }: { on?: boolean; title: string; note: string }) {
  return (
    <div
      className={cn(
        'grid min-w-0 flex-1 gap-0.5 rounded-xl border px-2.5 py-2 text-[13px] leading-tight',
        on ? 'border-gold/55 bg-gold/10' : 'border-border bg-secondary',
      )}
    >
      <b className="font-semibold">{title}</b>
      <small className="text-[11px] text-muted-foreground">{note}</small>
    </div>
  );
}

function BigPlus() {
  return (
    <div className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full bg-gold text-[30px] leading-none text-gold-foreground shadow-[0_0_0_8px_hsl(var(--gold)/0.12)]">
      +
    </div>
  );
}

function PillRow({ children }: { children: ReactNode }) {
  return <div className="flex w-full items-center gap-2.5 px-4">{children}</div>;
}

function List({ children }: { children: ReactNode }) {
  return <div className="grid w-[calc(100%-40px)] gap-[7px]">{children}</div>;
}

function Row({ compact, children }: { compact?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-[11px] border border-border bg-secondary px-3 text-[13px] leading-tight',
        compact ? 'py-1.5' : 'py-2',
      )}
    >
      {children}
    </div>
  );
}

function Transfer({ from, to, amount, paid }: { from: string; to: string; amount: string; paid?: boolean }) {
  return (
    <Row>
      <span>{from}</span>
      <span className="text-muted-foreground">→</span>
      <span>{to}</span>
      <span className="flex-1" />
      <span className="font-semibold tabular-nums">{amount}</span>
      {paid ? (
        <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-gold text-gold-foreground">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : (
        <span className="h-[18px] w-[18px] rounded-[5px] border border-border" />
      )}
    </Row>
  );
}

function Rank({ place, name, amount, up }: { place: number; name: string; amount: string; up: boolean }) {
  return (
    <Row compact>
      <span
        className={cn(
          'grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold tabular-nums',
          place === 1 ? 'bg-gold text-gold-foreground' : 'bg-border',
        )}
      >
        {place}
      </span>
      <span>{name}</span>
      <span className="flex-1" />
      <span className={cn('font-semibold tabular-nums', up ? 'text-success' : 'text-danger')}>{amount}</span>
    </Row>
  );
}

function MenuTile({ hl, children }: { hl?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid h-[58px] place-items-center rounded-xl border p-1 text-center text-[11px] leading-tight',
        hl ? 'border-gold/55 bg-gold/10 text-gold-bright' : 'border-border bg-secondary',
      )}
    >
      {children}
    </div>
  );
}

const SPARK_LINE = 'M0 62 L40 70 L80 52 L120 58 L160 38 L200 44 L240 22 L300 14';

const DRAWINGS: Record<Illustration, ReactNode> = {
  log: (
    <PillRow>
      <Pill on title="Play live" note="Buy-ins and rebuys as you go" />
      <BigPlus />
      <Pill title="Final totals" note="Game’s done, add the numbers" />
    </PillRow>
  ),
  oneoff: (
    <PillRow>
      <Pill on title="Live game" note="No homegame needed" />
      <BigPlus />
      <Pill title="Final totals" note="Just the numbers" />
    </PillRow>
  ),
  settle: (
    <List>
      <Transfer from="Sam" to="Dana" amount="$30" paid />
      <Transfer from="Alex" to="Dana" amount="$15" />
      <Transfer from="Alex" to="Priya" amount="$5" />
    </List>
  ),
  standings: (
    // The badge sits above the list (not over it), so it never covers the leader's amount.
    <div className="grid w-[calc(100%-40px)] gap-1.5">
      <span className="justify-self-end rounded-full border border-gold/40 bg-gold/10 px-[9px] py-[3px] text-[11px] font-semibold leading-tight text-gold-bright">
        Hot streak
      </span>
      <div className="grid gap-[5px]">
        <Rank place={1} name="Dana" amount="+$240" up />
        <Rank place={2} name="Priya" amount="+$85" up />
        <Rank place={3} name="Sam" amount="−$60" up={false} />
      </div>
    </div>
  ),
  stats: (
    <svg viewBox="0 0 300 90" className="h-[90px] w-[calc(100%-40px)]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tour-spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--gold))" stopOpacity="0.35" />
          <stop offset="1" stopColor="hsl(var(--gold))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2="300" y1="60" y2="60" stroke="hsl(var(--border))" strokeDasharray="3 4" />
      <path d={`${SPARK_LINE} L300 90 L0 90Z`} fill="url(#tour-spark-fill)" />
      <path d={SPARK_LINE} fill="none" stroke="hsl(var(--gold-bright))" strokeWidth="2.5" />
      <circle cx="296" cy="14" r="4" fill="hsl(var(--gold-bright))" />
    </svg>
  ),
  run: (
    <div className="grid grid-cols-[repeat(3,84px)] gap-2">
      <MenuTile hl>Invites</MenuTile>
      <MenuTile>Members</MenuTile>
      <MenuTile>Players</MenuTile>
      <MenuTile hl>Approve claims</MenuTile>
      <MenuTile>Admins</MenuTile>
      <MenuTile>Badges</MenuTile>
    </div>
  ),
  crew: (
    <PillRow>
      <Pill on title="Start a homegame" note="Standings for the regulars" />
      <Pill title="Join with code" note="From your host" />
    </PillRow>
  ),
};
