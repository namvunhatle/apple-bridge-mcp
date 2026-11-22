import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseShortcutList,
  runShortcut,
  shortcutRunArgs,
} from '../src/shortcuts.ts';

test('shortcutRunArgs truyền tên nguyên vẹn, không qua shell', () => {
  const name = 'My Shortcut "x" & $(touch /tmp/pwned)';
  assert.deepEqual(shortcutRunArgs(name), ['run', name]);
});

test('parseShortcutList bỏ dòng trống và khoảng trắng', () => {
  assert.deepEqual(parseShortcutList('A Shortcut\n\nB Shortcut\n'), [
    'A Shortcut',
    'B Shortcut',
  ]);
});

test('runShortcut từ chối tên rỗng trước khi spawn', async () => {
  await assert.rejects(() => runShortcut('   '), /empty/i);
});
