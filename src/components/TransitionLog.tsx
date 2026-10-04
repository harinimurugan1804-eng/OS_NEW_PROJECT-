import type { TransitionRecord } from '../engine/types';
import { STATE_LABEL } from '../engine/transitions';
import { processColor } from './colors';

export function TransitionLog({ log, timeLabel }: { log: TransitionRecord[]; timeLabel: string }) {
  if (log.length === 0) return <p className="empty">No transitions yet. Step the clock or use manual actions.</p>;
  return (
    <div className="table-scroll log">
      <table>
        <thead>
          <tr>
            <th>{timeLabel}</th>
            <th>Process</th>
            <th>Transition</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {[...log].reverse().map((r, i) => (
            <tr key={log.length - i}>
              <td>{r.time}</td>
              <td>
                <span className="tag" style={{ background: processColor(r.pid) }}>{r.name}</span>
              </td>
              <td>{STATE_LABEL[r.from]} → {STATE_LABEL[r.to]}</td>
              <td>{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
