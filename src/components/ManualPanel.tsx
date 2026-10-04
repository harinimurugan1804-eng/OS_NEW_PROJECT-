import type { ProcState, SimState } from '../engine/types';
import { STATE_LABEL } from '../engine/transitions';
import { STATE_COLOR, processColor } from './colors';

const TARGETS: ProcState[] = ['NEW', 'READY', 'RUNNING', 'WAITING', 'TERMINATED'];

interface Props {
  sim: SimState;
  selected: number;
  onSelect: (pid: number) => void;
  onAction: (to: ProcState) => void;
  error: string | null;
}

export function ManualPanel({ sim, selected, onSelect, onAction, error }: Props) {
  const current = sim.pcbs.find((p) => p.pid === selected);
  return (
    <div className="manual">
      <fieldset>
        <legend>Choose a process</legend>
        <div className="pick">
          {sim.pcbs.map((p) => (
            <label key={p.pid} className={p.pid === selected ? 'picked' : undefined}>
              <input type="radio" name="manual-pid" checked={p.pid === selected} onChange={() => onSelect(p.pid)} />
              <span className="tag" style={{ background: processColor(p.pid) }}>{p.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>
          Move {current?.name} from {current ? STATE_LABEL[current.state] : ''} to
        </legend>
        <div className="actions">
          {TARGETS.map((to) => (
            <button type="button" key={to} onClick={() => onAction(to)} style={{ borderColor: STATE_COLOR[to] }}>
              {STATE_LABEL[to]}
            </button>
          ))}
        </div>
      </fieldset>
      <p className={error ? 'verdict rejected' : 'verdict'} role="status">
        {error ?? 'Every move is checked against the transition table. Try an illegal one, such as Waiting to Running.'}
      </p>
    </div>
  );
}
