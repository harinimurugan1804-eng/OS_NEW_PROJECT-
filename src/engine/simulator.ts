import { transition, transitionName, TransitionError } from './transitions';
import type { Algorithm, PCB, ProcState, ProcessSpec, SimState } from './types';

export function createSim(specs: ProcessSpec[], algorithm: Algorithm, quantum: number): SimState {
  const pcbs: PCB[] = specs.map((s) => ({
    pid: s.pid,
    name: s.name,
    state: 'NEW',
    priority: s.priority,
    arrival: s.arrival,
    programCounter: 0x1000 * s.pid,
    registers: { AX: 0, BX: 0, CX: 0, DX: 0 },
    bursts: s.bursts.map((b) => ({ ...b })),
    burstIndex: 0,
    remaining: s.bursts[0].length,
    quantumUsed: 0,
    cpuTime: 0,
    ioTime: 0,
    readyWait: 0,
    firstRun: null,
    finishTime: null,
  }));
  return {
    time: 0,
    algorithm,
    quantum,
    pcbs,
    readyQueue: [],
    waitQueue: [],
    running: null,
    lastOnCpu: null,
    contextSwitches: 0,
    log: [],
    gantt: [],
    done: pcbs.length === 0,
  };
}

function findPcb(sim: SimState, pid: number): PCB {
  const pcb = sim.pcbs.find((p) => p.pid === pid);
  if (!pcb) throw new Error(`No process with PID ${pid}`);
  return pcb;
}

// Changes a process's state (through the validator) and keeps the
// ready queue, wait queue and CPU slot consistent with it.
function moveTo(sim: SimState, pcb: PCB, to: ProcState, reason: string): void {
  const from = pcb.state;
  transition(sim, pcb, to, reason); // throws if illegal

  // Leave the old place
  if (from === 'READY') sim.readyQueue = sim.readyQueue.filter((id) => id !== pcb.pid);
  if (from === 'WAITING') sim.waitQueue = sim.waitQueue.filter((id) => id !== pcb.pid);
  if (from === 'RUNNING') {
    // Context save: the CPU context stays in this PCB until it is dispatched again.
    sim.running = null;
    pcb.quantumUsed = 0;
  }

  // Enter the new place
  if (to === 'READY') sim.readyQueue.push(pcb.pid);
  if (to === 'WAITING') sim.waitQueue.push(pcb.pid);
  if (to === 'RUNNING') {
    // Context load: the dispatcher restores this PCB's context onto the CPU.
    if (sim.lastOnCpu !== null && sim.lastOnCpu !== pcb.pid) sim.contextSwitches++;
    sim.running = pcb.pid;
    sim.lastOnCpu = pcb.pid;
    pcb.quantumUsed = 0;
    if (pcb.firstRun === null) pcb.firstRun = sim.time;
  }
  if (to === 'TERMINATED') pcb.finishTime = sim.time;
}

