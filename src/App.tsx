import { useEffect, useMemo, useState } from 'react';
import { computeMetrics, createSim, manualTransition, step } from './engine/simulator';
import type { Algorithm, ProcState, ProcessSpec, SimState } from './engine/types';
import { formatBursts, parseBursts, randomWorkload, REPORT_EXAMPLE } from './engine/workload';
import { ProcessEditor, type Row, type RowErrors } from './components/ProcessEditor';
import { StateDiagram } from './components/StateDiagram';
import { QueueView } from './components/QueueView';
import { GanttChart } from './components/GanttChart';
import { PcbTable } from './components/PcbTable';
import { TransitionLog } from './components/TransitionLog';
import { MetricsTable } from './components/MetricsTable';
import { ManualPanel } from './components/ManualPanel';
import './App.css';

type Mode = 'auto' | 'manual';

const toRows = (specs: ProcessSpec[]): Row[] =>
  specs.map((s) => ({
    name: s.name,
    arrival: String(s.arrival),
    priority: String(s.priority),
    bursts: formatBursts(s.bursts),
  }));

// Turns the editor rows into process specs, or reports what is wrong with each row.
function validate(rows: Row[]): { specs: ProcessSpec[] | null; errors: RowErrors } {
  const errors: RowErrors = {};
  const specs: ProcessSpec[] = [];
  const names = new Set<string>();
  rows.forEach((r, i) => {
    const name = r.name.trim();
    const arrival = Number(r.arrival);
    const priority = Number(r.priority);
    const { bursts, error } = parseBursts(r.bursts);
    if (!name) errors[i] = 'Give the process a name.';
    else if (names.has(name)) errors[i] = `The name ${name} is already used.`;
    else if (!Number.isInteger(arrival) || arrival < 0 || arrival > 100)
      errors[i] = 'Arrival must be a whole number from 0 to 100.';
    else if (!Number.isInteger(priority) || priority < 1 || priority > 10)
      errors[i] = 'Priority must be a whole number from 1 to 10.';
    else if (error) errors[i] = error;
    names.add(name);
    if (!errors[i] && bursts) specs.push({ pid: i + 1, name, arrival, priority, bursts });
  });
  return { specs: Object.keys(errors).length ? null : specs, errors };
}

