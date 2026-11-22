export function embed(value: string): string {
  return JSON.stringify(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildListRemindersScript({
  list,
  includeCompleted,
  limit,
}: {
  list: string;
  includeCompleted: boolean;
  limit: number;
}): string {
  return [
    `const listName = ${embed(list)};`,
    `const includeCompleted = ${includeCompleted ? 'true' : 'false'};`,
    `const limit = ${limit};`,
    `function main() {`,
    `  const app = Application('Reminders');`,
    `  let list;`,
    `  try { list = app.lists.byName(listName); } catch (e) { return { error: 'list not found: ' + listName }; }`,
    `  const rows = [];`,
    `  const all = list.reminders();`,
    `  for (const r of all) {`,
    `    let completed = false; try { completed = r.completed(); } catch (e) {}`,
    `    if (completed && !includeCompleted) continue;`,
    `    let dueDate = null; try { const d = r.dueDate(); if (d) dueDate = d.toISOString(); } catch (e) {}`,
    `    let body = ''; try { body = r.body() || ''; } catch (e) {}`,
    `    rows.push({ id: r.id(), name: r.name(), completed: completed, dueDate: dueDate, list: listName, notes: String(body).slice(0, 500) });`,
    `    if (rows.length >= limit) break;`,
    `  }`,
    `  return { items: rows };`,
    `}`,
    `JSON.stringify(main());`,
  ].join('\n');
}

export function buildCreateReminderScript({
  title,
  list,
  notes,
  due,
}: {
  title: string;
  list: string;
  notes?: string;
  due?: string;
}): string {
  return [
    `const listName = ${embed(list)};`,
    `const title = ${embed(title)};`,
    `const notes = ${embed(notes ?? '')};`,
    `const due = ${embed(due ?? '')};`,
    `function main() {`,
    `  const app = Application('Reminders');`,
    `  let list;`,
    `  try { list = app.lists.byName(listName); } catch (e) { return { error: 'list not found: ' + listName }; }`,
    `  const props = { name: title };`,
    `  if (notes) props.body = notes;`,
    `  const reminder = app.Reminder(props);`,
    `  list.reminders.push(reminder);`,
    `  if (due) { const d = new Date(due); if (!isNaN(d.getTime())) reminder.dueDate = d; }`,
    `  return { ok: true, id: reminder.id(), name: reminder.name() };`,
    `}`,
    `JSON.stringify(main());`,
  ].join('\n');
}

export function buildSearchNotesScript({
  query,
  limit,
}: {
  query: string;
  limit: number;
}): string {
  return [
    `const query = ${embed(query)};`,
    `const limit = ${limit};`,
    `function main() {`,
    `  const app = Application('Notes');`,
    `  const matches = app.notes.whose({ name: { _contains: query } })();`,
    `  const rows = [];`,
    `  for (const n of matches) {`,
    `    let snippet = ''; try { snippet = String(n.plaintext() || '').slice(0, 300); } catch (e) {}`,
    `    let modified = null; try { const d = n.modificationDate(); if (d) modified = d.toISOString(); } catch (e) {}`,
    `    rows.push({ id: n.id(), title: n.name(), modified: modified, snippet: snippet });`,
    `    if (rows.length >= limit) break;`,
    `  }`,
    `  return { items: rows };`,
    `}`,
    `JSON.stringify(main());`,
  ].join('\n');
}

export function buildCreateNoteScript({
  title,
  body,
  folder = 'Notes',
}: {
  title: string;
  body: string;
  folder?: string;
}): string {
  // `name` đã đặt tiêu đề; body chỉ chứa nội dung để tránh lặp tiêu đề.
  const html = `<div>${escapeHtml(body).replace(/\n/g, '<br>')}</div>`;

  return [
    `const folderName = ${embed(folder)};`,
    `const title = ${embed(title)};`,
    `const html = ${embed(html)};`,
    `function main() {`,
    `  const app = Application('Notes');`,
    `  let folder;`,
    `  try { folder = app.folders.byName(folderName); } catch (e) { return { error: 'folder not found: ' + folderName }; }`,
    `  const note = app.Note({ name: title, body: html });`,
    `  folder.notes.push(note);`,
    `  return { ok: true, id: note.id(), name: note.name() };`,
    `}`,
    `JSON.stringify(main());`,
  ].join('\n');
}

export function buildListCalendarsScript(): string {
  return [
    `function main() {`,
    `  const app = Application('Calendar');`,
    `  const rows = app.calendars().map((c) => {`,
    `    let writable = false; try { writable = c.writable(); } catch (e) {}`,
    `    let description = ''; try { description = c.description() || ''; } catch (e) {}`,
    `    return { name: c.name(), writable: writable, description: description };`,
    `  });`,
    `  return { items: rows };`,
    `}`,
    `JSON.stringify(main());`,
  ].join('\n');
}

export function buildListEventsScript({
  from,
  to,
  calendar,
  limit,
  includeReadOnly = false,
}: {
  from: string;
  to: string;
  calendar?: string;
  limit: number;
  includeReadOnly?: boolean;
}): string {
  return [
    `const from = new Date(${embed(from)});`,
    `const to = new Date(${embed(to)});`,
    `const calendarName = ${calendar ? embed(calendar) : 'null'};`,
    `const includeReadOnly = ${includeReadOnly ? 'true' : 'false'};`,
    `const limit = ${limit};`,
    `function main() {`,
    `  const app = Application('Calendar');`,
    `  let calendars;`,
    `  if (calendarName) {`,
    `    try { calendars = [app.calendars.byName(calendarName)]; } catch (e) { return { error: 'calendar not found: ' + calendarName }; }`,
    `  } else {`,
    `    calendars = app.calendars();`,
    `  }`,
    `  const rows = [];`,
    `  for (const cal of calendars) {`,
    `    let writable = false; try { writable = cal.writable(); } catch (e) {}`,
    `    if (!calendarName && !includeReadOnly && !writable) continue;`,
    `    let events = [];`,
    `    try { events = cal.events.whose({ endDate: { _greaterThan: from }, startDate: { _lessThan: to } })(); } catch (e) { continue; }`,
    `    for (const ev of events) {`,
    `      let start = null; try { start = ev.startDate(); } catch (e) {}`,
    `      if (!start) continue;`,
    `      let end = null; try { end = ev.endDate(); } catch (e) {}`,
    `      if (!end) end = start;`,
    `      let allDay = false; try { allDay = ev.alldayEvent(); } catch (e) {}`,
    `      let location = ''; try { location = ev.location() || ''; } catch (e) {}`,
    `      let notes = ''; try { notes = String(ev.description() || '').slice(0, 500); } catch (e) {}`,
    `      rows.push({ title: ev.summary(), start: start.toISOString(), end: end.toISOString(), allDay: allDay, calendar: cal.name(), location: location, notes: notes });`,
    `      if (rows.length >= limit) { rows.sort((a, b) => a.start.localeCompare(b.start)); return { items: rows }; }`,
    `    }`,
    `  }`,
    `  rows.sort((a, b) => a.start.localeCompare(b.start));`,
    `  return { items: rows };`,
    `}`,
    `JSON.stringify(main());`,
  ].join('\n');
}

export function buildSearchContactsScript({
  query,
  limit,
}: {
  query: string;
  limit: number;
}): string {
  return [
    `const query = ${embed(query)}.toLowerCase();`,
    `const limit = ${limit};`,
    `function main() {`,
    `  const app = Application('Contacts');`,
    `  const names = app.people.name() || [];`,
    `  let organizations = []; try { organizations = app.people.organization() || []; } catch (e) {}`,
    `  let emails = []; try { emails = app.people.emails.value() || []; } catch (e) {}`,
    `  let phones = []; try { phones = app.people.phones.value() || []; } catch (e) {}`,
    `  const rows = [];`,
    `  for (let i = 0; i < names.length; i++) {`,
    `    const name = names[i] || '';`,
    `    const organization = organizations[i] || '';`,
    `    const personEmails = (emails[i] || []).map(String);`,
    `    const personPhones = (phones[i] || []).map(String);`,
    `    const hay = [name, organization, personEmails.join(' '), personPhones.join(' ')].join(' ').toLowerCase();`,
    `    if (hay.indexOf(query) === -1) continue;`,
    `    rows.push({ name: name, organization: organization, emails: personEmails, phones: personPhones });`,
    `    if (rows.length >= limit) break;`,
    `  }`,
    `  return { items: rows };`,
    `}`,
    `JSON.stringify(main());`,
  ].join('\n');
}
