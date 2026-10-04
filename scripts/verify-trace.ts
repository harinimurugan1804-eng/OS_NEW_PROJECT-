// Run: npx tsx scripts/verify-trace.ts
import { createSim, step, computeMetrics, manualTransition } from '../src/engine/simulator';
import { REPORT_EXAMPLE } from '../src/engine/workload';

let sim = createSim(REPORT_EXAMPLE, 'RR', 2);
while (!sim.done) sim = step(sim);

console.log('Transition log:');
for (const r of sim.log) console.log(`  t=${r.time}  ${r.name}  ${r.from} -> ${r.to}  (${r.reason})`);

const gantt = sim.gantt.map((g) => `${g.pid === null ? 'idle' : 'P' + g.pid}[${g.start}-${g.end}]`).join(' ');
console.log('\nGantt:', gantt);

const m = computeMetrics(sim);
for (const p of m.perProcess) {
  console.log(`  ${p.name}: turnaround=${p.turnaround} waiting=${p.waiting} response=${p.response}`);
}
console.log(`  CPU utilisation=${m.cpuUtilisation?.toFixed(1)}%  context switches=${m.contextSwitches}`);

const expectGantt = 'P1[0-2] P2[2-4] P3[4-5] P1[5-6] idle[6-8] P1[8-9]';
const checks: [string, boolean][] = [
  ['Gantt chart', gantt === expectGantt],
  ['Turnaround 9/3/3', m.perProcess.map((p) => p.turnaround).join() === '9,3,3'],
  ['Waiting 3/1/2', m.perProcess.map((p) => p.waiting).join() === '3,1,2'],
  ['Utilisation 77.8%', m.cpuUtilisation?.toFixed(1) === '77.8'],
];

// Validator checks in manual mode
let manual = createSim(REPORT_EXAMPLE, 'RR', 2);
checks.push(['Rejects New -> Running', manualTransition(manual, 1, 'RUNNING').error !== null]);
manual = manualTransition(manual, 1, 'READY').sim;
manual = manualTransition(manual, 2, 'READY').sim;
manual = manualTransition(manual, 1, 'RUNNING').sim;
checks.push(['Rejects second Running process', manualTransition(manual, 2, 'RUNNING').error !== null]);
manual = manualTransition(manual, 1, 'WAITING').sim;
checks.push(['Rejects Waiting -> Running', manualTransition(manual, 1, 'RUNNING').error !== null]);

console.log('\nChecks:');
let ok = true;
for (const [name, pass] of checks) {
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`);
  ok &&= pass;
}
process.exit(ok ? 0 : 1);
