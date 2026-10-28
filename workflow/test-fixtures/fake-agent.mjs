#!/usr/bin/env node
// Agente simulado para workflow/selftest.mjs. No usa IA: imita lo que harian Claude Code y Antigravity.
// Uso: node fake-agent.mjs <rol> -p "<mensaje con la ruta del prompt>"
import fs from 'node:fs';
import path from 'node:path';

const role = process.argv[2];
const msg = process.argv[process.argv.indexOf('-p') + 1] || '';
const scenario = process.env.FAKE_SCENARIO || 'happy';
const promptRel = (/archivo (\S+)$/.exec(msg) || [])[1];
if (!promptRel) {
  console.error('fake-agent: no encontre la ruta del prompt en el mensaje');
  process.exit(1);
}
const prompt = fs.readFileSync(promptRel, 'utf8');
const ctx = JSON.parse(/<!-- flow: (.*) -->/.exec(prompt)[1]);
const dir = ctx.dir;
const round = ctx.round;
const retried = prompt.includes('CORRECCION OBLIGATORIA');
const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};
const done = (extra = {}) => {
  console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: `${role} listo`, session_id: `fake-${role}`, total_cost_usd: 0.01, ...extra }));
};

if (role === 'planner') {
  const incomplete = scenario === 'badformat' && !retried;
  write(`${dir}/spec.md`, '# Spec\n\n## Criterios de aceptación\n1. Existe src/feature.txt\n');
  write(`${dir}/plan.md`, '# Plan\nEscribir el archivo.\n');
  const badSkill = scenario === 'badskill' && !retried;
  const skillsT1 = badSkill ? 'skill-inventada' : 'expo-native-ui';
  if (!incomplete) write(`${dir}/tasks.md`, `# Tareas\n\n## Ronda 1\n- [ ] T1 — Crear archivo\n  - Skills: ${skillsT1}\n- [ ] T2 — Actualizar MEMORY\n  - Skills: ninguna\n`);
  fs.writeFileSync(`${dir}/.flow/catalog-seen.txt`, /expo-native-ui/.test(prompt) ? 'catalogo visible' : 'sin catalogo');
  write(`${dir}/HANDOFF.md`, '# Handoff\nLee el plan.\n');
  done();
} else if (role === 'replanner') {
  const next = round + 1;
  fs.appendFileSync(`${dir}/tasks.md`, `\n## Ronda ${next}\n- [ ] T9 — Corregir hallazgos de la ronda ${round}\n  - Skills: expo-native-ui, vercel-react-native-skills\n`);
  done();
} else if (role === 'implementer') {
  write('src/feature.txt', scenario === 'happy' ? (round === 1 ? 'v1' : 'v2') : `r${round}`);
  const tasks = fs.readFileSync(`${dir}/tasks.md`, 'utf8').replace(/- \[ \]/g, '- [x]');
  fs.writeFileSync(`${dir}/tasks.md`, tasks);
  const seen = [...prompt.matchAll(/lee `(\.agents\/skills\/[^`]+)`/g)].map((m) => m[1]);
  write(`${dir}/implementation-round${round}.md`, `Ronda ${round} hecha.\nskills: ${seen.join(' ')}\n`);
  if (scenario === 'happy' && round === 1) fs.appendFileSync('AGENTS.md', '\nregla inventada por el agente\n'); // violacion de territorio a propósito
  done();
} else if (role === 'reviewer') {
  const reviewRel = /un solo archivo\*\*: `([^`]+)`/.exec(prompt)[1];
  const base = { summary: 'resumen simulado', axes: { completo: { ok: true, notes: '' }, eficiente: { ok: true, notes: '' }, a_futuro: { ok: true, notes: '' } }, not_verifiable: ['Probar en el celular'] };
  const blocker = (issue) => ({ id: 'F1', severity: 'blocker', file: 'src/feature.txt', line: 1, issue, evidence: 'src/feature.txt:1', fix_direction: 'arreglar la causa' });
  let review;
  if (scenario === 'happy') {
    review = { ...base, verdict: 'APPROVED', objective_met: true, findings: [{ id: 'F2', severity: 'minor', file: 'src/feature.txt', line: 1, issue: 'mejora menor', evidence: '', fix_direction: '' }] };
  } else if (scenario === 'rejects') {
    review = round >= 3 ? { ...base, verdict: 'APPROVED', objective_met: true, findings: [] } : { ...base, verdict: 'CHANGES_REQUIRED', objective_met: false, findings: [blocker(`problema distinto en la ronda ${round}`)] };
  } else if (scenario === 'stuck') {
    review = { ...base, verdict: 'CHANGES_REQUIRED', objective_met: false, findings: [blocker('el mismo problema de siempre')] };
  } else if (scenario === 'badformat') {
    review = retried ? { ...base, verdict: 'APPROVED', objective_met: true, findings: [] } : { ...base, verdict: 'APPROVED', objective_met: true, findings: [blocker('incoherente: aprobado con blocker')] };
  } else {
    review = { ...base, verdict: 'APPROVED', objective_met: true, findings: [] };
  }
  fs.writeFileSync(`${dir}/.flow/review-skills-seen.txt`, [...prompt.matchAll(/lee `(\.agents\/skills\/[^`]+)`/g)].map((m) => m[1]).join(' '));
  write(reviewRel, `${JSON.stringify(review, null, 2)}\n`);
  done();
} else {
  console.error(`rol desconocido: ${role}`);
  process.exit(1);
}
