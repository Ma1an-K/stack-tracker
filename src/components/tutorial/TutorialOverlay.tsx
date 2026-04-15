// src/components/tutorial/TutorialOverlay.tsx
import { useEffect, useState, useCallback } from 'react';
import { TourStep } from './tours';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { InstallPromptInfo } from '@/hooks/useInstallPrompt';

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
  installPrompt: InstallPromptInfo;
}

const PADDING = 6;
const INSTALL_TARGET_ID = 'tutorial-install';

export function TutorialOverlay({ steps, currentStep, onNext, onSkip, installPrompt }: TutorialOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const step = steps[currentStep];
  const isInstallStep = step?.targetId === INSTALL_TARGET_ID;

  // Auto-skip install step on unsupported platforms or already-installed
  useEffect(() => {
    if (
      isInstallStep &&
      (installPrompt.platform === 'installed' || installPrompt.platform === 'unsupported')
    ) {
      onNext();
    }
  }, [isInstallStep, installPrompt.platform, onNext]);

  const measureTarget = useCallback(() => {
    if (!step || isInstallStep) return;
    const el = document.querySelector(`[data-tutorial="${step.targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step?.targetId, isInstallStep]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setTimeout(measureTarget, 50);
    window.addEventListener('resize', measureTarget);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', measureTarget);
    };
  }, [measureTarget]);

  if (!step) return null;

  // Suppress render while auto-skip effect fires
  if (
    isInstallStep &&
    (installPrompt.platform === 'installed' || installPrompt.platform === 'unsupported')
  ) {
    return null;
  }

  // Install step: full-screen dim + centered card, no spotlight
  if (isInstallStep) {
    const cardW = Math.min(300, window.innerWidth - 24);
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: cardW,
          }}
          className="rounded-xl border border-border bg-card shadow-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
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
          <p className="font-semibold text-sm mb-2">{step.title}</p>
          {installPrompt.platform === 'android' ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {step.description}
              </p>
              <Button
                className="w-full text-sm h-9 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold mb-2"
                onClick={() => {
                  installPrompt.trigger?.();
                  onNext();
                }}
              >
                Install App
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Tap <strong>Share ↑</strong> in your browser, then tap{' '}
              <strong>Add to Home Screen</strong> to install Stack Tracker for the best experience.
            </p>
          )}
          <button
            onClick={onSkip}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  // Normal spotlight tooltip (unchanged)
  const spotlightTop = rect ? rect.top - PADDING : 0;
  const spotlightLeft = rect ? rect.left - PADDING : 0;
  const spotlightW = rect ? rect.width + PADDING * 2 : 0;
  const spotlightH = rect ? rect.height + PADDING * 2 : 0;

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const tooltipW = Math.min(300, viewportW - 24);

  const spaceBelow = viewportH - (spotlightTop + spotlightH);
  const tooltipBelow = spaceBelow >= 220 || !rect;
  const tooltipTop = rect
    ? tooltipBelow
      ? spotlightTop + spotlightH + 12
      : spotlightTop - 220
    : viewportH / 2 - 110;
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
