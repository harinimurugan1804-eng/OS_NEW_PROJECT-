import type { SimState } from '../engine/types';
import { STATE_LABEL } from '../engine/transitions';
import { STATE_COLOR } from './colors';

export function PcbTable({ sim, manual }: { sim: SimState; manual: boolean }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>PID</th>
            <th>Name</th>
            <th>State</th>
            <th>Priority</th>
            <th>PC</th>
            <th>AX</th>
            <th>BX</th>
            <th>CX</th>
            <th>DX</th>
            {!manual && <th>Current burst</th>}
            {!manual && <th>CPU time</th>}
            {!manual && <th>I/O time</th>}
            {!manual && <th>Ready wait</th>}
          </tr>
        </thead>
        <tbody>
          {sim.pcbs.map((p) => {
            const burst = p.bursts[p.burstIndex];
            return (
              <tr key={p.pid}>
                <td>{p.pid}</td>
                <td>{p.name}</td>
                <td>
                  <span className="state-pill" style={{ color: STATE_COLOR[p.state], borderColor: STATE_COLOR[p.state] }}>
                    {STATE_LABEL[p.state]}
                  </span>
                </td>
                <td>{p.priority}</td>
                <td>0x{p.programCounter.toString(16).toUpperCase().padStart(4, '0')}</td>
                <td>{p.registers.AX}</td>
                <td>{p.registers.BX}</td>
                <td>{p.registers.CX}</td>
                <td>{p.registers.DX}</td>
                {!manual && (
                  <td>
                    {p.state === 'TERMINATED'
                      ? '—'
                      : `${burst.type === 'CPU' ? 'CPU' : 'I/O'} #${p.burstIndex + 1} of ${p.bursts.length}, ${p.remaining} left`}
                  </td>
                )}
                {!manual && <td>{p.cpuTime}</td>}
                {!manual && <td>{p.ioTime}</td>}
                {!manual && <td>{p.readyWait}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
