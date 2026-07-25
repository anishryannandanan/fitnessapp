import { useState } from 'react';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { HAS_API, API_URL } from '@/lib/env';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Placeholder } from '@/components/ui/Placeholder';

const REPORTS: { type: string; label: string; ownerOnly?: boolean }[] = [
  { type: 'revenue', label: 'Revenue' },
  { type: 'expenses', label: 'Expenses' },
  { type: 'profit', label: 'Profit & Loss' },
  { type: 'payments', label: 'Payments' },
  { type: 'members', label: 'Member growth' },
  { type: 'branch-comparison', label: 'Branch comparison', ownerOnly: true },
];

export function Reports() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const [busy, setBusy] = useState<string | null>(null);

  const isOwner = user?.role === 'owner';
  const available = REPORTS.filter((r) => !r.ownerOnly || isOwner);

  // Fetch the export with the auth header, then trigger a browser download.
  const download = async (type: string, format: 'csv' | 'xlsx') => {
    if (!HAS_API || !token) return;
    setBusy(`${type}-${format}`);
    try {
      const res = await fetch(`${API_URL}/api/v1/reports/${type}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  if (!HAS_API) {
    return (
      <div>
        <PageHeader title="Reports" />
        <Placeholder
          icon={BarChart3}
          title="Reports & exports"
          description="Revenue, expense, profit, payments, member growth and branch comparison — exportable to CSV and Excel. Connect the API (VITE_API_URL) to generate live reports."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Export to CSV or Excel" />
      <div className="space-y-2">
        {available.map((r) => (
          <Card key={r.type} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={20} />
            </div>
            <span className="flex-1 font-medium text-text">{r.label}</span>
            <button
              onClick={() => download(r.type, 'csv')}
              disabled={busy !== null}
              className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-text disabled:opacity-50"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => download(r.type, 'xlsx')}
              disabled={busy !== null}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
