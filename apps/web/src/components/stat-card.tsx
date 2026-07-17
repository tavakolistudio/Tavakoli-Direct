import { Card } from '@tavakoli/ui';
import { toPersianDigits } from '@/lib/dates';

export function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'brand' | 'warning';
}): React.ReactElement {
  const valueColor =
    tone === 'brand'
      ? 'text-brand-dark'
      : tone === 'warning'
        ? 'text-amber-600'
        : 'text-neutral-900';
  return (
    <Card className="p-4">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className={`tabular-fa mt-1 text-2xl font-bold ${valueColor}`}>
        {toPersianDigits(value)}
      </div>
    </Card>
  );
}
