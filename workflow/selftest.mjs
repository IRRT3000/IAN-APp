#!/usr/bin/env node
/**
 * Autoprueba del orquestador: corre el ciclo completo con agentes SIMULADOS (sin IA, sin costo)
 * en repositorios git temporales. Verifica fases, re-planificacion, tope de rondas, deteccion de
 * "sin progreso", reanudacion, reversion de archivos fuera de territorio y limpieza del arbol.
 *   npm run flow:selftest
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-selftest-'));
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? '[OK]    ' : '[FALLA] '}${msg}`);
  if (!cond) failures += 1;
};
const sh = (cmd, args, cwd, env = {}) => spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });

function makeRepo(name, maxRounds, baselineCheck = false) {
  const repo = path.join(TMP, name);
  fs.mkdirSync(path.join(repo, 'workflow', 'test-fixtures'), { recursive: true });
  fs.copyFileSync(path.join(HERE, 'flow.mjs'), path.join(repo, 'workflow', 'flow.mjs'));
  fs.cpSync(path.join(HERE, 'prompts'), path.join(repo, 'workflow', 'prompts'), { recursive: true });
  const fake = path.join(HERE, 'test-fixtures', 'fake-agent.mjs');
  fs.writeFileSync(
    path.join(repo, 'check.mjs'),
    "import fs from 'node:fs';\nconst ok = process.env.FAKE_SCENARIO !== 'happy' || (fs.existsSync('src/feature.txt') && fs.readFileSync('src/feature.txt','utf8') === 'v2');\nconsole.log(ok ? 'check ok' : 'check: src/feature.txt no es v2');\nprocess.exit(ok ? 0 : 1);\n"
  );
  const agent = (role) => ({ cmd: process.execPath, preArgs: [fake, role], args: [] });
  fs.writeFileSync(
    path.join(repo, 'workflow', 'config.json'),
    JSON.stringify({
      maxRounds,
      agentRetries: 0,
      timeoutMinutes: { plan: 1, implement: 1, review: 1, replan: 1 },
      planner: agent('planner'),
      replanner: agent('replanner'),
      reviewer: agent('reviewer'),
      implementer: agent('implementer'),
      gate: { reviewOnBlockingFailure: false, baselineCheck, steps: [{ name: 'check', cmd: `"${process.execPath}" check.mjs`, blocking: true, timeoutMinutes: 1 }] },
    })
  );
  fs.writeFileSync(path.join(repo, '.gitignore'), 'node_modules/\nspecs/*/.flow/\n');
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), '# agents\n');
  fs.writeFileSync(path.join(repo, 'MEMORY.md'), '# memory\n');
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', '.gitkeep'), '');
  sh('git', ['init', '-q', '-b', 'main'], repo);
  sh('git', ['config', 'user.email', 'selftest@example.com'], repo);
  sh('git', ['config', 'user.name', 'selftest'], repo);
  sh('git', ['add', '-A'], repo);
  sh('git', ['commit', '-q', '-m', 'base'], repo);
  return repo;
}
const flow = (repo, args, scenario) => {
  const r = sh(process.execPath, [path.join(repo, 'workflow', 'flow.mjs'), ...args], repo, { FAKE_SCENARIO: scenario });
  if (process.env.SELFTEST_VERBOSE) console.log(`--- flow ${args.join(' ')} (codigo ${r.status}) ---\n${r.stdout}${r.stderr}`);
  return r;
};
const readState = (repo, id = '001') => {
  const dir = fs.readdirSync(path.join(repo, 'specs')).find((n) => n.startsWith(`${id}-`));
  return JSON.parse(fs.readFileSync(path.join(repo, 'specs', dir, 'state.json'), 'utf8'));
};
const clean = (repo) => sh('git', ['status', '--porcelain'], repo).stdout.trim() === '';

