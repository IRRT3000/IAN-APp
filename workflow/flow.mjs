#!/usr/bin/env node
/**
 * flow.mjs — Orquestador del ciclo multi-agente.
 *
 *   PLAN (Claude Code) -> IMPLEMENT (Antigravity) -> GATE (pruebas automaticas)
 *     -> REVIEW (Claude Code, sesion limpia) -> APROBADO: fin
 *                                            -> CAMBIOS: REPLAN (Claude Code) -> IMPLEMENT -> ...
 *
 * Sin dependencias. Node >= 20. Documentacion: workflow/README.md
 *
 * Uso:
 *   node workflow/flow.mjs setup                              (instala jest-expo, jest y eslint; una vez)
 *   node workflow/flow.mjs doctor [--skip-probes]
 *   node workflow/flow.mjs run "objetivo" [--type spec|bug] [--skip-baseline]   (crea la spec y corre el ciclo)
 *   node workflow/flow.mjs run <id> [--rounds N] [--from FASE] (reanuda una spec)
 *   node workflow/flow.mjs new "objetivo" [--type spec|bug]   (solo crea la spec y la rama)
 *   node workflow/flow.mjs status [id]
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const IS_WIN = process.platform === 'win32';
const VALUE_FLAGS = new Set(['type', 'rounds', 'from', 'config']);
const PHASES = ['PLAN', 'IMPLEMENT', 'GATE', 'REVIEW', 'REPLAN'];
const INTRO = {
  planner: 'Eres el planificador de este proyecto.',
  replanner: 'Eres el planificador de este proyecto y vas a corregir el plan.',
  implementer: 'Eres el implementador de este proyecto.',
  reviewer: 'Eres el revisor independiente de este proyecto.',
};

const DEFAULT_CFG = {
  maxRounds: 3,
  branchPrefix: 'flow/',
  agentRetries: 1,
  retryDelaySeconds: 20,
  timeoutMinutes: { plan: 25, implement: 45, review: 25, replan: 20 },
  protectedPaths: ['workflow/', 'AGENTS.md', 'CLAUDE.md', '.claude/', '.github/', '.agents/'],
  gate: { reviewOnBlockingFailure: false, baselineCheck: true, steps: [] },
  planner: { cmd: 'claude', preArgs: [], args: [] },
  replanner: null,
  reviewer: { cmd: 'claude', preArgs: [], args: [] },
  implementer: { cmd: 'agy', preArgs: [], args: [] },
};

let ROOT = process.cwd();
let CFG = DEFAULT_CFG;
let currentChild = null;

// ───────────────────────────── utilidades ─────────────────────────────
const pad = (n, w = 2) => String(n).padStart(w, '0');
const stamp = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const log = (...a) => console.log(`[${stamp()}]`, ...a);
const fail = (msg, code = 1) => {
  console.error(`\n[ERROR] ${msg}\n`);
  process.exit(code);
};
const posix = (p) => p.split(path.sep).join('/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readText = (p, fallback = '') => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return fallback;
  }
};
const writeText = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};
const tail = (s, n) => String(s).split(/\r?\n/).slice(-n).join('\n').trim();
const winQuote = (s) => (/[\s&|<>^()%!"]/.test(s) ? `"${String(s).replace(/"/g, '\\"')}"` : s);

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (VALUE_FLAGS.has(key) && next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      pos.push(a);
    }
  }
  return { pos, flags };
}

// ───────────────────────────── git ─────────────────────────────
const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
function gitOut(args) {
  const r = git(args);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} fallo: ${(r.stderr || '').trim()}`);
  return r.stdout.trim();
}
function findRoot() {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) fail('Ejecuta este comando dentro del repositorio git del proyecto.');
  return path.resolve(r.stdout.trim());
}
function changedPaths() {
  const out = git(['status', '--porcelain=v1', '-z', '--no-renames', '--untracked-files=all']).stdout || '';
  return out
    .split('\0')
    .filter(Boolean)
    .map((e) => ({ status: e.slice(0, 2), path: e.slice(3) }));
}
function revertPath(p) {
  const inHead = git(['cat-file', '-e', `HEAD:${p}`]).status === 0;
  if (inHead) {
    git(['checkout', 'HEAD', '--', p]);
  } else {
    git(['rm', '-f', '-q', '--cached', '--ignore-unmatch', '--', p]);
    fs.rmSync(path.join(ROOT, p), { force: true, recursive: true });
  }
}
function commit(message) {
  git(['add', '-A']);
  if (git(['diff', '--cached', '--quiet']).status === 0) return false;
  const r = git(['commit', '-q', '-m', message]);
  if (r.status !== 0) throw new Error(`git commit fallo: ${(r.stderr || r.stdout || '').trim()}`);
  return true;
}

// ───────────────────────────── configuracion ─────────────────────────────
function loadConfig(customPath) {
  const p = customPath ? path.resolve(String(customPath)) : path.join(ROOT, 'workflow', 'config.json');
  let user = {};
  try {
    user = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`No pude leer la configuracion ${p}: ${e.message}`);
  }
  return {
    ...DEFAULT_CFG,
    ...user,
    timeoutMinutes: { ...DEFAULT_CFG.timeoutMinutes, ...(user.timeoutMinutes || {}) },
    gate: { ...DEFAULT_CFG.gate, ...(user.gate || {}) },
    planner: { ...DEFAULT_CFG.planner, ...(user.planner || {}) },
    reviewer: { ...DEFAULT_CFG.reviewer, ...(user.reviewer || {}) },
    implementer: { ...DEFAULT_CFG.implementer, ...(user.implementer || {}) },
    replanner: user.replanner ? { ...DEFAULT_CFG.planner, ...user.replanner } : null,
  };
}

// ───────────────────────────── estado ─────────────────────────────
const specsRoot = () => path.join(ROOT, 'specs');
const statePath = (dir) => path.join(specsRoot(), dir, 'state.json');
const loadState = (dir) => JSON.parse(readText(statePath(dir)));
function saveState(s) {
  s.updatedAt = new Date().toISOString();
  const p = statePath(s.dir);
  writeText(`${p}.tmp`, `${JSON.stringify(s, null, 2)}\n`);
  fs.renameSync(`${p}.tmp`, p);
}
function findSpecDir(target) {
  if (!fs.existsSync(specsRoot())) return null;
  const names = fs.readdirSync(specsRoot());
  if (/^\d{1,3}$/.test(target)) {
    const prefix = `${pad(Number(target), 3)}-`;
    return names.find((n) => n.startsWith(prefix) && fs.existsSync(statePath(n))) || null;
  }
  return names.includes(target) && fs.existsSync(statePath(target)) ? target : null;
}
function nextNumber() {
  const names = fs.existsSync(specsRoot()) ? fs.readdirSync(specsRoot()) : [];
  const nums = names.map((n) => /^(\d{3})-/.exec(n)).filter(Boolean).map((m) => Number(m[1]));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}
function slugify(s) {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/, '') || 'tarea'
  );
}
function assertClean(state) {
  const stateFile = state ? `specs/${state.dir}/state.json` : null;
  const dirty = changedPaths().filter((c) => c.path !== stateFile);
  if (dirty.length) {
    fail(
      `Hay cambios sin commit en el arbol de trabajo:\n  ${dirty.slice(0, 10).map((c) => `${c.status} ${c.path}`).join('\n  ')}\n` +
        'Haz commit o descartalos (git stash / git restore .) y vuelve a correr el comando.'
    );
  }
}

function createSpec(objective, type) {
  if (!['spec', 'bug'].includes(type)) fail('--type debe ser "spec" o "bug".');
  assertClean(null);
  const baseBranch = gitOut(['rev-parse', '--abbrev-ref', 'HEAD']);
  const baseSha = gitOut(['rev-parse', 'HEAD']);
  const id = pad(nextNumber(), 3);
  const dir = `${id}-${slugify(objective)}`;
  const branch = `${CFG.branchPrefix}${dir}`;
  const sw = git(['switch', '-c', branch]);
  if (sw.status !== 0) fail(`No pude crear la rama ${branch}: ${(sw.stderr || '').trim()}`);
  const state = {
    version: 1,
    id,
    dir,
    slug: dir.slice(4),
    type,
    objective,
    branch,
    baseBranch,
    baseSha,
    phase: 'PLAN',
    round: 1,
    maxRounds: CFG.maxRounds,
    reviewKeys: {},
    lastViolations: [],
    blocked: null,
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeText(
    path.join(specsRoot(), dir, 'objective.md'),
    `# Objetivo ${id} (${type === 'bug' ? 'correccion de bug' : 'spec nueva'})\n\n${objective}\n\n` +
      '## Meta de calidad\nDejarlo concluido, eficiente y eficaz a futuro: cumple todos los criterios, no desperdicia ' +
      'recursos (almacenamiento, renders, red) y queda cubierto por pruebas y documentado.\n'
  );
  saveState(state);
  commit(`flow(${id}): objetivo`);
  log(`Spec ${dir} creada en la rama ${branch} (base ${baseBranch} @ ${baseSha.slice(0, 7)}).`);
  return state;
}
function ensureBranch(state) {
  const current = gitOut(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (current === state.branch) return;
  assertClean(state);
  const sw = git(['switch', state.branch]);
  if (sw.status !== 0) fail(`No pude cambiar a la rama ${state.branch}: ${(sw.stderr || '').trim()}`);
  log(`Cambie a la rama ${state.branch}.`);
}

// ───────────────────────────── candado ─────────────────────────────
function lockPath(state) {
  return path.join(specsRoot(), state.dir, '.flow', 'lock');
}
function acquireLock(state) {
  const p = lockPath(state);
  const prev = Number(readText(p).trim());
  if (prev && prev !== process.pid) {
    try {
      process.kill(prev, 0);
      fail(`La spec ${state.dir} ya esta corriendo en otro proceso (PID ${prev}).`);
    } catch (e) {
      if (e.code !== 'ESRCH') throw e;
    }
  }
  writeText(p, String(process.pid));
}
const releaseLock = (state) => fs.rmSync(lockPath(state), { force: true });

// ───────────────────────────── agentes ─────────────────────────────
function killTree(child) {
  if (!child || !child.pid) return;
  if (IS_WIN) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      try {
        child.kill('SIGTERM');
      } catch {
        /* ya termino */
      }
    }
  }
}
function parseAgentJson(stdout) {
  const t = String(stdout).trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    /* intentar por lineas */
  }
  const lines = t.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      /* siguiente */
    }
  }
  return null;
}

