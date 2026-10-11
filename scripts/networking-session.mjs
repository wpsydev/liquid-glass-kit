// Foreground timer for a live agent session. It never posts to X itself.
// Send {"type":"completed","result":"..."} after a reviewed round to rearm.
// Send {"type":"stop"}, close stdin, or press Ctrl-C to end the timer.
import { randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback;
const minSeconds = option('--min-seconds', 600);
const maxSeconds = option('--max-seconds', 1800);
if (!Number.isSafeInteger(minSeconds) || !Number.isSafeInteger(maxSeconds) || minSeconds < 1 || maxSeconds < minSeconds || maxSeconds > 86400) {
  throw new Error('Use integer intervals: 1 <= min <= max <= 86400 seconds');
}
const statePath = process.env.LG_NETWORK_SESSION_STATE || '/tmp/lg-networking-session-state.json';
let timer, stopped = false, round = 0, phase = 'starting';
const emit = (event, extra = {}) => {
  const state = { event, round, at: new Date().toISOString(), pid: process.pid, minSeconds, maxSeconds, scope: 'foreground live session, no independent browser worker', ...extra };
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  process.stdout.write(JSON.stringify(state) + '\n');
};
function arm() {
  const delaySeconds = randomInt(minSeconds, maxSeconds + 1);
  phase = 'waiting';
  emit('waiting', { delaySeconds, dueAt: new Date(Date.now() + delaySeconds * 1000).toISOString() });
  timer = setTimeout(() => {
    phase = 'due'; round++;
    emit('due', { instructions: 'Check incoming responses, review a real AI/Claude conversation, engage only with useful specific feedback, verify receipts, then send completed. Skip if nothing useful.' });
  }, delaySeconds * 1000);
}
const input = createInterface({ input: process.stdin, terminal: false });
function stop(reason) {
  if (stopped) return;
  stopped = true; clearTimeout(timer); phase = 'stopped';
  emit('stopped', { reason }); input.close();
  process.stdin.destroy();
}
input.on('line', line => {
  try {
    const message = JSON.parse(line);
    if (message.type === 'stop') stop('requested');
    else if (message.type === 'completed' && phase === 'due' && !stopped) {
      emit('completed', { result: String(message.result || 'reviewed').slice(0,1000) }); arm();
    } else emit('ignored', { phase, reason: 'Only a completed due round can rearm' });
  } catch { emit('ignored', { phase, reason: 'Expected a JSON line' }); }
});
input.on('close', () => stop('stdin closed'));
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
arm();
