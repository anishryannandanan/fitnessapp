import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from './Card';

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
}

export function KpiCard({ label, value, delta }: KpiCardProps) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="tabular text-2xl font-bold text-text">{value}</span>
      {delta !== undefined && (
        <span
          className={cn(
            'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            up ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
          )}
        >
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(delta)}%
        </span>
      )}
    </Card>
  );
}
