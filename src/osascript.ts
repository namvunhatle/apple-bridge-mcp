import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function runJxa<T>(script: string, timeoutMs = 20_000): Promise<T> {
  const { stdout } = await run('osascript', ['-l', 'JavaScript', '-e', script], {
    timeout: timeoutMs,
    maxBuffer: 2 * 1024 * 1024,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`osascript returned non-JSON: ${stdout.slice(0, 200)}`);
  }

  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    throw new Error(String((parsed as { error: unknown }).error));
  }

  return parsed as T;
}
