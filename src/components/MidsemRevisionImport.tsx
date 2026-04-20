import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { MIDSEM_REVISION_ITEMS } from '@/data/midsemRevision';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw } from 'lucide-react';

export default function MidsemRevisionImport() {
  const bulkMarkForRevisionByName = useStore(s => s.bulkMarkForRevisionByName);
  const topicsCount = useStore(s => s.topics.length);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (topicsCount === 0) return null;

  const run = () => {
    setBusy(true);
    const { matched, missed } = bulkMarkForRevisionByName(MIDSEM_REVISION_ITEMS);
    setBusy(false);
    toast({
      title: `Marked ${matched} topics for revision`,
      description: missed.length
        ? `${missed.length} items had no syllabus match (skipped).`
        : 'All midsem topics moved to your revision schedule.',
    });
  };

  return (
    <div className="bg-card border rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">Midsem already covered?</div>
        <div className="text-xs text-muted-foreground">
          Mark all midsem topics as Done and add them to spaced revision (1d / 3d / 7d).
        </div>
      </div>
      <button
        onClick={run}
        disabled={busy}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <RotateCcw size={13} />
        {busy ? 'Working…' : 'Mark for revision'}
      </button>
    </div>
  );
}
