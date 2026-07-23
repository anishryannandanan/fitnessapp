import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

/** A friendly "coming soon" block for scaffolded-but-unbuilt screens. */
export function Placeholder({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="rounded-2xl bg-primary/10 p-4 text-primary">
        <Icon size={28} />
      </div>
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      <span className="mt-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
        Scaffold ready — feature to be built
      </span>
    </Card>
  );
}
