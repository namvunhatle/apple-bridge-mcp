import test from 'node:test';
import assert from 'node:assert/strict';
import {
  embed,
  escapeHtml,
  buildListRemindersScript,
  buildCreateReminderScript,
  buildSearchNotesScript,
  buildCreateNoteScript,
  buildListCalendarsScript,
  buildListEventsScript,
  buildSearchContactsScript,
} from '../src/scripts.ts';

test('embed tạo literal an toàn cho quote, backslash, newline', () => {
  const value = 'a"b\\c\nd';
  assert.equal(JSON.parse(embed(value)), value);
});

test('input độc hại không thoát khỏi literal', () => {
  const evil = 'x"; do shell script "touch /tmp/pwned"; "';
  const script = buildCreateReminderScript({ title: evil, list: 'Reminders' });
  assert.ok(script.includes(embed(evil)));
  assert.ok(!script.includes('do shell script "touch'));
});

test('list script chứa list name và cờ includeCompleted', () => {
  const script = buildListRemindersScript({
    list: 'Công việc',
    includeCompleted: true,
    limit: 10,
  });
  assert.ok(script.includes(embed('Công việc')));
  assert.ok(script.includes('const includeCompleted = true'));
  assert.ok(script.includes('const limit = 10'));
});

test('create reminder chứa due date ISO', () => {
  const script = buildCreateReminderScript({
    title: 'Gọi khách',
    list: 'Reminders',
    due: '2026-12-01T09:00:00.000Z',
  });
  assert.ok(script.includes(embed('2026-12-01T09:00:00.000Z')));
});

test('create reminder dùng class số ít app.Reminder', () => {
  const script = buildCreateReminderScript({ title: 'x', list: 'Reminders' });
  assert.ok(script.includes('app.Reminder('));
  assert.ok(!script.includes('app.Reminders('));
});

test('note body không lặp tiêu đề', () => {
  const script = buildCreateNoteScript({ title: 'Tiêu đề', body: 'nội dung' });
  assert.ok(!script.includes(embed(`<h1>Tiêu đề</h1>`)));
  assert.ok(script.includes('nội dung'));
});

test('search notes escape query và limit', () => {
  const script = buildSearchNotesScript({ query: 'a"b', limit: 5 });
  assert.ok(script.includes(embed('a"b')));
  assert.ok(script.includes('const limit = 5'));
});

test('note body được escape HTML', () => {
  assert.equal(
    escapeHtml('<b>"x" & y</b>'),
    '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;',
  );
  const script = buildCreateNoteScript({
    title: '<h1>x</h1>',
    body: 'a\n<b>',
  });
  assert.ok(script.includes('&lt;b&gt;'));
  assert.ok(!script.includes('<b>'));
});

test('list calendars dùng app Calendar', () => {
  const script = buildListCalendarsScript();
  assert.ok(script.includes(`Application('Calendar')`));
  assert.ok(script.includes('calendars()'));
});

test('list events nhúng from/to, calendar name, limit', () => {
  const script = buildListEventsScript({
    from: '2026-12-01T00:00:00.000Z',
    to: '2026-12-08T00:00:00.000Z',
    calendar: 'Công việc "Q4"',
    limit: 10,
  });
  assert.ok(script.includes(embed('2026-12-01T00:00:00.000Z')));
  assert.ok(script.includes(embed('2026-12-08T00:00:00.000Z')));
  assert.ok(script.includes(embed('Công việc "Q4"')));
  assert.ok(script.includes('const limit = 10'));
  assert.ok(script.includes('startDate()'));
  assert.ok(script.includes(`Application('Calendar')`));
});

test('list events lọc phía Calendar và có cờ includeReadOnly', () => {
  const script = buildListEventsScript({
    from: '2026-12-01T00:00:00.000Z',
    to: '2026-12-08T00:00:00.000Z',
    limit: 10,
    includeReadOnly: true,
  });
  assert.ok(script.includes('whose('));
  assert.ok(script.includes('const includeReadOnly = true'));
  assert.ok(script.includes('writable()'));

  const defaultScript = buildListEventsScript({
    from: '2026-12-01T00:00:00.000Z',
    to: '2026-12-08T00:00:00.000Z',
    limit: 10,
  });
  assert.ok(defaultScript.includes('const includeReadOnly = false'));
});

test('search contacts escape query, limit, tìm cả email/phone', () => {
  const script = buildSearchContactsScript({ query: 'a"b', limit: 7 });
  assert.ok(script.includes(embed('a"b')));
  assert.ok(script.includes('const limit = 7'));
  assert.ok(script.includes(`Application('Contacts')`));
  // Đọc bulk một lần thay vì gọi từng property cho mỗi người.
  assert.ok(script.includes('app.people.name()'));
  assert.ok(script.includes('emails.value()'));
  assert.ok(script.includes('phones.value()'));
});