/** Ejecuta un agente en modo no interactivo. El prompt largo va en un archivo; el argumento es corto. */
function runAgent({ role, spec, message, timeoutMin, logBase }) {
  return new Promise((resolve) => {
    const args = [...(spec.preArgs || []), '-p', message, ...(spec.args || [])];
    const started = Date.now();
    let out = '';
    let err = '';
    let timedOut = false;
    let done = false;
    let child;
    const cap = 8 * 1024 * 1024;

    const finish = (code, spawnError) => {
      if (done) return;
      done = true;
      clearInterval(heartbeat);
      clearTimeout(killer);
      currentChild = null;
      if (logBase) {
        writeText(`${logBase}.out.log`, out);
        writeText(`${logBase}.err.log`, err);
      }
      const parsed = parseAgentJson(out);
      const flaggedError =
        parsed &&
        (parsed.is_error === true ||
          (typeof parsed.subtype === 'string' && parsed.subtype.startsWith('error')) ||
          (typeof parsed.status === 'string' && parsed.status !== 'SUCCESS'));
      const warnings = err
        .split(/\r?\n/)
        .filter((l) => /denied|denegad|permission|permiso|soft-?den/i.test(l))
        .slice(0, 8);
      const ok = code === 0 && !timedOut && !flaggedError && !spawnError;
      let reason = '';
      if (spawnError) reason = `no pude lanzar "${spec.cmd}": ${spawnError}`;
      else if (timedOut) reason = `se agoto el tiempo (${timeoutMin} min)`;
      else if (!ok) {
        reason =
          (parsed && (parsed.error || parsed.result || parsed.response)) ||
          tail(err || out, 6) ||
          `codigo de salida ${code}`;
        reason = String(reason).slice(0, 400);
      }
      if (!ok && /authentication|not logged in|log in|unauthor|401/i.test(`${out}\n${err}`)) {
        reason += ' (parece un problema de inicio de sesion: abre el agente una vez de forma interactiva)';
      }
      resolve({
        ok,
        code,
        timedOut,
        reason,
        parsed,
        stdout: out,
        stderr: err,
        warnings,
        costUsd: parsed && typeof parsed.total_cost_usd === 'number' ? parsed.total_cost_usd : null,
        sessionId: parsed ? parsed.session_id || parsed.conversation_id || null : null,
        seconds: Math.round((Date.now() - started) / 1000),
      });
    };

    // stdin cerrado: "claude -p" lee stdin y se quedaria esperando si el pipe siguiera abierto.
    const stdio = ['ignore', 'pipe', 'pipe'];
    try {
      child = IS_WIN
        ? spawn([spec.cmd, ...args.map(winQuote)].join(' '), { cwd: ROOT, shell: true, windowsHide: true, stdio })
        : spawn(spec.cmd, args, { cwd: ROOT, detached: true, stdio });
    } catch (e) {
      finish(null, e.message);
      return;
    }
    currentChild = child;
    const heartbeat = setInterval(
      () => log(`  ... ${role} sigue trabajando (${Math.round((Date.now() - started) / 60000)} min)`),
      120000
    );
    const killer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMin * 60000);
    child.stdout.on('data', (d) => {
      if (out.length < cap) out += d;
    });
    child.stderr.on('data', (d) => {
      if (err.length < cap) err += d;
    });
    child.on('error', (e) => finish(null, e.message));
    child.on('close', (code) => finish(code, null));
  });
}

