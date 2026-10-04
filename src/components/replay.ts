import type { SimState, TransitionRecord } from '../engine/types';

// Display-only helper. One clock tick can contain several transitions for the
// same process (e.g. New -> Ready -> Running when the CPU is free). The engine
// records all of them in the log; this rebuilds what the diagram should show
// after only the first few, so each transition can be animated in order.
export function replayView(prev: SimState, transitions: TransitionRecord[]): SimState {
  const view = structuredClone(prev);
  for (const r of transitions) {
    const pcb = view.pcbs.find((p) => p.pid === r.pid);
    if (!pcb) continue;
    if (r.from === 'READY') view.readyQueue = view.readyQueue.filter((id) => id !== r.pid);
    if (r.from === 'WAITING') view.waitQueue = view.waitQueue.filter((id) => id !== r.pid);
    if (r.from === 'RUNNING') view.running = null;
    if (r.to === 'READY') view.readyQueue.push(r.pid);
    if (r.to === 'WAITING') view.waitQueue.push(r.pid);
    if (r.to === 'RUNNING') view.running = r.pid;
    pcb.state = r.to;
  }
  return view;
}
