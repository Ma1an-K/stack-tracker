import { Card, formatCard, SUITS, RANKS, Suit, Rank } from '@/lib/poker/cards';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface CardDisplayProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  onRemove?: () => void;
  className?: string;
}

export function CardDisplay({ card, size = 'md', onRemove, className }: CardDisplayProps) {
  const { rank, suitSymbol, colorClass } = formatCard(card);
  const isMobile = useIsMobile();
  
  // Slightly smaller on mobile to fit more content
  const sizeClasses = {
    sm: isMobile ? 'w-7 h-9 text-xs' : 'w-8 h-10 text-sm',
    md: isMobile ? 'w-9 h-12 text-sm' : 'w-10 h-14 text-base',
    lg: isMobile ? 'w-12 h-16 text-lg' : 'w-14 h-20 text-xl',
  };
  
  return (
    <div 
      className={cn(
        'relative bg-white rounded-md shadow-md flex flex-col items-center justify-center font-bold border border-border/20',
        sizeClasses[size],
        className
      )}
    >
      <span className={cn('leading-none', colorClass)}>{rank}</span>
      <span className={cn('leading-none', colorClass)}>{suitSymbol}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-white hover:bg-destructive/80"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface CardPickerProps {
  usedCards: Card[];
  onSelect: (card: Card) => void;
  disabled?: boolean;
  children: React.ReactNode;
  maxPerCard?: number;
}

export function CardPicker({ usedCards, onSelect, disabled, children, maxPerCard = 1 }: CardPickerProps) {
  const [open, setOpen] = useState(false);
  // Count occurrences of each card in usedCards
  const usedCounts = new Map<string, number>();
  for (const c of usedCards) {
    usedCounts.set(c, (usedCounts.get(c) || 0) + 1);
  }
  const isMobile = useIsMobile();
  
  const handleSelect = (rank: Rank, suit: Suit) => {
    const card = `${rank}${suit}` as Card;
    const count = usedCounts.get(card) || 0;
    if (count < maxPerCard) {
      onSelect(card);
      setOpen(false);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "p-2",
          // On mobile, constrain width and make scrollable
          isMobile ? "max-w-[90vw] overflow-x-auto" : "w-auto"
        )} 
        align="start"
        sideOffset={4}
      >
        <div className={cn(
          "grid gap-1",
          // Ensure minimum width so cards don't shrink
          isMobile && "min-w-max"
        )}>
          {SUITS.map(suit => (
            <div key={suit} className="flex gap-1">
              {RANKS.map(rank => {
                const card = `${rank}${suit}` as Card;
                    const isUsed = (usedCounts.get(card) || 0) >= maxPerCard;
                const { suitSymbol, colorClass } = formatCard(card);
                
                return (
                  <button
                    key={card}
                    onClick={() => handleSelect(rank, suit)}
                    disabled={isUsed}
                    className={cn(
                      'font-bold rounded border flex flex-col items-center justify-center transition-colors',
                      // Smaller cards on mobile to fit more, but still tappable
                      isMobile 
                        ? 'w-[26px] h-[34px] text-[10px] active:scale-95' 
                        : 'w-7 h-9 text-xs',
                      isUsed
                        ? 'bg-muted text-muted-foreground opacity-30 cursor-not-allowed'
                        : 'bg-white hover:bg-accent border-border/30 cursor-pointer',
                      colorClass
                    )}
                  >
                    <span className="leading-none">{rank}</span>
                    <span className="leading-none text-[8px]">{suitSymbol}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface CardSlotProps {
  card?: Card;
  usedCards: Card[];
  onSelect: (card: Card) => void;
  onRemove: () => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  maxPerCard?: number;
}

export function CardSlot({ card, usedCards, onSelect, onRemove, placeholder = '+', size = 'md', maxPerCard = 1 }: CardSlotProps) {
  const isMobile = useIsMobile();
  
  // Compact sizes on mobile
  const sizeClasses = {
    sm: isMobile ? 'w-7 h-9 text-xs' : 'w-8 h-10 text-sm',
    md: isMobile ? 'w-9 h-12 text-sm' : 'w-10 h-14 text-base',
    lg: isMobile ? 'w-12 h-16 text-lg' : 'w-14 h-20 text-xl',
  };
  
  if (card) {
    return <CardDisplay card={card} size={size} onRemove={onRemove} />;
  }
  
  return (
    <CardPicker usedCards={usedCards} onSelect={onSelect} maxPerCard={maxPerCard}>
      <Button
        variant="outline"
        className={cn(
          'border-dashed border-2 bg-muted/30 hover:bg-muted/50',
          sizeClasses[size]
        )}
      >
        {placeholder}
      </Button>
    </CardPicker>
  );
}
