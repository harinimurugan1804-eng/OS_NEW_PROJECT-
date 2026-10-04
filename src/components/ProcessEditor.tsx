export interface Row {
  name: string;
  arrival: string;
  priority: string;
  bursts: string;
}

export interface RowErrors {
  [index: number]: string | undefined;
}

interface Props {
  rows: Row[];
  errors: RowErrors;
  locked: boolean;
  onChange: (rows: Row[]) => void;
}

export const MAX_PROCESSES = 8;

export function ProcessEditor({ rows, errors, locked, onChange }: Props) {
  const update = (i: number, key: keyof Row, value: string) =>
    onChange(rows.map((r, k) => (k === i ? { ...r, [key]: value } : r)));

  return (
    <div className="editor">
      <div className="editor-head" aria-hidden="true">
        <span>Name</span>
        <span>Arrival</span>
        <span>Priority</span>
        <span>Bursts (CPU, I/O, CPU…)</span>
        <span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="editor-row-wrap">
          <div className="editor-row">
            <input aria-label={`Process ${i + 1} name`} value={r.name} disabled={locked}
              onChange={(e) => update(i, 'name', e.target.value)} />
            <input aria-label={`${r.name} arrival time`} inputMode="numeric" value={r.arrival} disabled={locked}
              onChange={(e) => update(i, 'arrival', e.target.value)} />
            <input aria-label={`${r.name} priority`} inputMode="numeric" value={r.priority} disabled={locked}
              onChange={(e) => update(i, 'priority', e.target.value)} />
            <input aria-label={`${r.name} bursts`} value={r.bursts} disabled={locked}
              onChange={(e) => update(i, 'bursts', e.target.value)} />
            <button type="button" className="icon" aria-label={`Remove ${r.name}`} disabled={locked || rows.length === 1}
              onClick={() => onChange(rows.filter((_, k) => k !== i))}>×</button>
          </div>
          {errors[i] && <p className="error">{errors[i]}</p>}
        </div>
      ))}
      <button type="button" className="secondary" disabled={locked || rows.length >= MAX_PROCESSES}
        onClick={() => onChange([...rows, { name: `P${rows.length + 1}`, arrival: '0', priority: '1', bursts: '2' }])}>
        Add process
      </button>
      {locked && <p className="note">Reset the simulation to edit processes.</p>}
    </div>
  );
}
