import type { SimState } from '../engine/types';
import { processColor } from './colors';

const CELL = 32;

export function GanttChart({ sim }: { sim: SimState }) {
  if (sim.gantt.length === 0) return <p className="empty">The chart fills in as the clock runs.</p>;
  const name = (pid: number) => sim.pcbs.find((p) => p.pid === pid)?.name ?? `P${pid}`;
  const end = sim.gantt[sim.gantt.length - 1].end;

  return (
    <div className="gantt-scroll">
      <div className="gantt" style={{ width: end * CELL + 2 }}>
        <div className="gantt-bars">
          {sim.gantt.map((g) => (
            <div
              key={g.start}
              className={g.pid === null ? 'bar idle' : 'bar'}
              style={{
                width: (g.end - g.start) * CELL,
                background: g.pid === null ? undefined : processColor(g.pid),
              }}
              title={`${g.pid === null ? 'Idle' : name(g.pid)}: ${g.start}–${g.end}`}
            >
              {g.pid === null ? 'idle' : name(g.pid)}
            </div>
          ))}
        </div>
        <div className="gantt-ticks">
          {Array.from({ length: end + 1 }, (_, t) => (
            <span key={t} style={{ left: t * CELL }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
