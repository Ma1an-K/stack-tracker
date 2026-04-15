// src/contexts/TutorialContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { TourStep, OWNER_TOUR, PLAYER_TOUR } from '@/components/tutorial/tours';

type TourType = 'owner' | 'player';

interface TutorialContextValue {
  activeTour: TourType | null;
  currentStep: number;
  steps: TourStep[];
  startTour: (type: TourType) => void;
  nextStep: () => void;
  skipTour: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = activeTour === 'owner' ? OWNER_TOUR : activeTour === 'player' ? PLAYER_TOUR : [];

  const startTour = (type: TourType) => {
    const key = type === 'owner' ? 'tutorial_owner_seen' : 'tutorial_player_seen';
    if (localStorage.getItem(key)) return;
    setActiveTour(type);
    setCurrentStep(0);
  };

  const completeTour = (type: TourType) => {
    const key = type === 'owner' ? 'tutorial_owner_seen' : 'tutorial_player_seen';
    localStorage.setItem(key, '1');
    setActiveTour(null);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (!activeTour) return;
    if (currentStep >= steps.length - 1) {
      completeTour(activeTour);
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const skipTour = () => {
    if (activeTour) completeTour(activeTour);
  };

  return (
    <TutorialContext.Provider value={{ activeTour, currentStep, steps, startTour, nextStep, skipTour }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorialContext must be used within TutorialProvider');
  return ctx;
}
