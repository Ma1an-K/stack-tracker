import { SidepotCalculator } from '@/components/calculator/SidepotCalculator';
import { Calculator } from 'lucide-react';

export function CalculatorPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Sidepot Calculator</h1>
      </div>
      
      <p className="text-muted-foreground">
        Calculate sidepots and determine winners for multi-way all-in situations.
        Supports multiple runouts with shared boards.
      </p>
      
      <SidepotCalculator />
    </div>
  );
}
