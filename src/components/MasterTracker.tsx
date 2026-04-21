import { useStore } from '@/store/useStore';
import { Topic, Status, Priority, Difficulty } from '@/store/types';
import { useState, useCallback, useMemo } from 'react';
import { Trash2, Plus, Search, X } from 'lucide-react';

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
  const { topics, updateTopic, addTopic, deleteTopic, markTopicDone } = useStore();

  const courses = [...new Set(topics.map(t => t.course))];
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
          <div key={cs.course} className="bg-card rounded-md px-3 py-2 text-xs border">
            <div className="font-medium truncate max-w-[200px]">{cs.course}</div>
            <div className="text-muted-foreground">{cs.done}/{cs.total} ({cs.pct}%)</div>
          </div>
        ))}
        <div className="bg-card rounded-md px-3 py-2 text-xs border">
          <div className="font-medium">Time</div>
          <div className="text-muted-foreground">Est: {totalEst}h | Act: {totalAct}h</div>
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
            {topics.map((t, i) => (
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
      </div>
    </div>
  );
}
