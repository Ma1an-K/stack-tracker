import { SidepotCalculator } from '@/components/calculator/SidepotCalculator';
import { PageHeader } from '@/components/common/PageHeader';

export function CalculatorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tools"
        title="Sidepot calculator"
        subtitle="Work out sidepots and winners for multi-way all-ins, including multiple runouts."
      />
      <SidepotCalculator />
    </div>
  );
}
