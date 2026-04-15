import { useEffect, useState, useCallback } from 'react';
import { TourStep } from './tours';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialOverlayProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
}

const PADDING = 6;

export function TutorialOverlay({ steps, currentStep, onNext, onSkip }: TutorialOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const step = steps[currentStep];

  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tutorial="${step.targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    const id = setTimeout(measureTarget, 50);
    window.addEventListener('resize', measureTarget);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', measureTarget);
    };
  }, [measureTarget]);

  if (!step) return null;

  const spotlightTop = rect ? rect.top - PADDING : 0;
  const spotlightLeft = rect ? rect.left - PADDING : 0;
  const spotlightW = rect ? rect.width + PADDING * 2 : 0;
  const spotlightH = rect ? rect.height + PADDING * 2 : 0;

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const tooltipW = Math.min(300, viewportW - 24);

  const spaceBelow = viewportH - (spotlightTop + spotlightH);
  const tooltipBelow = spaceBelow >= 170 || !rect;
  const tooltipTop = rect
    ? tooltipBelow
      ? spotlightTop + spotlightH + 12
      : spotlightTop - 170
    : viewportH / 2 - 85;
  const tooltipLeft = rect
    ? Math.max(12, Math.min(spotlightLeft, viewportW - tooltipW - 12))
    : 12;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div
        style={{
          position: 'absolute',
          top: spotlightTop,
          left: spotlightLeft,
          width: spotlightW,
          height: spotlightH,
          borderRadius: 8,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
          pointerEvents: 'none',
          transition: 'top 0.2s, left 0.2s, width 0.2s, height 0.2s',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipW,
          transition: 'top 0.2s, left 0.2s',
        }}
        className="rounded-xl border border-border bg-card shadow-xl p-4"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="font-semibold text-sm mb-1">{step.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
        <div className="flex items-center justify-between mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 text-muted-foreground"
            onClick={onSkip}
          >
            Skip tour
          </Button>
          <Button
            size="sm"
            className="text-xs h-7 px-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
            onClick={onNext}
          >
            {currentStep === steps.length - 1 ? 'Got it ✓' : 'Next →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
