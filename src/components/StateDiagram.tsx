import type { PCB, ProcState, SimState, TransitionRecord } from '../engine/types';
import { STATE_LABEL } from '../engine/transitions';
import { STATE_COLOR, processColor } from './colors';

const NODE: Record<ProcState, { x: number; y: number }> = {
  NEW: { x: 20, y: 20 },
  TERMINATED: { x: 580, y: 20 },
  READY: { x: 150, y: 150 },
  RUNNING: { x: 450, y: 150 },
  WAITING: { x: 300, y: 284 },
};
const W = 180;
const H = 96;

interface Edge {
  from: ProcState;
  to: ProcState;
  d: string;
  label: string;
  lx: number;
  ly: number;
  anchor?: 'start' | 'middle' | 'end';
}

const EDGES: Edge[] = [
  { from: 'NEW', to: 'READY', d: 'M110 116 L110 198 L146 198', label: 'admit', lx: 118, ly: 140, anchor: 'start' },
  { from: 'READY', to: 'RUNNING', d: 'M330 182 L446 182', label: 'dispatch', lx: 388, ly: 174 },
  { from: 'RUNNING', to: 'READY', d: 'M450 214 L334 214', label: 'interrupt', lx: 392, ly: 234 },
  { from: 'RUNNING', to: 'TERMINATED', d: 'M540 150 L540 68 L576 68', label: 'exit', lx: 548, ly: 132, anchor: 'start' },
  { from: 'RUNNING', to: 'WAITING', d: 'M600 246 L600 332 L484 332', label: 'I/O request', lx: 608, ly: 296, anchor: 'start' },
  { from: 'WAITING', to: 'READY', d: 'M300 332 L200 332 L200 250', label: 'I/O done', lx: 192, ly: 296, anchor: 'end' },
];

function chipOrder(sim: SimState, state: ProcState): PCB[] {
  const byPid = (pid: number) => sim.pcbs.find((p) => p.pid === pid)!;
  if (state === 'READY') return sim.readyQueue.map(byPid);
  if (state === 'WAITING') return sim.waitQueue.map(byPid);
  return sim.pcbs.filter((p) => p.state === state).sort((a, b) => a.pid - b.pid);
}

interface Props {
  sim: SimState;
  recent: TransitionRecord[];
}

export function StateDiagram({ sim, recent }: Props) {
  const isRecent = (e: Edge) => recent.some((r) => r.from === e.from && r.to === e.to);
  const states = Object.keys(NODE) as ProcState[];

  const chips: { pcb: PCB; x: number; y: number }[] = [];
  for (const s of states) {
    chipOrder(sim, s).forEach((pcb, i) => {
      chips.push({
        pcb,
        x: NODE[s].x + 12 + (i % 4) * 40,
        y: NODE[s].y + 36 + Math.floor(i / 4) * 28,
      });
    });
  }

  return (
    <svg className="diagram" viewBox="0 0 780 400" role="img" aria-label="Process state diagram with each process shown in its current state">
      <defs>
        <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.6" strokeLinecap="round" />
        </marker>
      </defs>

      {EDGES.map((e) => {
        const hot = isRecent(e);
        return (
          <g key={e.from + e.to} className={hot ? 'edge hot' : 'edge'}>
            <path d={e.d} fill="none" markerEnd="url(#head)" />
            <text x={e.lx} y={e.ly} textAnchor={e.anchor ?? 'middle'}>{e.label}</text>
          </g>
        );
      })}

      {states.map((s) => (
        <g key={s}>
          <rect x={NODE[s].x} y={NODE[s].y} width={W} height={H} rx="10" className="node" style={{ stroke: STATE_COLOR[s] }} />
          <rect x={NODE[s].x} y={NODE[s].y} width={W} height="26" rx="10" style={{ fill: STATE_COLOR[s] }} />
          <rect x={NODE[s].x} y={NODE[s].y + 16} width={W} height="10" style={{ fill: STATE_COLOR[s] }} />
          <text x={NODE[s].x + 12} y={NODE[s].y + 18} className="node-title">{STATE_LABEL[s]}</text>
          <text x={NODE[s].x + W - 12} y={NODE[s].y + 18} className="node-count" textAnchor="end">
            {chipOrder(sim, s).length}
          </text>
        </g>
      ))}

      {chips.map(({ pcb, x, y }) => (
        <g key={pcb.pid} className="chip" style={{ transform: `translate(${x}px, ${y}px)` }}>
          <rect width="34" height="22" rx="5" style={{ fill: processColor(pcb.pid) }} />
          <text x="17" y="15" textAnchor="middle">{pcb.name}</text>
        </g>
      ))}
    </svg>
  );
}
