import type { PCB, ProcState, SimState } from './types';

// The only legal moves in the five-state model.
export const VALID_TRANSITIONS: Record<ProcState, ProcState[]> = {
  NEW: ['READY'],
  READY: ['RUNNING'],
  RUNNING: ['READY', 'WAITING', 'TERMINATED'],
  WAITING: ['READY'],
  TERMINATED: [],
};

export const STATE_LABEL: Record<ProcState, string> = {
  NEW: 'New',
  READY: 'Ready',
  RUNNING: 'Running',
  WAITING: 'Waiting',
  TERMINATED: 'Terminated',
};

export function isValidTransition(from: ProcState, to: ProcState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {}

// Every state change in the simulator goes through this function.
// It enforces the transition table and the single-CPU rule, then logs the change.
export function transition(sim: SimState, pcb: PCB, to: ProcState, reason: string): void {
  const from = pcb.state;
  if (!isValidTransition(from, to)) {
    throw new TransitionError(
      `${pcb.name}: ${STATE_LABEL[from]} → ${STATE_LABEL[to]} is not a valid transition.`,
    );
  }
  if (to === 'RUNNING' && sim.running !== null && sim.running !== pcb.pid) {
    throw new TransitionError(
      `${pcb.name} cannot run: the CPU is already used by P${sim.running}. Only one process can be Running on a single CPU.`,
    );
  }
  pcb.state = to;
  sim.log.push({ time: sim.time, pid: pcb.pid, name: pcb.name, from, to, reason });
}

// What each legal transition is called in OS terms.
export function transitionName(from: ProcState, to: ProcState): string {
  const key = `${from}>${to}`;
  const names: Record<string, string> = {
    'NEW>READY': 'Admit',
    'READY>RUNNING': 'Dispatch',
    'RUNNING>READY': 'Interrupt / preempt',
    'RUNNING>WAITING': 'I/O or event wait',
    'WAITING>READY': 'I/O or event completion',
    'RUNNING>TERMINATED': 'Exit',
  };
  return names[key] ?? 'Invalid';
}