// 1) Camino feliz: gate roja -> re-planificacion -> gate verde -> aprobado. Revierte la violacion de territorio.
{
  console.log('\n== Escenario 1: gate roja, replan y aprobacion ==');
  const repo = makeRepo('happy', 3);
  const r = flow(repo, ['run', 'objetivo de prueba', '--type', 'spec'], 'happy');
  const s = readState(repo);
  check(r.status === 0, `termina con codigo 0 (fue ${r.status})`);
  check(s.phase === 'DONE' && s.round === 2, `aprobada en la ronda 2 (fase ${s.phase}, ronda ${s.round})`);
  check(s.branch === 'flow/001-objetivo-de-prueba', `rama ${s.branch}`);
  check(fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf8') === '# agents\n', 'AGENTS.md fuera de territorio fue revertido');
  check(s.history.some((h) => h.phase === 'territorio'), 'la violacion de territorio quedo registrada');
  check(s.history.filter((h) => h.phase === 'replan').length === 1, 'hubo exactamente una re-planificacion');
  const report = fs.readFileSync(path.join(repo, 'specs', s.dir, 'REPORT.md'), 'utf8');
  check(report.includes('APROBADO') && report.includes('Probar en el celular') && report.includes('mejora menor'), 'REPORT.md incluye resultado, pruebas manuales y mejoras menores');
  check(clean(repo), 'el arbol de trabajo termina limpio (todo commiteado)');
  check(sh('git', ['ls-files'], repo).stdout.split('\n').every((f) => !f.includes('/.flow/')), 'los registros .flow no se versionan');
  const log = sh('git', ['log', '--format=%s'], repo).stdout;
  check(/revision ronda 2 \(APPROVED\)/.test(log) && /puerta de calidad ronda 1 \(roja\)/.test(log), 'el historial de git cuenta la historia del ciclo');
}

// 2) Tope de rondas y reanudacion con --rounds.
{
  console.log('\n== Escenario 2: tope de rondas y reanudacion ==');
  const repo = makeRepo('rejects', 2);
  const r = flow(repo, ['run', 'objetivo tope', '--type', 'bug'], 'rejects');
  let s = readState(repo);
  check(r.status === 2 && s.phase === 'BLOCKED' && /tope de 2 rondas/.test(s.blocked.reason), `se detiene en el tope (fase ${s.phase})`);
  check(clean(repo), 'el arbol queda limpio al detenerse');
  const r2 = flow(repo, ['run', '001', '--rounds', '4'], 'rejects');
  s = readState(repo);
  check(r2.status === 0 && s.phase === 'DONE' && s.round === 3, `reanuda con --rounds y aprueba en la ronda 3 (fase ${s.phase}, ronda ${s.round})`);
}

// 3) Sin progreso: mismos hallazgos dos veces seguidas.
{
  console.log('\n== Escenario 3: ciclo sin progreso ==');
  const repo = makeRepo('stuck', 5);
  const r = flow(repo, ['run', 'objetivo atorado', '--type', 'spec'], 'stuck');
  const s = readState(repo);
  check(r.status === 2 && s.phase === 'BLOCKED' && /mismos hallazgos/.test(s.blocked.reason) && s.round === 2, `se detiene por falta de progreso en la ronda ${s.round}`);
}

// 4) Archivos o veredictos invalidos se reintentan con retroalimentacion.
{
  console.log('\n== Escenario 4: salidas invalidas con reintento ==');
  const repo = makeRepo('badformat', 3);
  const r = flow(repo, ['run', 'objetivo formato', '--type', 'spec'], 'badformat');
  const s = readState(repo);
  check(r.status === 0 && s.phase === 'DONE' && s.round === 1, `aprobada tras corregir plan y veredicto (fase ${s.phase})`);
  check(s.history.filter((h) => h.phase === 'plan').length === 2 && s.history.filter((h) => h.phase === 'review').length === 2, 'el plan y la revision se reintentaron una vez cada uno');
}

// 5) status y errores de uso.
{
  console.log('\n== Escenario 5: status y arbol sucio ==');
  const repo = makeRepo('misc', 3);
  fs.writeFileSync(path.join(repo, 'suelto.txt'), 'x');
  const r = flow(repo, ['run', 'objetivo sucio'], 'happy');
  check(r.status !== 0 && /cambios sin commit/.test(r.stderr), 'se niega a correr con el arbol sucio');
  fs.rmSync(path.join(repo, 'suelto.txt'));
  flow(repo, ['new', 'solo crear'], 'happy');
  const st = flow(repo, ['status'], 'happy');
  check(/001 PLAN/.test(st.stdout), 'status lista la spec creada');
}

// 6) Linea base roja: se niega a crear la spec; --skip-baseline la deja pasar.
{
  console.log('\n== Escenario 6: linea base roja ==');
  const repo = makeRepo('baseline', 3, true);
  const r = flow(repo, ['run', 'objetivo base', '--type', 'spec'], 'happy');
  check(r.status === 3 && /linea base ya esta roja/.test(r.stderr), `se niega a empezar con la base roja (codigo ${r.status})`);
  check(!fs.existsSync(path.join(repo, 'specs')) && sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], repo).stdout.trim() === 'main', 'no creo la spec ni cambio de rama');
  const r2 = flow(repo, ['run', 'objetivo base', '--type', 'spec', '--skip-baseline'], 'happy');
  check(r2.status === 0 && readState(repo).phase === 'DONE', `--skip-baseline permite continuar (codigo ${r2.status})`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? `\n${failures} comprobacion(es) fallaron.` : '\nTodas las comprobaciones pasaron.');
process.exit(failures ? 1 : 0);