async function callAgent({ state, role, template, tag, timeoutKey, vars = {} }) {
  const dirRel = `specs/${state.dir}`;
  const flowDir = path.join(ROOT, dirRel, '.flow');
  const spec = role === 'implementer' ? CFG.implementer : role === 'reviewer' ? CFG.reviewer : role === 'replanner' ? CFG.replanner || CFG.planner : CFG.planner;
  const tpl = readText(path.join(SCRIPT_DIR, 'prompts', `${template}.md`));
  if (!tpl) fail(`Falta la plantilla workflow/prompts/${template}.md`);
  const base = {
    ID: state.id,
    DIR: dirRel,
    ROUND: state.round,
    MAX_ROUNDS: state.maxRounds,
    TYPE: state.type,
    OBJECTIVE: state.objective,
    BASE_SHA: state.baseSha,
    BASE_BRANCH: state.baseBranch,
    FEEDBACK: '',
    ...vars,
  };
  const header = `<!-- flow: ${JSON.stringify({ role, dir: dirRel, round: state.round, tag })} -->\n`;
  const promptFile = path.join(flowDir, `${tag}-r${state.round}.prompt.md`);
  writeText(promptFile, header + tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in base ? String(base[k]) : m)));
  const message = `${INTRO[role]} Lee y ejecuta por completo las instrucciones del archivo ${posix(path.relative(ROOT, promptFile))}`;

  let res;
  for (let attempt = 0; attempt <= CFG.agentRetries; attempt += 1) {
    if (attempt > 0) {
      log(`  reintento ${attempt}/${CFG.agentRetries} de ${role} en ${CFG.retryDelaySeconds}s (${res.reason})`);
      await sleep(CFG.retryDelaySeconds * 1000);
    }
    log(`${role} (${spec.cmd}) trabajando en: ${tag} ronda ${state.round}...`);
    res = await runAgent({
      role,
      spec,
      message,
      timeoutMin: CFG.timeoutMinutes[timeoutKey],
      logBase: path.join(flowDir, `${tag}-r${state.round}-a${attempt}`),
    });
    if (res.ok) break;
  }
  state.history.push({
    at: new Date().toISOString(),
    phase: tag,
    round: state.round,
    agent: spec.cmd,
    ok: res.ok,
    seconds: res.seconds,
    costUsd: res.costUsd,
    note: res.ok ? (res.warnings.length ? `avisos de permisos: ${res.warnings.join(' | ')}` : '') : res.reason,
  });
  if (res.warnings.length) log(`  AVISO: ${res.warnings[0]}`);
  return res;
}

// ───────────────────────────── territorio ─────────────────────────────
function isProtected(p) {
  return CFG.protectedPaths.some((pp) => (pp.endsWith('/') ? p.startsWith(pp) : p === pp));
}
function isAllowed(role, p, state) {
  const dirRel = `specs/${state.dir}`;
  if (p.startsWith(`${dirRel}/.flow/`)) return true;
  if (role === 'planner' || role === 'replanner') return p.startsWith(`${dirRel}/`);
  if (role === 'reviewer') return p === `${dirRel}/review-round${state.round}.json`;
  if (role === 'implementer') {
    if (isProtected(p)) return false;
    if (p.startsWith('specs/')) return p === `${dirRel}/tasks.md` || p === `${dirRel}/implementation-round${state.round}.md`;
    return true;
  }
  return false;
}
function enforceTerritory(role, state) {
  const stateFile = `specs/${state.dir}/state.json`;
  const violations = [];
  for (const c of changedPaths()) {
    if (c.path === stateFile) continue;
    if (!isAllowed(role, c.path, state)) {
      violations.push(c.path);
      revertPath(c.path);
    }
  }
  saveState(state); // restaura state.json si un agente lo toco
  if (violations.length) {
    log(`  AVISO: ${role} toco archivos fuera de su territorio; los revertí: ${violations.join(', ')}`);
    state.history.push({ at: new Date().toISOString(), phase: 'territorio', round: state.round, agent: role, ok: false, note: `revertidos: ${violations.join(', ')}` });
  }
  return violations;
}

