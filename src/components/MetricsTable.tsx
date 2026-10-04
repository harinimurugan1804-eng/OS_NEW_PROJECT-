import type { Summary } from '../engine/simulator';

const fmt = (n: number | null) => (n === null ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(2));

export function MetricsTable({ m, done }: { m: Summary; done: boolean }) {
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Process</th>
              <th>Arrival</th>
              <th>Finish</th>
              <th>Turnaround</th>
              <th>Waiting (ready queue)</th>
              <th>Response</th>
              <th>CPU</th>
              <th>I/O</th>
            </tr>
          </thead>
          <tbody>
            {m.perProcess.map((p) => (
              <tr key={p.pid}>
                <td>{p.name}</td>
                <td>{p.arrival}</td>
                <td>{fmt(p.finish)}</td>
                <td>{fmt(p.turnaround)}</td>
                <td>{p.waiting}</td>
                <td>{fmt(p.response)}</td>
                <td>{p.cpuTime}</td>
                <td>{p.ioTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="summary">
        <div><dt>Average turnaround</dt><dd>{fmt(m.avgTurnaround)}</dd></div>
        <div><dt>Average waiting</dt><dd>{fmt(m.avgWaiting)}</dd></div>
        <div><dt>Average response</dt><dd>{fmt(m.avgResponse)}</dd></div>
        <div><dt>CPU utilisation</dt><dd>{m.cpuUtilisation === null ? '—' : `${m.cpuUtilisation.toFixed(1)}%`}</dd></div>
        <div><dt>Context switches</dt><dd>{m.contextSwitches}</dd></div>
      </dl>
      <p className="note">
        Turnaround = finish − arrival. Waiting = ticks spent in the ready queue. Response = first dispatch − arrival.
        {!done && ' Averages include finished processes only.'}
      </p>
    </>
  );
}
