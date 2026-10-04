import type { Burst, ProcessSpec } from './types';

// "3, 2, 1" -> CPU 3, I/O 2, CPU 1. Bursts alternate and must start and end with CPU.
export function parseBursts(text: string): { bursts: Burst[] | null; error: string | null } {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return { bursts: null, error: 'Enter at least one CPU burst.' };
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 50)) {
    return { bursts: null, error: 'Each burst must be a whole number from 1 to 50.' };
  }
  if (nums.length % 2 === 0) {
    return { bursts: null, error: 'Use an odd count: CPU, I/O, CPU … ending with a CPU burst.' };
  }
  return {
    bursts: nums.map((length, i) => ({ type: i % 2 === 0 ? 'CPU' : 'IO', length })),
    error: null,
  };
}

export function formatBursts(bursts: Burst[]): string {
  return bursts.map((b) => b.length).join(', ');
}

// The worked example from the report (quantum = 2).
export const REPORT_EXAMPLE: ProcessSpec[] = [
  { pid: 1, name: 'P1', arrival: 0, priority: 1, bursts: [cpu(3), io(2), cpu(1)] },
  { pid: 2, name: 'P2', arrival: 1, priority: 1, bursts: [cpu(2)] },
  { pid: 3, name: 'P3', arrival: 2, priority: 1, bursts: [cpu(1)] },
];

export function randomWorkload(count: number): ProcessSpec[] {
  const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  return Array.from({ length: count }, (_, i) => {
    const cpuBursts = rand(1, 3);
    const bursts: Burst[] = [];
    for (let k = 0; k < cpuBursts; k++) {
      if (k > 0) bursts.push(io(rand(1, 4)));
      bursts.push(cpu(rand(1, 5)));
    }
    return { pid: i + 1, name: `P${i + 1}`, arrival: rand(0, 6), priority: rand(1, 5), bursts };
  });
}

function cpu(length: number): Burst {
  return { type: 'CPU', length };
}
function io(length: number): Burst {
  return { type: 'IO', length };
}