// ───────────────────────────── validaciones ─────────────────────────────
function countTasks(md) {
  const open = (md.match(/^\s*- \[ \]/gm) || []).length;
  const done = (md.match(/^\s*- \[[xX]\]/gm) || []).length;
  return { open, done };
}
function validatePlanFiles(state) {
  const d = path.join(specsRoot(), state.dir);
  const missing = ['spec.md', 'plan.md', 'tasks.md', 'HANDOFF.md'].filter((f) => !fs.existsSync(path.join(d, f)));
  if (missing.length) return `faltan archivos: ${missing.join(', ')}`;
  if (!/criterios de aceptaci[oó]n/i.test(readText(path.join(d, 'spec.md')))) return 'spec.md no tiene la seccion "Criterios de aceptacion"';
  if (countTasks(readText(path.join(d, 'tasks.md'))).open === 0) return 'tasks.md no tiene tareas pendientes "- [ ]"';
  return null;
}
function validateReview(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'no es un objeto JSON';
  if (!['APPROVED', 'CHANGES_REQUIRED'].includes(r.verdict)) return 'verdict debe ser APPROVED o CHANGES_REQUIRED';
  if (typeof r.objective_met !== 'boolean') return 'objective_met debe ser true o false';
  if (!Array.isArray(r.findings)) return 'findings debe ser un arreglo';
  for (const [i, f] of r.findings.entries()) {
    if (!f || !['blocker', 'major', 'minor'].includes(f.severity)) return `findings[${i}].severity debe ser blocker, major o minor`;
    if (!f.issue || typeof f.issue !== 'string') return `findings[${i}].issue esta vacio`;
    if (f.severity !== 'minor' && !f.evidence) return `findings[${i}] (${f.severity}) necesita "evidence" (archivo:linea o salida de comando)`;
  }
  const hard = r.findings.some((f) => f.severity !== 'minor');
  if (r.verdict === 'APPROVED' && (hard || !r.objective_met)) return 'APPROVED es incompatible con hallazgos blocker/major u objective_met=false';
  if (r.verdict === 'CHANGES_REQUIRED' && !hard && r.objective_met) return 'CHANGES_REQUIRED exige al menos un hallazgo blocker/major o objective_met=false';
  return null;
}
const findingKey = (f) => `${f.file || ''}|${String(f.issue).toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 80)}`;

// ───────────────────────────── puerta de calidad ─────────────────────────────
function runShell(cmd, timeoutMin) {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = '';
    let timedOut = false;
    let done = false;
    const env = { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', FORCE_COLOR: '0' };
    const child = spawn(cmd, { cwd: ROOT, shell: true, env, detached: !IS_WIN, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    currentChild = child;
    const finish = (code) => {
      if (done) return;
      done = true;
      clearTimeout(killer);
      currentChild = null;
      resolve({ code, timedOut, output: out, seconds: Math.round((Date.now() - started) / 1000) });
    };
    const killer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMin * 60000);
    child.stdout.on('data', (d) => {
      if (out.length < 4 * 1024 * 1024) out += d;
    });
    child.stderr.on('data', (d) => {
      if (out.length < 4 * 1024 * 1024) out += d;
    });
    child.on('error', (e) => {
      out += `\nerror al lanzar: ${e.message}`;
      finish(1);
    });
    child.on('close', (code) => finish(code === null ? 1 : code));
  });
}
async function runGate(ctx) {
  const steps = (CFG.gate.steps || []).filter((s) => s.enabled !== false);
  const results = [];
  for (const step of steps) {
    log(`  puerta de calidad: ${step.name} -> ${step.cmd}`);
    const r = await runShell(step.cmd, step.timeoutMinutes || 15);
    const ok = r.code === 0 && !r.timedOut;
    if (ctx.dir) writeText(path.join(ROOT, 'specs', ctx.dir, '.flow', `gate-r${ctx.round}-${step.name}.log`), r.output);
    results.push({
      name: step.name,
      cmd: step.cmd,
      blocking: step.blocking !== false,
      ok,
      code: r.code,
      timedOut: r.timedOut,
      seconds: r.seconds,
      tail: tail(r.output, ok ? 12 : 80),
    });
    log(`    ${ok ? 'OK' : step.blocking === false ? 'AVISO' : 'FALLA'} (${r.seconds}s)`);
  }
  const ok = results.filter((r) => r.blocking).every((r) => r.ok);
  return { round: ctx.round, ok, results };
}
function gateMarkdown(g) {
  const lines = [`# Puerta de calidad — ronda ${g.round}: ${g.ok ? 'VERDE' : 'ROJA'}`, ''];
  for (const r of g.results) {
    lines.push(`## ${r.name}: ${r.ok ? 'OK' : r.blocking ? 'FALLA (bloqueante)' : 'aviso (no bloqueante)'}`);
    lines.push(`Comando: \`${r.cmd}\` — ${r.seconds}s${r.timedOut ? ' — TIEMPO AGOTADO' : ''}`, '', '```', r.tail || '(sin salida)', '```', '');
  }
  if (!g.results.length) lines.push('(No hay pasos configurados en workflow/config.json)');
  return `${lines.join('\n')}\n`;
}

// Antes de crear una spec nueva: si la rama base ya esta roja, el ciclo gastaria rondas en fallas que no son de la spec.
async function baselineCheck() {
  log('Linea base: verificando que la rama actual pase la puerta de calidad antes de empezar...');
  const g = await runGate({ dir: null, round: 0 });
  if (g.ok) return;
  const bad = g.results.filter((r) => r.blocking && !r.ok);
  const lines = bad.map((r) => `  - ${r.name} (${r.cmd}):\n${r.tail.split('\n').slice(-12).map((l) => `      ${l}`).join('\n')}`);
  const missingTools = !fs.existsSync(path.join(ROOT, 'node_modules'));
  fail(
    `La linea base ya esta roja; el ciclo gastaria sus rondas en fallas que no son de la spec.\n${lines.join('\n')}\n\n` +
      `${missingTools ? 'Falta node_modules: corre "npm ci". ' : ''}Si faltan jest o eslint: "npm run flow -- setup".\n` +
      'Arregla la base (o pidelo como un bug con el flujo en otra rama) y vuelve a correr. Para saltar esta verificacion: --skip-baseline.',
    3
  );
}