export default function App() {
  const [rows, setRows] = useState<Row[]>(toRows(REPORT_EXAMPLE));
  const [algorithm, setAlgorithm] = useState<Algorithm>('RR');
  const [quantum, setQuantum] = useState(2);
  const [mode, setMode] = useState<Mode>('auto');
  const [history, setHistory] = useState<SimState[]>([]);
  const [sim, setSim] = useState<SimState>(() => createSim(REPORT_EXAMPLE, 'RR', 2));
  const [playing, setPlaying] = useState(false);
  const [delay, setDelay] = useState(700);
  const [selected, setSelected] = useState(1);
  const [manualError, setManualError] = useState<string | null>(null);

  const { specs, errors } = useMemo(() => validate(rows), [rows]);
  const metrics = useMemo(() => computeMetrics(sim), [sim]);
  const started = history.length > 0;
  const previous = history[history.length - 1];
  const recent = previous ? sim.log.slice(previous.log.length) : [];

  function reset(nextSpecs = specs, nextAlgo = algorithm, nextQuantum = quantum) {
    setPlaying(false);
    setHistory([]);
    setManualError(null);
    if (nextSpecs) {
      setSim(createSim(nextSpecs, nextAlgo, nextQuantum));
      setSelected(nextSpecs[0]?.pid ?? 1);
    }
  }

  function changeRows(next: Row[]) {
    setRows(next);
    const v = validate(next);
    if (v.specs) reset(v.specs);
  }

  function load(nextSpecs: ProcessSpec[]) {
    setRows(toRows(nextSpecs));
    reset(nextSpecs);
  }

  function stepOnce() {
    if (sim.done) {
      setPlaying(false);
      return;
    }
    setHistory([...history, sim]);
    setSim(step(sim));
  }

  function stepBack() {
    if (history.length === 0) return;
    setPlaying(false);
    setManualError(null);
    setSim(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  }

  function manualMove(to: ProcState) {
    const result = manualTransition(sim, selected, to);
    setManualError(result.error);
    if (!result.error) {
      setHistory([...history, sim]);
      setSim(result.sim);
    }
  }

  // Auto-play: one tick every `delay` milliseconds.
  useEffect(() => {
    if (!playing || mode !== 'auto') return;
    const id = window.setTimeout(stepOnce, delay);
    return () => window.clearTimeout(id);
  });

  const subtitle =
    mode === 'manual'
      ? 'Five-state model on a single CPU. You trigger each transition and the kernel rules accept or reject it.'
      : `Five-state model on a single CPU, scheduled by ${
          algorithm === 'RR' ? `Round Robin with a time quantum of ${quantum}` : 'first come, first served'
        }.`;

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Process state transition simulator</h1>
          <p className="sub">{subtitle}</p>
        </div>
        <div className="clock" aria-live="polite">
          <span className="clock-label">{mode === 'auto' ? 'Clock' : 'Actions'}</span>
          <span className="clock-value">{sim.time}</span>
          {sim.done && mode === 'auto' && <span className="clock-done">All processes terminated</span>}
        </div>
      </header>

      <div className="layout">
        <aside className="setup">
          <section>
            <h2>Mode</h2>
            <div className="segmented" role="radiogroup" aria-label="Mode">
              {(['auto', 'manual'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  className={mode === m ? 'on' : ''}
                  onClick={() => {
                    setMode(m);
                    reset();
                  }}
                >
                  {m === 'auto' ? 'Scheduler' : 'Manual'}
                </button>
              ))}
            </div>
          </section>

          {mode === 'auto' && (
            <section>
              <h2>Scheduling</h2>
              <div className="field-row">
                <label>
                  Algorithm
                  <select
                    value={algorithm}
                    disabled={started}
                    onChange={(e) => {
                      const a = e.target.value as Algorithm;
                      setAlgorithm(a);
                      reset(specs, a);
                    }}
                  >
                    <option value="RR">Round Robin</option>
                    <option value="FCFS">First come, first served</option>
                  </select>
                </label>
                <label>
                  Time quantum
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={quantum}
                    disabled={started || algorithm !== 'RR'}
                    onChange={(e) => {
                      const q = Math.min(10, Math.max(1, Number(e.target.value) || 1));
                      setQuantum(q);
                      reset(specs, algorithm, q);
                    }}
                  />
                </label>
              </div>
            </section>
          )}

          <section>
            <h2>Processes</h2>
            <ProcessEditor rows={rows} errors={errors} locked={started} onChange={changeRows} />
            <div className="button-row">
              <button type="button" className="secondary" disabled={started} onClick={() => load(REPORT_EXAMPLE)}>
                Load report example
              </button>
              <button type="button" className="secondary" disabled={started} onClick={() => load(randomWorkload(5))}>
                Random workload
              </button>
            </div>
          </section>
        </aside>

        <main className="stage">
          <section className="panel">
            <div className="controls">
              {mode === 'auto' && (
                <>
                  <button
                    type="button"
                    className="primary"
                    disabled={!specs || sim.done}
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? 'Pause' : 'Play'}
                  </button>
                  <button type="button" disabled={!specs || sim.done || playing} onClick={stepOnce}>
                    Step
                  </button>
                </>
              )}
              <button type="button" disabled={!started} onClick={stepBack}>
                Step back
              </button>
              <button type="button" disabled={!started} onClick={() => reset()}>
                Reset
              </button>
              {mode === 'auto' && (
                <label className="speed">
                  Speed
                  <input
                    type="range"
                    min={150}
                    max={1500}
                    step={50}
                    value={1650 - delay}
                    onChange={(e) => setDelay(1650 - Number(e.target.value))}
                  />
                </label>
              )}
            </div>
            <StateDiagram sim={sim} recent={recent} />
            {recent.length > 0 && (
              <ul className="recent" aria-label="Transitions in the last step">
                {recent.map((r, i) => (
                  <li key={i}>
                    {r.name}: {r.reason}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {mode === 'manual' && (
            <section className="panel">
              <h2>Manual transitions</h2>
              <ManualPanel
                sim={sim}
                selected={selected}
                onSelect={(pid) => {
                  setSelected(pid);
                  setManualError(null);
                }}
                onAction={manualMove}
                error={manualError}
              />
            </section>
          )}

          <section className="panel">
            <h2>Queues</h2>
            <QueueView sim={sim} />
          </section>

          {mode === 'auto' && (
            <section className="panel">
              <h2>Gantt chart</h2>
              <GanttChart sim={sim} />
            </section>
          )}

          <section className="panel">
            <h2>Process control blocks</h2>
            <PcbTable sim={sim} manual={mode === 'manual'} />
          </section>

          <section className="panel">
            <h2>Transition log</h2>
            <TransitionLog log={sim.log} timeLabel={mode === 'auto' ? 'Time' : 'Action'} />
          </section>

          {mode === 'auto' && (
            <section className="panel">
              <h2>Performance</h2>
              <MetricsTable m={metrics} done={sim.done} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
