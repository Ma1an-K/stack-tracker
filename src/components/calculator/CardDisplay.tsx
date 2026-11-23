import { Card, formatCard, SUITS, RANKS, Suit, Rank } from '@/lib/poker/cards';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
        'relative bg-[#f6f1e7] rounded-lg shadow-[0_4px_12px_-4px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(0_0_0/0.08)] flex flex-col items-center justify-center font-bold',
        sizeClasses[size],
        className
      )}
    >
      <span className={cn('leading-none', colorClass)}>{rank}</span>
      <span className={cn('leading-none', colorClass)}>{suitSymbol}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${rank}${suitSymbol}`}
          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-foreground ring-2 ring-background before:absolute before:-inset-2.5 before:content-[''] hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-3.5 w-3.5" />
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
  
  // Phones: a bottom sheet with suits as columns and ranks as rows, so every
  // card is a ~80×40px target instead of 26×34 in a cramped popover.
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild disabled={disabled}>
          {children}
        </DialogTrigger>
        <DialogContent className="gap-3">
          <DialogHeader>
            <DialogTitle>Pick a card</DialogTitle>
            <DialogDescription className="sr-only">Choose a rank and suit</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-1.5">
            {RANKS.map(rank =>
              SUITS.map(suit => {
                const card = `${rank}${suit}` as Card;
                const isUsed = (usedCounts.get(card) || 0) >= maxPerCard;
                const { suitSymbol, colorClass } = formatCard(card);
                return (
                  <button
                    key={card}
                    onClick={() => handleSelect(rank, suit)}
                    disabled={isUsed}
                    aria-label={`${rank} ${suit}`}
                    className={cn(
                      'pressable flex h-10 items-center justify-center gap-1 rounded-lg text-base font-bold',
                      isUsed ? 'bg-muted text-muted-foreground opacity-30' : 'bg-[#f6f1e7] shadow-sm',
                      colorClass
                    )}
                  >
                    <span className="leading-none">{rank}</span>
                    <span className="leading-none">{suitSymbol}</span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" sideOffset={4}>
        <div className="grid gap-1">
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
                    aria-label={`${rank} ${suit}`}
                    className={cn(
                      'flex h-10 w-8 flex-col items-center justify-center rounded-md text-xs font-bold transition-[transform,opacity] active:scale-95',
                      isUsed ? 'cursor-not-allowed bg-muted text-muted-foreground opacity-30' : 'cursor-pointer bg-[#f6f1e7] hover:brightness-95',
                      colorClass
                    )}
                  >
                    <span className="leading-none">{rank}</span>
                    <span className="leading-none text-[0.625rem]">{suitSymbol}</span>
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
        aria-label="Add card"
        className={cn(
          'min-w-0 rounded-lg border-2 border-dashed border-gold/30 bg-muted/40 px-0 text-gold hover:bg-gold/10',
          sizeClasses[size]
        )}
      >
        {placeholder}
      </Button>
    </CardPicker>
  );
}