function setupCmd() {
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) fail('Falta node_modules. Corre "npm ci" primero y luego "npm run flow -- setup".');
  assertClean(null);
  const pkg = JSON.parse(readText(path.join(ROOT, 'package.json'), '{}'));
  const have = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const wanted = ['jest-expo', 'jest', 'eslint', 'eslint-config-expo'];
  const missing = wanted.filter((w) => !have[w]);
  if (!missing.length) {
    log('Las herramientas de prueba ya estan en package.json. Nada que instalar.');
    return;
  }
  log(`Instalando como devDependencies (versiones que Expo recomienda para el SDK): ${missing.join(', ')}`);
  const r = spawnSync('npx', ['expo', 'install', ...missing, '--dev'], { cwd: ROOT, stdio: 'inherit', shell: IS_WIN, windowsHide: true });
  if (r.status !== 0) fail('La instalacion fallo. Revisa el error de arriba y prueba "npx expo-doctor".');
  if (commit('flow: herramientas de prueba (jest-expo, jest, eslint) con versiones del SDK')) log('Cambios en package.json y package-lock.json guardados en un commit.');
  log('Listo. Siguiente: npm run flow -- doctor');
}

// ───────────────────────────── fases ─────────────────────────────
function block(state, reason, resumePhase) {
  state.phase = 'BLOCKED';
  state.blocked = { reason, resumePhase, at: new Date().toISOString() };
  log(`DETENIDO: ${reason}`);
}

async function doPlan(state) {
  let feedback = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await callAgent({ state, role: 'planner', template: 'planner', tag: 'plan', timeoutKey: 'plan', vars: { FEEDBACK: feedback } });
    if (!res.ok) return block(state, `El planificador fallo: ${res.reason}`, 'PLAN');
    enforceTerritory('planner', state);
    const problem = validatePlanFiles(state);
    if (!problem) {
      commit(`flow(${state.id}): plan`);
      state.phase = 'IMPLEMENT';
      state.round = 1;
      return undefined;
    }
    log(`  el plan no es valido: ${problem}`);
    feedback = `\n## CORRECCION OBLIGATORIA\nTu intento anterior fue rechazado: ${problem}. Corrigelo y vuelve a escribir los archivos.\n`;
  }
  return block(state, 'El planificador no produjo un plan valido despues de 2 intentos.', 'PLAN');
}

async function doImplement(state) {
  const tasksPath = path.join(specsRoot(), state.dir, 'tasks.md');
  const pending = countTasks(readText(tasksPath)).open;
  const violations = state.lastViolations.length
    ? `En la ronda anterior tocaste archivos que no te corresponden y se revirtieron: ${state.lastViolations.join(', ')}. No lo repitas.`
    : 'Ninguna.';
  const res = await callAgent({
    state,
    role: 'implementer',
    template: 'implementer',
    tag: 'impl',
    timeoutKey: 'implement',
    vars: { PENDING: pending, VIOLATIONS: violations },
  });
  if (!res.ok) return block(state, `Antigravity fallo: ${res.reason}`, 'IMPLEMENT');
  state.lastViolations = enforceTerritory('implementer', state);
  const changed = changedPaths().filter((c) => c.path !== `specs/${state.dir}/state.json`);
  if (!changed.length) {
    const said = res.parsed && (res.parsed.response || res.parsed.result) ? String(res.parsed.response || res.parsed.result).slice(0, 300) : tail(res.stdout, 4);
    return block(state, `Antigravity termino sin modificar ningun archivo. Dijo: ${said}`, 'IMPLEMENT');
  }
  commit(`flow(${state.id}): implementacion ronda ${state.round}`);
  state.phase = 'GATE';
  return undefined;
}

async function doGate(state) {
  const gate = await runGate({ dir: state.dir, round: state.round });
  const d = path.join(specsRoot(), state.dir);
  writeText(path.join(d, `gate-round${state.round}.json`), `${JSON.stringify(gate, null, 2)}\n`);
  writeText(path.join(d, `gate-round${state.round}.md`), gateMarkdown(gate));
  state.history.push({ at: new Date().toISOString(), phase: 'gate', round: state.round, agent: 'orquestador', ok: gate.ok, note: gate.results.map((r) => `${r.name}:${r.ok ? 'ok' : 'falla'}`).join(' ') });
  commit(`flow(${state.id}): puerta de calidad ronda ${state.round} (${gate.ok ? 'verde' : 'roja'})`);
  state.phase = 'REVIEW';
}

function renderReviewMd(state, review, gate, round) {
  const L = [`## Ronda ${round} — ${review.verdict}${review.source === 'gate' ? ' (puerta de calidad roja, sin revisor)' : ''}`, ''];
  L.push(`Puerta de calidad: ${gate.ok ? 'verde' : 'roja'} · Objetivo cumplido: ${review.objective_met ? 'si' : 'no'}`, '');
  if (review.summary) L.push(String(review.summary), '');
  if (review.axes) {
    for (const [k, v] of Object.entries(review.axes)) L.push(`- ${k}: ${v && v.ok ? 'ok' : 'revisar'}${v && v.notes ? ` — ${v.notes}` : ''}`);
    L.push('');
  }
  if (review.findings.length) {
    L.push('| id | severidad | donde | problema | direccion de arreglo |', '| - | - | - | - | - |');
    for (const f of review.findings) {
      const where = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '-';
      const cell = (s) => String(s || '-').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
      L.push(`| ${cell(f.id)} | ${cell(f.severity)} | ${cell(where)} | ${cell(f.issue)} | ${cell(f.fix_direction)} |`);
    }
    L.push('');
  }
  if ((review.not_verifiable || []).length) L.push('No verificable sin probar en el celular:', ...review.not_verifiable.map((x) => `- ${x}`), '');
  return `${L.join('\n')}\n`;
}

