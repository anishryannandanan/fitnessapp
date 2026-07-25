import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Placeholder } from '@/components/ui/Placeholder';

/** Reusable screen for scaffolded routes without a full implementation yet. */
export function ComingSoon({ title, icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Placeholder icon={icon} title={title} description={description} />
    </div>
  );
}
