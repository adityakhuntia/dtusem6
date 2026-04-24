import { useStore } from '@/store/useStore';
import { Topic, Status, Priority, Difficulty } from '@/store/types';
import { useState, useCallback, useMemo } from 'react';
import { Trash2, Plus, Search, X, Undo2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_SYLLABUS } from './SyllabusImport';

const statuses: Status[] = ['Not Started', 'In Progress', 'Done'];
const priorities: Priority[] = ['High', 'Medium', 'Low'];
const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

function statusClass(s: Status) {
  if (s === 'Done') return 'status-done';
  if (s === 'In Progress') return 'status-progress';
  return 'status-not-started';
}

function EditableCell({ value, onChange, type = 'text' }: { value: string | number; onChange: (v: string) => void; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    setEditing(false);
    if (draft !== String(value)) onChange(draft);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="cell-edit"
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }
  return (
    <div className="px-1 py-0.5 cursor-pointer text-sm truncate min-h-[24px]" onClick={() => { setDraft(String(value)); setEditing(true); }}>
      {value || <span className="text-muted-foreground">—</span>}
    </div>
  );
}

function SelectCell({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      className="cell-edit bg-transparent text-sm"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function MasterTracker() {
  const { topics, updateTopic, addTopic, deleteTopic, markTopicDone, undoDelete, restoreDefaultSyllabus } = useStore();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    const topic = topics.find(t => t.id === id);
    deleteTopic(id);
    toast({
      title: 'Topic deleted',
      description: topic ? `"${topic.topic}" removed.` : 'Topic removed.',
      action: (
        <button
          onClick={() => { const n = undoDelete(); if (n) toast({ title: 'Restored', description: `${n} topic restored.` }); }}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          <Undo2 size={12} /> Undo
        </button>
      ),
    });
  };

  const handleRestoreDefault = () => {
    const { added, restoredDone } = restoreDefaultSyllabus(DEFAULT_SYLLABUS);
    if (added === 0) {
      toast({ title: 'Nothing to restore', description: 'All default topics are already in your tracker.' });
    } else {
      toast({
        title: `Restored ${added} topic${added === 1 ? '' : 's'}`,
        description: restoredDone > 0
          ? `${restoredDone} marked as Done from previous revision history.`
          : 'Added back as Not Started.',
      });
    }
  };

  const [search, setSearch] = useState('');
  const [fCourse, setFCourse] = useState<string>('all');
  const [fUnit, setFUnit] = useState<string>('all');
  const [fStatus, setFStatus] = useState<string>('all');
  const [fPriority, setFPriority] = useState<string>('all');
  const [fDifficulty, setFDifficulty] = useState<string>('all');

  const courses = useMemo(() => [...new Set(topics.map(t => t.course))], [topics]);
  const units = useMemo(
    () => [...new Set(topics.filter(t => fCourse === 'all' || t.course === fCourse).map(t => t.unit))],
    [topics, fCourse]
  );

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter(t => {
      if (fCourse !== 'all' && t.course !== fCourse) return false;
      if (fUnit !== 'all' && t.unit !== fUnit) return false;
      if (fStatus !== 'all' && t.status !== fStatus) return false;
      if (fPriority !== 'all' && t.priority !== fPriority) return false;
      if (fDifficulty !== 'all' && t.difficulty !== fDifficulty) return false;
      if (q && !(`${t.topic} ${t.unitTitle} ${t.notes}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [topics, search, fCourse, fUnit, fStatus, fPriority, fDifficulty]);

  const courseStats = courses.map(c => {
    const ct = topics.filter(t => t.course === c);
    const done = ct.filter(t => t.status === 'Done').length;
    return { course: c, total: ct.length, done, pct: ct.length ? Math.round(done / ct.length * 100) : 0 };
  });

  const totalEst = topics.reduce((s, t) => s + t.estimatedTime, 0);
  const totalAct = topics.reduce((s, t) => s + t.actualTime, 0);

  const handleStatusChange = useCallback((id: string, val: string) => {
    updateTopic(id, 'status', val);
    if (val === 'Done') markTopicDone(id);
  }, [updateTopic, markTopicDone]);

  const activeFilterCount =
    (fCourse !== 'all' ? 1 : 0) +
    (fUnit !== 'all' ? 1 : 0) +
    (fStatus !== 'all' ? 1 : 0) +
    (fPriority !== 'all' ? 1 : 0) +
    (fDifficulty !== 'all' ? 1 : 0) +
    (search ? 1 : 0);

  const clearFilters = () => {
    setSearch(''); setFCourse('all'); setFUnit('all');
    setFStatus('all'); setFPriority('all'); setFDifficulty('all');
  };

  const filterSelectClass = "text-xs h-8 rounded-md border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Master Tracker</h2>
        <button
          onClick={() => addTopic({})}
          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>

      {/* Course stats */}
      <div className="flex flex-wrap gap-3">
        {courseStats.map(cs => (
          <button
            key={cs.course}
            onClick={() => setFCourse(fCourse === cs.course ? 'all' : cs.course)}
            className={`bg-card rounded-md px-3 py-2 text-xs border text-left transition hover:border-primary ${fCourse === cs.course ? 'border-primary ring-1 ring-primary' : ''}`}
          >
            <div className="font-medium truncate max-w-[200px]">{cs.course}</div>
            <div className="text-muted-foreground">{cs.done}/{cs.total} ({cs.pct}%)</div>
          </button>
        ))}
        <div className="bg-card rounded-md px-3 py-2 text-xs border">
          <div className="font-medium">Time</div>
          <div className="text-muted-foreground">Est: {totalEst}h | Act: {totalAct}h</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search topic, unit, notes…"
              className="w-full text-xs h-8 rounded-md border bg-background pl-7 pr-2 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select className={filterSelectClass} value={fCourse} onChange={e => { setFCourse(e.target.value); setFUnit('all'); }}>
            <option value="all">All courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={filterSelectClass} value={fUnit} onChange={e => setFUnit(e.target.value)}>
            <option value="all">All units</option>
            {units.map(u => <option key={u} value={u}>Unit {u}</option>)}
          </select>
          <select className={filterSelectClass} value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={filterSelectClass} value={fPriority} onChange={e => setFPriority(e.target.value)}>
            <option value="all">All priorities</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={filterSelectClass} value={fDifficulty} onChange={e => setFDifficulty(e.target.value)}>
            <option value="all">All difficulties</option>
            {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs h-8 px-2 rounded-md border hover:bg-muted transition"
            >
              <X size={12} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Showing {filteredTopics.length} of {topics.length} topics
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[70vh] border rounded-lg bg-card">
        <table className="w-full text-sm border-collapse min-w-[1200px]">
          <thead>
            <tr className="table-header border-b">
              {['Course','Unit','Unit Title','Topic','Status','Priority','Difficulty','Est.h','Act.h','Rev#','Last Rev','Notes',''].map(h => (
                <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTopics.map((t, i) => (
              <tr key={t.id} className={`border-b border-border/50 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                <td className="px-2 py-1 max-w-[150px]"><EditableCell value={t.course} onChange={v => updateTopic(t.id, 'course', v)} /></td>
                <td className="px-2 py-1 w-16"><EditableCell value={t.unit} onChange={v => updateTopic(t.id, 'unit', v)} /></td>
                <td className="px-2 py-1 max-w-[140px]"><EditableCell value={t.unitTitle} onChange={v => updateTopic(t.id, 'unitTitle', v)} /></td>
                <td className="px-2 py-1 max-w-[200px]"><EditableCell value={t.topic} onChange={v => updateTopic(t.id, 'topic', v)} /></td>
                <td className="px-2 py-1">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${statusClass(t.status)}`}>
                    <SelectCell value={t.status} options={statuses} onChange={v => handleStatusChange(t.id, v)} />
                  </span>
                </td>
                <td className="px-2 py-1"><SelectCell value={t.priority} options={priorities} onChange={v => updateTopic(t.id, 'priority', v)} /></td>
                <td className="px-2 py-1"><SelectCell value={t.difficulty} options={difficulties} onChange={v => updateTopic(t.id, 'difficulty', v)} /></td>
                <td className="px-2 py-1 w-16"><EditableCell value={t.estimatedTime} onChange={v => updateTopic(t.id, 'estimatedTime', Number(v))} type="number" /></td>
                <td className="px-2 py-1 w-16"><EditableCell value={t.actualTime} onChange={v => updateTopic(t.id, 'actualTime', Number(v))} type="number" /></td>
                <td className="px-2 py-1 w-12 text-center text-xs">{t.revisionCount}</td>
                <td className="px-2 py-1 w-24 text-xs">{t.lastRevisedDate || '—'}</td>
                <td className="px-2 py-1 max-w-[120px]"><EditableCell value={t.notes} onChange={v => updateTopic(t.id, 'notes', v)} /></td>
                <td className="px-2 py-1">
                  <button onClick={() => deleteTopic(t.id)} className="text-muted-foreground hover:text-destructive transition">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {topics.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No topics yet. Import your syllabus or add rows manually.</div>
        )}
        {topics.length > 0 && filteredTopics.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No topics match the current filters.</div>
        )}
      </div>
    </div>
  );
}