async function doReview(state) {
  const dirRel = `specs/${state.dir}`;
  const d = path.join(specsRoot(), state.dir);
  const gate = JSON.parse(readText(path.join(d, `gate-round${state.round}.json`), '{"ok":false,"results":[],"round":0}'));
  const reviewRel = `${dirRel}/review-round${state.round}.json`;
  let review = null;

  if (!gate.ok && !CFG.gate.reviewOnBlockingFailure) {
    const failing = gate.results.filter((r) => r.blocking && !r.ok);
    review = {
      verdict: 'CHANGES_REQUIRED',
      objective_met: false,
      source: 'gate',
      summary: 'La puerta de calidad fallo; no se invoco al revisor. La causa raiz de estos fallos es lo primero que hay que resolver.',
      findings: failing.map((r, i) => ({
        id: `G${i + 1}`,
        severity: 'blocker',
        file: '',
        line: 0,
        issue: `Fallo el paso "${r.name}" (${r.cmd})${r.timedOut ? ' por tiempo agotado' : ''}`,
        evidence: r.tail,
        fix_direction: 'Encontrar la causa raiz del fallo (no silenciar la prueba ni el lint) y corregirla.',
      })),
      not_verifiable: [],
    };
    writeText(path.join(ROOT, reviewRel), `${JSON.stringify(review, null, 2)}\n`);
  } else {
    const prevReviews = Array.from({ length: state.round - 1 }, (_, i) => `${dirRel}/review-round${i + 1}.json`).join(', ') || 'ninguna';
    let feedback = '';
    for (let attempt = 0; attempt < 2 && !review; attempt += 1) {
      fs.rmSync(path.join(ROOT, reviewRel), { force: true });
      const res = await callAgent({
        state,
        role: 'reviewer',
        template: 'reviewer',
        tag: 'review',
        timeoutKey: 'review',
        vars: { GATE_FILE: `${dirRel}/gate-round${state.round}.md`, REVIEW_FILE: reviewRel, PREV_REVIEWS: prevReviews, FEEDBACK: feedback },
      });
      if (!res.ok) return block(state, `El revisor fallo: ${res.reason}`, 'REVIEW');
      enforceTerritory('reviewer', state);
      let candidate = null;
      let problem = null;
      try {
        candidate = JSON.parse(readText(path.join(ROOT, reviewRel)));
        problem = validateReview(candidate);
      } catch {
        problem = `no encontre un JSON valido en ${reviewRel}`;
      }
      if (!problem) {
        review = { not_verifiable: [], ...candidate };
      } else {
        log(`  el veredicto no es valido: ${problem}`);
        feedback = `\n## CORRECCION OBLIGATORIA\nTu veredicto anterior fue rechazado: ${problem}. Escribelo de nuevo en ${reviewRel} con el formato exacto.\n`;
      }
    }
    if (!review) return block(state, 'El revisor no produjo un veredicto valido despues de 2 intentos.', 'REVIEW');
  }

  const reviewMdPath = path.join(d, 'REVIEW.md');
  const prevMd = readText(reviewMdPath, `# Revisiones — ${state.dir}\n\n`);
  writeText(reviewMdPath, prevMd + renderReviewMd(state, review, gate, state.round));
  const keys = review.findings.filter((f) => f.severity !== 'minor').map(findingKey).sort();
  state.reviewKeys[state.round] = keys;
  state.history.push({ at: new Date().toISOString(), phase: 'veredicto', round: state.round, agent: review.source === 'gate' ? 'orquestador' : 'revisor', ok: review.verdict === 'APPROVED', note: `${review.verdict}; hallazgos: ${review.findings.length}` });
  commit(`flow(${state.id}): revision ronda ${state.round} (${review.verdict})`);

  if (review.verdict === 'APPROVED' && gate.ok) {
    state.phase = 'DONE';
    return finish(state);
  }
  if (state.round >= state.maxRounds) {
    return block(state, `Se alcanzo el tope de ${state.maxRounds} rondas sin aprobar. Revisa REVIEW.md; para seguir: run ${state.id} --rounds ${state.maxRounds + 2}`, 'REPLAN');
  }
  const prevKeys = state.reviewKeys[state.round - 1];
  if (prevKeys && keys.length && JSON.stringify(prevKeys) === JSON.stringify(keys)) {
    return block(state, 'El revisor reporta exactamente los mismos hallazgos que la ronda anterior: el ciclo no avanza y necesita una decision humana.', 'REPLAN');
  }
  state.phase = 'REPLAN';
  return undefined;
}

async function doReplan(state) {
  const dirRel = `specs/${state.dir}`;
  const tasksPath = path.join(specsRoot(), state.dir, 'tasks.md');
  const next = state.round + 1;
  let feedback = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await callAgent({
      state,
      role: 'replanner',
      template: 'replanner',
      tag: 'replan',
      timeoutKey: 'replan',
      vars: { NEXT_ROUND: next, REVIEW_FILE: `${dirRel}/review-round${state.round}.json`, GATE_FILE: `${dirRel}/gate-round${state.round}.md`, FEEDBACK: feedback },
    });
    if (!res.ok) return block(state, `El planificador fallo al re-planificar: ${res.reason}`, 'REPLAN');
    enforceTerritory('replanner', state);
    const md = readText(tasksPath);
    const hasSection = new RegExp(`^##\\s+Ronda\\s+${next}\\b`, 'im').test(md);
    if (hasSection && countTasks(md).open > 0) {
      commit(`flow(${state.id}): replanificacion ronda ${next}`);
      state.round = next;
      state.phase = 'IMPLEMENT';
      return undefined;
    }
    feedback = `\n## CORRECCION OBLIGATORIA\nTu intento anterior fue rechazado: tasks.md debe tener una seccion "## Ronda ${next}" con tareas nuevas "- [ ]".\n`;
  }
  return block(state, 'El planificador no produjo tareas de correccion validas.', 'REPLAN');
}

