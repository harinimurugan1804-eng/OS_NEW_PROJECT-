import type { SimState } from '../engine/types';
import { processColor } from './colors';

export function QueueView({ sim }: { sim: SimState }) {
  const byPid = (pid: number) => sim.pcbs.find((p) => p.pid === pid)!;
  const running = sim.running === null ? null : byPid(sim.running);

  return (
    <div className="queues">
      <div className="queue-row">
        <h3>CPU</h3>
        {running ? (
          <div className="slot">
            <span className="tag" style={{ background: processColor(running.pid) }}>{running.name}</span>
            <span className="detail">
              burst left {running.remaining}
              {sim.algorithm === 'RR' && `, time slice ${running.quantumUsed}/${sim.quantum}`}
            </span>
          </div>
        ) : (
          <p className="empty">Idle</p>
        )}
      </div>

      <div className="queue-row">
        <h3>Ready queue</h3>
        {sim.readyQueue.length === 0 ? (
          <p className="empty">Empty</p>
        ) : (
          <ol className="fifo" aria-label="Ready queue from head to tail">
            {sim.readyQueue.map((pid, i) => (
              <li key={pid}>
                <span className="tag" style={{ background: processColor(pid) }}>{byPid(pid).name}</span>
                {i === 0 && <span className="detail">head</span>}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="queue-row">
        <h3>I/O wait</h3>
        {sim.waitQueue.length === 0 ? (
          <p className="empty">Empty</p>
        ) : (
          <ul className="fifo">
            {sim.waitQueue.map((pid) => (
              <li key={pid}>
                <span className="tag" style={{ background: processColor(pid) }}>{byPid(pid).name}</span>
                <span className="detail">{byPid(pid).remaining} left</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
