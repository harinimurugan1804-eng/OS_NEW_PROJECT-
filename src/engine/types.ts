// Core OS data structures used by the simulator.

export type ProcState = "NEW" | "READY" | "RUNNING" | "WAITING" | "TERMINATED";

export type Algorithm = "RR" | "FCFS";

export type BurstType = "CPU" | "IO";

export interface Burst {
  type: BurstType;
  length: number;
}

// What the user enters for each process.
export interface ProcessSpec {
  pid: number;
  name: string;
  arrival: number;
  priority: number;
  bursts: Burst[]; // always CPU, IO, CPU, ..., CPU
}

// Simulated CPU registers saved/restored on a context switch.
export interface Registers {
  AX: number;
  BX: number;
  CX: number;
  DX: number;
}

// Process Control Block: the kernel's record of one process.
export interface PCB {
  pid: number;
  name: string;
  state: ProcState;
  priority: number;
  arrival: number;

  // CPU context (simulated)
  programCounter: number;
  registers: Registers;

  // Scheduling information
  bursts: Burst[];
  burstIndex: number; // which burst is current
  remaining: number; // time left in the current burst
  quantumUsed: number; // ticks used in the current time slice

  // Accounting information
  cpuTime: number;
  ioTime: number;
  readyWait: number; // ticks spent in the ready queue
  firstRun: number | null;
  finishTime: number | null;
}

export interface TransitionRecord {
  time: number;
  pid: number;
  name: string;
  from: ProcState;
  to: ProcState;
  reason: string;
}

export interface GanttSlice {
  pid: number | null; // null = CPU idle
  start: number;
  end: number;
}

export interface SimState {
  time: number;
  algorithm: Algorithm;
  quantum: number;
  pcbs: PCB[];
  readyQueue: number[]; // PIDs, head = index 0
  waitQueue: number[]; // PIDs doing I/O
  running: number | null; // PID on the CPU
  lastOnCpu: number | null; // previous CPU occupant, for counting context switches
  contextSwitches: number;
  log: TransitionRecord[];
  gantt: GanttSlice[];
  done: boolean;
}