// ───────────────────────────── reporte final ─────────────────────────────
function finish(state) {
  const d = path.join(specsRoot(), state.dir);
  const rounds = [];
  for (let r = 1; r <= state.round; r += 1) {
    const g = JSON.parse(readText(path.join(d, `gate-round${r}.json`), 'null'));
    const v = JSON.parse(readText(path.join(d, `review-round${r}.json`), 'null'));
    rounds.push({ r, g, v });
  }
  const last = rounds[rounds.length - 1];
  const minors = rounds.flatMap((x) => (x.v ? x.v.findings.filter((f) => f.severity === 'minor') : [])).filter((f, i, a) => a.findIndex((o) => findingKey(o) === findingKey(f)) === i);
  const cost = state.history.reduce((a, h) => a + (h.costUsd || 0), 0);
  const minutes = Math.round(state.history.reduce((a, h) => a + (h.seconds || 0), 0) / 60);
  const L = [`# Reporte — ${state.dir}`, '', `Objetivo (${state.type}): ${state.objective}`, '', `Resultado: ${state.phase === 'DONE' ? 'APROBADO' : 'DETENIDO'}${state.blocked ? ` — ${state.blocked.reason}` : ''}`, ''];
  L.push('| ronda | puerta de calidad | veredicto | hallazgos blocker/major |', '| - | - | - | - |');
  for (const x of rounds) L.push(`| ${x.r} | ${x.g ? (x.g.ok ? 'verde' : 'roja') : '-'} | ${x.v ? x.v.verdict : '-'} | ${x.v ? x.v.findings.filter((f) => f.severity !== 'minor').length : '-'} |`);
  L.push('', `Tiempo de agentes: ~${minutes} min · Costo reportado por Claude Code: ${cost ? `US$ ${cost.toFixed(2)}` : 'n/d'} (Antigravity no reporta costo).`, '');
  const manual = last && last.v ? last.v.not_verifiable : [];
  L.push('## Pruebas manuales pendientes (celular)', ...(manual.length ? manual.map((x) => `- [ ] ${x}`) : ['- [ ] Abrir la app en el celular y recorrer la funcion cambiada.']), '');
  if (minors.length) L.push('## Mejoras menores detectadas (no bloquean; candidatas a una spec futura)', ...minors.map((f) => `- ${f.file ? `\`${f.file}\`: ` : ''}${f.issue}`), '');
  L.push('## Siguiente paso', `1. Prueba en el celular (lista de arriba).`, `2. \`git push -u origin ${state.branch}\` y abre el PR hacia ${state.baseBranch}.`, '');
  writeText(path.join(d, 'REPORT.md'), `${L.join('\n')}\n`);
  commit(`flow(${state.id}): reporte final`);
  return undefined;
}

// ───────────────────────────── comandos ─────────────────────────────
async function runFlow(state, flags) {
  acquireLock(state);
  process.on('SIGINT', () => {
    log('Interrumpido. Detengo al agente; el estado queda guardado y puedes reanudar con: run ' + state.id);
    killTree(currentChild);
    releaseLock(state);
    process.exit(130);
  });
  try {
    ensureBranch(state);
    if (flags.rounds) state.maxRounds = Number(flags.rounds) || state.maxRounds;
    if (flags.from) {
      const from = String(flags.from).toUpperCase();
      if (!PHASES.includes(from)) fail(`--from debe ser una de: ${PHASES.join(', ')}`);
      state.phase = from;
      state.blocked = null;
    }
    if (state.phase === 'BLOCKED') {
      if (flags.rounds && state.blocked && state.blocked.resumePhase) {
        state.phase = state.blocked.resumePhase;
        state.blocked = null;
      } else {
        log(`La spec ${state.dir} esta detenida: ${state.blocked ? state.blocked.reason : 'sin motivo registrado'}`);
        log(`Para continuar: run ${state.id} --rounds ${state.maxRounds + 2}   (o --from FASE)`);
        return;
      }
    }
    if (state.phase === 'DONE') {
      log(`La spec ${state.dir} ya esta aprobada. Reporte: specs/${state.dir}/REPORT.md`);
      return;
    }
    assertClean(state);
    saveState(state);
    log(`Iniciando ${state.dir} en la fase ${state.phase} (ronda ${state.round}/${state.maxRounds}).`);
    while (state.phase !== 'DONE' && state.phase !== 'BLOCKED') {
      if (state.phase === 'PLAN') await doPlan(state);
      else if (state.phase === 'IMPLEMENT') await doImplement(state);
      else if (state.phase === 'GATE') await doGate(state);
      else if (state.phase === 'REVIEW') await doReview(state);
      else if (state.phase === 'REPLAN') await doReplan(state);
      else block(state, `fase desconocida: ${state.phase}`, 'PLAN');
      saveState(state);
      if (state.phase === 'IMPLEMENT' || state.phase === 'BLOCKED' || state.phase === 'DONE') commit(`flow(${state.id}): estado ${state.phase}`);
    }
    if (state.phase === 'BLOCKED') {
      writeText(path.join(specsRoot(), state.dir, 'REPORT.md'), `# Reporte — ${state.dir}\n\nDETENIDO: ${state.blocked.reason}\n\nContinuar: \`npm run flow -- run ${state.id} --rounds ${state.maxRounds + 2}\`\n`);
      commit(`flow(${state.id}): detenido`);
      console.log(`\nDETENIDO en ${state.dir}: ${state.blocked.reason}\nDetalle: specs/${state.dir}/REVIEW.md y .flow/ (registros de cada agente).\n`);
      process.exitCode = 2;
    } else {
      console.log(`\nAPROBADO ${state.dir} en ${state.round} ronda(s).\nLee specs/${state.dir}/REPORT.md, prueba en el celular y luego:\n  git push -u origin ${state.branch}\n`);
    }
  } finally {
    releaseLock(state);
  }
}

function statusCmd(target) {
  if (!fs.existsSync(specsRoot())) return console.log('No hay specs.');
  const dirs = target ? [findSpecDir(target)].filter(Boolean) : fs.readdirSync(specsRoot()).filter((n) => fs.existsSync(statePath(n)));
  if (!dirs.length) return console.log('No encontre specs con estado del flujo.');
  for (const dir of dirs) {
    const s = loadState(dir);
    console.log(`${s.id} ${String(s.phase).padEnd(9)} ronda ${s.round}/${s.maxRounds} ${s.type.padEnd(4)} ${s.branch}\n    ${s.objective.slice(0, 100)}${s.blocked ? `\n    DETENIDO: ${s.blocked.reason}` : ''}`);
  }
  return undefined;
}

