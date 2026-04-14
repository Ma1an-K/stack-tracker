import { PlayerBadge, sortBadges } from '@/lib/badges';
import { formatCurrency } from '@/lib/settlement';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getHeaterImage } from '@/assets/badges/heater';
import { getColdImage } from '@/assets/badges/cold';
import { getStaticBadgeImage } from '@/assets/badges/static_badges';

interface PlayerBadgesProps {
  badges: PlayerBadge[];
  currency?: string;
  maxDisplay?: number;
  size?: 'sm' | 'md';
}

export function PlayerBadges({ badges, currency = '$', maxDisplay, size = 'sm' }: PlayerBadgesProps) {
  if (badges.length === 0) return null;

  const sorted = sortBadges(badges);
  const displayed = maxDisplay ? sorted.slice(0, maxDisplay) : sorted;
  const overflow = maxDisplay ? sorted.length - maxDisplay : 0;

  return (
    <div className="flex flex-nowrap gap-1 items-center">
      {displayed.map((pb, i) => (
        <BadgePill key={pb.badge.id + '-' + i} playerBadge={pb} currency={currency} size={size} />
      ))}
      {overflow > 0 && (
        <OverflowBadges badges={sorted.slice(maxDisplay!)} currency={currency} count={overflow} size={size} />
      )}
    </div>
  );
}

function BadgePill({ playerBadge, currency, size }: { playerBadge: PlayerBadge; currency: string; size: 'sm' | 'md' }) {
  const { badge, value } = playerBadge;
  const isSmall = size === 'sm';

  // Resolve badge image: streak (animated set) or static (single image)
  const isHeater = badge.id === 'heater';
  const isCold = badge.id === 'ice_cold';
  const streakImg = isHeater && value ? getHeaterImage(value)
    : isCold && value ? getColdImage(value)
    : null;
  const staticImg = !streakImg ? getStaticBadgeImage(badge.id) : null;
  const badgeImg = streakImg ?? staticImg;

  const label = badge.category === 'streak' && value && !badgeImg
    ? `${badge.emoji} ${value}`
    : !badgeImg ? badge.emoji : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50
            hover:bg-muted hover:border-border transition-colors cursor-pointer select-none
            ${isSmall ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
            ${badgeImg ? '!border-none !bg-transparent !p-0' : ''}`}
        >
          {badgeImg ? (
            <img
              src={badgeImg}
              alt={badge.name}
              className={isSmall ? 'h-9 w-9 object-contain' : 'h-14 w-14 object-contain'}
              loading="lazy"
            />
          ) : (
            <span>{label}</span>
          )}
          {!isSmall && !badgeImg && (
            <span className="text-muted-foreground font-medium">{badge.name}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" side="top" align="center">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {badgeImg ? (
              <img src={badgeImg} alt={badge.name} className="h-14 w-14 object-contain" />
            ) : (
              <span className="text-lg">{badge.emoji}</span>
            )}
            <span className="font-semibold text-sm">{badge.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
          {value !== undefined && badge.category !== 'milestone' && (
            <p className="text-xs font-medium tabular-nums text-foreground">
              {badge.category === 'streak'
                ? `${value} session streak`
                : badge.category === 'competitive'
                  ? formatCurrency(value, currency)
                  : `${value}`}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OverflowBadges({ badges, currency, count, size }: { badges: PlayerBadge[]; currency: string; count: number; size: 'sm' | 'md' }) {
  const isSmall = size === 'sm';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center rounded-full border border-border/60 bg-muted/50 
            hover:bg-muted hover:border-border transition-colors cursor-pointer select-none text-muted-foreground
            ${isSmall ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}`}
        >
          +{count}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" side="top" align="center">
        <div className="space-y-2">
          {badges.map((pb, i) => {
            const isStreakBadge = pb.badge.id === 'heater' || pb.badge.id === 'ice_cold';
            const sImg = isStreakBadge && pb.value
              ? (pb.badge.id === 'heater' ? getHeaterImage(pb.value) : getColdImage(pb.value))
              : null;
            const stImg = !sImg ? getStaticBadgeImage(pb.badge.id) : null;
            const img = sImg ?? stImg;
            return (
              <div key={pb.badge.id + '-' + i} className="flex items-center gap-2">
                {img ? (
                  <img src={img} alt={pb.badge.name} className={sImg ? 'h-8 w-auto object-contain' : 'h-8 w-8 object-contain'} />
                ) : (
                  <span>{pb.badge.emoji}</span>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium">{pb.badge.name}</span>
                  <p className="text-xs text-muted-foreground truncate">{pb.badge.description}</p>
                </div>
                {pb.value !== undefined && pb.badge.category === 'competitive' && (
                  <span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(pb.value, currency)}</span>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
