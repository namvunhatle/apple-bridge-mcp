import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { runJxa } from './osascript.ts';
import { listShortcuts, runShortcut } from './shortcuts.ts';
import {
  buildCreateNoteScript,
  buildCreateReminderScript,
  buildListCalendarsScript,
  buildListEventsScript,
  buildListRemindersScript,
  buildSearchContactsScript,
  buildSearchNotesScript,
} from './scripts.ts';

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

function ok(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysFromNowIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'apple-bridge-mcp', version: '0.1.0' });

  server.registerTool(
    'list_reminders',
    {
      description: 'List reminders from an Apple Reminders list.',
      inputSchema: {
        list: z.string().default('Reminders').describe('Reminders list name'),
        includeCompleted: z.boolean().default(false),
        limit: z.number().int().min(1).max(200).default(50),
      },
    },
    async ({ list, includeCompleted, limit }) => {
      try {
        const result = await runJxa(
          buildListRemindersScript({ list, includeCompleted, limit }),
        );
        return ok(result);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'create_reminder',
    {
      description: 'Create a reminder in an Apple Reminders list.',
      inputSchema: {
        title: z.string().min(1).describe('Reminder title'),
        list: z.string().default('Reminders').describe('Reminders list name'),
        notes: z.string().optional(),
        due: z
          .string()
          .optional()
          .describe('ISO 8601 due date, e.g. 2026-12-01T09:00:00+07:00'),
      },
    },
    async ({ title, list, notes, due }) => {
      try {
        const result = await runJxa(
          buildCreateReminderScript({ title, list, notes, due }),
        );
        return ok(result);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'search_notes',
    {
      description: 'Search Apple Notes by title.',
      inputSchema: {
        query: z.string().min(1),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    async ({ query, limit }) => {
      try {
        const result = await runJxa(buildSearchNotesScript({ query, limit }));
        return ok(result);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'create_note',
    {
      description: 'Create a note in Apple Notes.',
      inputSchema: {
        title: z.string().min(1),
        body: z.string().default(''),
        folder: z.string().default('Notes').describe('Notes folder name'),
      },
    },
    async ({ title, body, folder }) => {
      try {
        const result = await runJxa(buildCreateNoteScript({ title, body, folder }));
        return ok(result);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'list_calendars',
    {
      description: 'List macOS Calendar calendars (name, id, writable).',
      inputSchema: {},
    },
    async () => {
      try {
        const result = await runJxa(buildListCalendarsScript());
        return ok(result);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'list_events',
    {
      description:
        'List calendar events overlapping a date range (default: today to +7 days).',
      inputSchema: {
        from: z
          .string()
          .optional()
          .describe('ISO 8601 range start. Default: start of today.'),
        to: z
          .string()
          .optional()
          .describe('ISO 8601 range end. Default: now + 7 days.'),
        calendar: z
          .string()
          .optional()
          .describe('Only this calendar name. Omit to read all writable calendars.'),
        includeReadOnly: z
          .boolean()
          .default(false)
          .describe(
            'Also include read-only calendars (holidays, birthdays). Slower.',
          ),
        limit: z.number().int().min(1).max(500).default(100),
      },
    },
    async ({ from, to, calendar, includeReadOnly, limit }) => {
      try {
        const fromIso = from ?? startOfTodayIso();
        const toIso = to ?? daysFromNowIso(7);
        const fromMs = Date.parse(fromIso);
        const toMs = Date.parse(toIso);
        if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
          return fail('from/to must be valid ISO 8601 dates');
        }
        if (fromMs >= toMs) return fail('from must be before to');

        const result = await runJxa(
          buildListEventsScript({
            from: fromIso,
            to: toIso,
            calendar,
            limit,
            includeReadOnly,
          }),
          60_000,
        );
        return ok(result);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'search_contacts',
    {
      description:
        'Search macOS Contacts by name, organization, email or phone.',
      inputSchema: {
        query: z.string().min(1),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    async ({ query, limit }) => {
      try {
        const result = await runJxa(buildSearchContactsScript({ query, limit }));
        return ok(result);
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'list_shortcuts',
    {
      description: 'List the names of shortcuts available in the Shortcuts app.',
      inputSchema: {},
    },
    async () => {
      try {
        return ok({ items: await listShortcuts() });
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'run_shortcut',
    {
      description:
        'Run a shortcut by exact name. Only call when the user explicitly asks to run a shortcut.',
      inputSchema: {
        name: z.string().min(1).describe('Exact shortcut name'),
      },
    },
    async ({ name }) => {
      try {
        return ok(await runShortcut(name));
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  return server;
}