async function doctor(flags) {
  let bad = 0;
  const line = (ok, msg, hint) => {
    console.log(`${ok ? '[OK]   ' : '[FALTA]'} ${msg}`);
    if (!ok) {
      bad += 1;
      if (hint) console.log(`        -> ${hint}`);
    }
  };
  const major = Number(process.versions.node.split('.')[0]);
  line(major >= 20, `Node ${process.versions.node}`, 'Se requiere Node 20 o mayor.');
  line(Boolean(git(['--version']).stdout), 'git instalado');
  line(Boolean((git(['config', 'user.email']).stdout || '').trim()), 'git user.email configurado', 'git config --global user.email "tu@correo"');
  line(fs.existsSync(path.join(ROOT, 'node_modules')), 'dependencias instaladas (node_modules)', 'npm ci');
  for (const t of ['jest', 'eslint']) line(fs.existsSync(path.join(ROOT, 'node_modules', '.bin', t)), `herramienta ${t} instalada`, 'npm run flow -- setup');
  const dirty = changedPaths();
  line(dirty.length === 0, 'arbol de trabajo limpio', 'haz commit o stash de tus cambios antes de correr el flujo');
  for (const [name, spec] of [['claude', CFG.planner], ['agy', CFG.implementer]]) {
    const v = spawnSync(spec.cmd, ['--version'], { shell: IS_WIN, encoding: 'utf8', windowsHide: true });
    line(v.status === 0, `${spec.cmd} instalado ${v.status === 0 ? `(${String(v.stdout).trim().split(/\r?\n/)[0]})` : ''}`, name === 'claude' ? 'Instala Claude Code e inicia sesion una vez con "claude".' : 'Instala el CLI de Antigravity (agy) e inicia sesion una vez con "agy".');
  }
  for (const [what, cmd] of [['maestro (E2E, opcional)', 'maestro'], ['adb (Android, opcional)', 'adb']]) {
    const v = spawnSync(cmd, ['--version'], { shell: IS_WIN, encoding: 'utf8', windowsHide: true });
    console.log(`${v.status === 0 ? '[OK]   ' : '[opcional]'} ${what}`);
  }
  if (!flags['skip-probes']) {
    const probeDir = path.join(os.tmpdir(), 'flow-doctor');
    fs.mkdirSync(probeDir, { recursive: true });
    log('Prueba real de Claude Code (una llamada corta)...');
    const c = await runAgent({ role: 'planner', spec: CFG.planner, message: 'Responde solo con la palabra LISTO', timeoutMin: 3, logBase: path.join(probeDir, 'claude') });
    line(c.ok && /LISTO/i.test(String(c.parsed ? c.parsed.result : c.stdout)), 'Claude Code responde en modo no interactivo', c.reason || 'Revisa la sesion: ejecuta "claude" y vuelve a iniciar sesion.');
    log('Prueba real de Antigravity (una llamada corta que ejecuta un comando)...');
    const a = await runAgent({ role: 'implementer', spec: CFG.implementer, message: 'Ejecuta en la terminal el comando node --version y responde solo con su salida', timeoutMin: 3, logBase: path.join(probeDir, 'agy') });
    const answer = String(a.parsed ? a.parsed.response || a.parsed.result || '' : a.stdout);
    line(a.ok && /v\d+\.\d+/.test(answer), 'Antigravity responde y puede ejecutar comandos', a.reason || permissionsHint());
    if (a.ok && !/v\d+\.\d+/.test(answer)) console.log(`        Respuesta de Antigravity: ${answer.slice(0, 160)}`);
  }
  console.log(bad ? `\n${bad} punto(s) por resolver antes de correr el flujo.` : '\nTodo listo. Prueba: npm run flow -- run "tu objetivo" --type spec');
  process.exitCode = bad ? 1 : 0;
}
function permissionsHint() {
  return (
    'Antigravity no pudo ejecutar comandos sin supervision. Agrega reglas en ~/.gemini/antigravity-cli/settings.json, p. ej.:\n' +
    '          { "permissions": { "allow": ["command(git)", "command(npm)", "command(npx)", "command(node)", "write_file(src/)", "write_file(specs/)"] } }\n' +
    '        (o, bajo tu propio riesgo, agrega "--dangerously-skip-permissions" a implementer.args en workflow/config.json)'
  );
}

function usage() {
  console.log(`Uso:
  node workflow/flow.mjs setup
  node workflow/flow.mjs doctor [--skip-probes]
  node workflow/flow.mjs run "objetivo" [--type spec|bug] [--skip-baseline]
  node workflow/flow.mjs run <id> [--rounds N] [--from PLAN|IMPLEMENT|GATE|REVIEW|REPLAN]
  node workflow/flow.mjs new "objetivo" [--type spec|bug]
  node workflow/flow.mjs status [id]`);
}

async function main() {
  const { pos, flags } = parseArgs(process.argv.slice(2));
  const cmd = pos[0];
  if (!cmd || cmd === 'help' || flags.help) return usage();
  ROOT = findRoot();
  CFG = loadConfig(flags.config);
  if (cmd === 'doctor') return doctor(flags);
  if (cmd === 'setup') return setupCmd();
  if (cmd === 'status') return statusCmd(pos[1]);
  if (cmd === 'new') {
    if (!pos[1]) fail('Falta el objetivo: new "objetivo"');
    createSpec(pos.slice(1).join(' '), String(flags.type || 'spec'));
    return undefined;
  }
  if (cmd === 'run') {
    if (!pos[1]) fail('Falta el objetivo o el id: run "objetivo" | run <id>');
    const target = pos.slice(1).join(' ');
    const existing = findSpecDir(target);
    if (!existing && CFG.gate.baselineCheck !== false && !flags['skip-baseline']) {
      assertClean(null);
      await baselineCheck();
    }
    const state = existing ? loadState(existing) : createSpec(target, String(flags.type || 'spec'));
    return runFlow(state, flags);
  }
  usage();
  return process.exit(1);
}

main().catch((e) => {
  console.error(`\n[ERROR INESPERADO] ${e.stack || e.message}`);
  process.exit(1);
});
