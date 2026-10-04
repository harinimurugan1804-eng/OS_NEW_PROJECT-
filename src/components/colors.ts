import type { ProcState } from '../engine/types';

export const STATE_COLOR: Record<ProcState, string> = {
  NEW: '#64748B',
  READY: '#0F766E',
  RUNNING: '#1D4ED8',
  WAITING: '#B45309',
  TERMINATED: '#374151',
};

const PROCESS_COLORS = ['#2563EB', '#DB2777', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626', '#4D7C0F'];

export function processColor(pid: number): string {
  return PROCESS_COLORS[(pid - 1) % PROCESS_COLORS.length];
}
