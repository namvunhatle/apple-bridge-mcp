# Apple Bridge MCP

**Give Claude access to your Mac's built-in apps — Reminders, Notes, Calendar, Contacts and Shortcuts.**

Runs locally over stdio. No cloud, no account, no data leaves your machine.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Platform: macOS](https://img.shields.io/badge/platform-macOS-lightgrey)
![Node: >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

---

## Why

Claude can write code, but it can't see your calendar or add a reminder. Apple Bridge is a small MCP server that lets it read and write the Apple apps you already use — through the same Apple Events / JXA layer macOS has supported for years.

- **Local only.** The server talks to macOS. Nothing is uploaded.
- **No API keys.** Uses the permissions you already grant to apps.
- **Small surface.** 9 tools, no background daemon, no database.

## Tools

| Tool | What it does |
| --- | --- |
| `list_reminders` | List reminders in a list, optionally including completed ones |
| `create_reminder` | Create a reminder with notes and an ISO 8601 due date |
| `search_notes` | Search Apple Notes by title |
| `create_note` | Create a note in a folder |
| `list_calendars` | List calendars with name, writable flag and description |
| `list_events` | List events in a date range (default: today → +7 days) |
| `search_contacts` | Search contacts by name, organization, email or phone |
| `list_shortcuts` | List the shortcuts installed in the Shortcuts app |
| `run_shortcut` | Run a shortcut by exact name |

## Requirements

- macOS 13 or newer
- Node.js 22 or newer
- Claude Desktop, Claude Code, Cursor, or any other MCP client

## Install

```bash
git clone https://github.com/namvunhatle/apple-bridge-mcp.git
cd apple-bridge-mcp
npm install
npm run build
```

This produces `dist/cli.js`. Point your MCP client at that file with an **absolute path**.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apple-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/apple-bridge-mcp/dist/cli.js"]
    }
  }
}
```

Restart Claude Desktop.

### Claude Code

```bash
claude mcp add apple-bridge -- node /absolute/path/to/apple-bridge-mcp/dist/cli.js
```

### Cursor

Add the same `mcpServers` block to `~/.cursor/mcp.json` and restart Cursor.

## First run: permissions

The first time a tool touches an app, macOS asks:

> "Terminal" wants access to control "Reminders".

Click **Allow**. Each app is granted separately — Reminders, Notes, Calendar, Contacts and Shortcuts.

If you clicked **Don't Allow**, open:

**System Settings → Privacy & Security → Automation**

and enable the app under your terminal / Claude Desktop / Cursor.

## Examples

Once connected, just ask:

- "What's on my calendar this week?"
- "Add 'renew passport' to my Errands list, due 2026-12-01 at 9am."
- "Find Hương's phone number."
- "Save this summary as a note called 'Weekly plan'."
- "Run my Battery Stats shortcut."

## Configuration notes

**`list_events` defaults**

- Range: start of today → 7 days ahead.
- Reads only writable calendars by default. Read-only calendars (Holidays, Birthdays) can be slow, so pass `includeReadOnly: true` if you need them.
- Pass `calendar` to read a single calendar and skip the rest.
- Pass explicit ISO 8601 `from` / `to` for any other range.

**`list_reminders`** defaults to the `Reminders` list. Pass another list name, e.g. `work`.

**`search_notes`** matches titles only, not note bodies.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Not authorized to send Apple events` | Grant Automation permission in System Settings → Privacy & Security → Automation, then restart the client |
| `list not found` / `calendar not found` | Check the exact name; list names are case-sensitive |
| Calendar feels slow | Expected: Apple Events take 10–15s across all calendars. Pass `calendar` or narrow the date range |
| `osascript returned non-JSON` | Run the tool from a terminal to see the raw error |
| Tools missing in Claude | Restart the client after editing the config; check the path is absolute |

## Limitations

- **Things** is not supported (planned, requires SQLite + Full Disk Access).
- **Notes** search covers titles only.
- **Calendar** reads through Apple Events; very large calendars are slow. EventKit is the long-term fix.
- **Shortcuts** can run anything, including destructive actions. The tool description asks the model to run shortcuts only on explicit request — treat it accordingly.
- Two lists/folders with the same name resolve to the first match.
- Accounts with duplicate calendar/list names may need the exact calendar passed explicitly.

## Privacy

Apple Bridge makes no network requests. All reads and writes go through macOS Apple Events. The only data it returns is what the tool call asks for.

## Development

```bash
npm test        # unit tests (script builders + shortcuts wrapper)
npm run build   # compile TypeScript to dist/
npm start       # run the stdio server from source with tsx
```

Project layout:

```
src/scripts.ts     # JXA script builders + escaping
src/osascript.ts   # osascript runner + JSON parsing
src/shortcuts.ts   # shortcuts CLI wrapper
src/server.ts      # MCP server and tool registration
src/cli.ts         # stdio entry point
tests/             # node:test suites
```

## License

MIT
