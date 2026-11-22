import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export function shortcutRunArgs(name: string): string[] {
  return ['run', name];
}

export function parseShortcutList(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function listShortcuts(timeoutMs = 20_000): Promise<string[]> {
  const { stdout } = await run('shortcuts', ['list'], {
    timeout: timeoutMs,
    maxBuffer: 2 * 1024 * 1024,
  });
  return parseShortcutList(stdout);
}

export async function runShortcut(
  name: string,
  timeoutMs = 60_000,
): Promise<{ ok: true; output: string }> {
  if (!name.trim()) throw new Error('shortcut name is empty');

  const { stdout } = await run('shortcuts', shortcutRunArgs(name), {
    timeout: timeoutMs,
    maxBuffer: 2 * 1024 * 1024,
  });
  return { ok: true, output: stdout.trim() };
}
