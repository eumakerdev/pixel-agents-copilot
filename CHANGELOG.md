# Changelog

## v2.0.0 — Pixel Agents for Copilot

> 🔀 This version marks the fork from the original [Pixel Agents](https://github.com/pablodelucca/pixel-agents) by [Pablo De Lucca](https://github.com/pablodelucca).

### Changed

- **GitHub Copilot integration** — Migrating from Claude Code CLI + JSONL file watching to GitHub Copilot Chat API and Agent mode
- **Tool mapping** — All tool activity tracking now maps to Copilot's tool names (`read_file`, `replace_string_in_file`, `run_in_terminal`, `runSubagent`, etc.)
- **Session management** — Agent sessions use VS Code Chat API instead of terminal-based JSONL monitoring
- **Rebranded** — All references updated from "Claude Code" to "Copilot Agent"

### Removed

- Claude Code CLI dependency
- JSONL transcript file monitoring (`fileWatcher.ts`, `transcriptParser.ts`)
- `~/.claude/projects/` path handling
- `@anthropic-ai/sdk` dev dependency

### Preserved

- Full pixel art office rendering engine (unchanged)
- Layout editor with all tools, undo/redo, export/import
- Character animation system (FSM, sprites, pathfinding)
- Speech bubbles, sound notifications, sub-agent visualization
- Persistent layouts across windows
- All 6 character palettes with hue shift diversification

---

## Previous Releases (original project)

## v1.0.2

### Bug Fixes

- **macOS path sanitization and file watching reliability** ([#45](https://github.com/pablodelucca/pixel-agents/pull/45)) — Comprehensive path sanitization for workspace paths with underscores, Unicode/CJK chars, dots, spaces, and special characters. Added `fs.watchFile()` as reliable secondary watcher on macOS. Fixes [#32](https://github.com/pablodelucca/pixel-agents/issues/32), [#39](https://github.com/pablodelucca/pixel-agents/issues/39), [#40](https://github.com/pablodelucca/pixel-agents/issues/40).

### Features

- **Workspace folder picker for multi-root workspaces** ([#12](https://github.com/pablodelucca/pixel-agents/pull/12)) — Clicking "+ Agent" in a multi-root workspace now shows a picker to choose which folder to open Claude Code in.

### Maintenance

- **Lower VS Code engine requirement to ^1.107.0** ([#13](https://github.com/pablodelucca/pixel-agents/pull/13)) — Broadens compatibility with older VS Code versions and forks (Cursor, etc.) without code changes.

### Contributors

Thank you to the contributors who made this release possible:

- [@johnnnzhub](https://github.com/johnnnzhub) — macOS path sanitization and file watching fixes
- [@pghoya2956](https://github.com/pghoya2956) — multi-root workspace folder picker, VS Code engine compatibility

## v1.0.1

Initial public release.