// Advances the simulation by one clock tick.
// Order inside a tick: admit -> I/O completions -> running process -> dispatch -> execute.
export function step(prev: SimState): SimState {
  if (prev.done) return prev;
  const sim = structuredClone(prev);
  const t = sim.time;

  // 1. Long-term scheduler admits processes arriving now
  sim.pcbs
    .filter((p) => p.state === 'NEW' && p.arrival === t)
    .sort((a, b) => a.pid - b.pid)
    .forEach((p) => moveTo(sim, p, 'READY', 'Admitted by long-term scheduler'));

  // 2. I/O completion interrupts
  for (const pid of [...sim.waitQueue]) {
    const p = findPcb(sim, pid);
    if (p.remaining === 0) {
      p.burstIndex++;
      p.remaining = p.bursts[p.burstIndex].length;
      moveTo(sim, p, 'READY', 'I/O completed (I/O interrupt)');
    }
  }

  // 3. The process on the CPU
  if (sim.running !== null) {
    const p = findPcb(sim, sim.running);
    if (p.remaining === 0) {
      p.burstIndex++;
      if (p.burstIndex < p.bursts.length) {
        p.remaining = p.bursts[p.burstIndex].length;
        moveTo(sim, p, 'WAITING', `Requested I/O for ${p.remaining} tick(s) (system call)`);
      } else {
        moveTo(sim, p, 'TERMINATED', 'Finished last CPU burst (exit)');
      }
    } else if (sim.algorithm === 'RR' && p.quantumUsed >= sim.quantum) {
      if (sim.readyQueue.length > 0) {
        moveTo(sim, p, 'READY', `Time quantum of ${sim.quantum} expired (timer interrupt)`);
      } else {
        p.quantumUsed = 0; // nobody else is ready, so it keeps the CPU
      }
    }
  }

  // 4. Short-term scheduler + dispatcher
  if (sim.running === null && sim.readyQueue.length > 0) {
    moveTo(sim, findPcb(sim, sim.readyQueue[0]), 'RUNNING', 'Dispatched by short-term scheduler');
  }

  if (sim.pcbs.every((p) => p.state === 'TERMINATED')) {
    sim.done = true;
    return sim;
  }

  // 5. Execute one tick
  for (const pid of sim.readyQueue) findPcb(sim, pid).readyWait++;

  for (const pid of sim.waitQueue) {
    const p = findPcb(sim, pid);
    p.remaining--;
    p.ioTime++;
  }

  if (sim.running !== null) {
    const p = findPcb(sim, sim.running);
    p.remaining--;
    p.cpuTime++;
    p.quantumUsed++;
    p.programCounter += 4; // one simulated instruction
    p.registers = {
      AX: p.registers.AX + 1,
      BX: (p.registers.BX + p.pid * 7) % 256,
      CX: p.remaining,
      DX: t,
    };
  }

  const last = sim.gantt[sim.gantt.length - 1];
  if (last && last.pid === sim.running && last.end === t) last.end = t + 1;
  else sim.gantt.push({ pid: sim.running, start: t, end: t + 1 });

  sim.time = t + 1;
  return sim;
}

// Manual mode: the user requests a transition and the validator decides.
// Bursts and the clock are ignored; each accepted action counts as one step.
export function manualTransition(
  prev: SimState,
  pid: number,
  to: ProcState,
): { sim: SimState; error: string | null } {
  const sim = structuredClone(prev);
  try {
    const pcb = findPcb(sim, pid);
    moveTo(sim, pcb, to, `Manual: ${transitionName(pcb.state, to)}`);
    sim.time++;
    return { sim, error: null };
  } catch (e) {
    if (e instanceof TransitionError) return { sim: prev, error: e.message };
    throw e;
  }
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  arrival: number;
  finish: number | null;
  turnaround: number | null;
  waiting: number;
  response: number | null;
  cpuTime: number;
  ioTime: number;
}

export interface Summary {
  perProcess: ProcessMetrics[];
  avgTurnaround: number | null;
  avgWaiting: number | null;
  avgResponse: number | null;
  cpuUtilisation: number | null; // percent
  contextSwitches: number;
}

export function computeMetrics(sim: SimState): Summary {
  const perProcess = sim.pcbs.map((p) => ({
    pid: p.pid,
    name: p.name,
    arrival: p.arrival,
    finish: p.finishTime,
    turnaround: p.finishTime === null ? null : p.finishTime - p.arrival,
    waiting: p.readyWait,
    response: p.firstRun === null ? null : p.firstRun - p.arrival,
    cpuTime: p.cpuTime,
    ioTime: p.ioTime,
  }));
  const finished = perProcess.filter((m) => m.turnaround !== null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const busy = sim.gantt.filter((g) => g.pid !== null).reduce((a, g) => a + g.end - g.start, 0);
  return {
    perProcess,
    avgTurnaround: avg(finished.map((m) => m.turnaround as number)),
    avgWaiting: avg(finished.map((m) => m.waiting)),
    avgResponse: avg(finished.map((m) => m.response as number)),
    cpuUtilisation: sim.time > 0 ? (busy / sim.time) * 100 : null,
    contextSwitches: sim.contextSwitches,
  };
}
