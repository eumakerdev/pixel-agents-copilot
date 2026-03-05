# Pixel Agents: Claude Code → GitHub Copilot — Conversion Plan

> **Purpose**: This document is the authoritative step-by-step implementation guide for converting the Pixel Agents extension from Claude Code to GitHub Copilot. An AI agent should follow each phase, task, and sub-task **in order**, marking each KPI as PASS/FAIL before proceeding.

---

## Table of Contents

1. [Overview & Glossary](#1-overview--glossary)
2. [Phase 0 — Pre-flight Checks](#2-phase-0--pre-flight-checks)
3. [Phase 1 — Rename & Rebrand (No Logic Changes)](#3-phase-1--rename--rebrand-no-logic-changes)
4. [Phase 2 — New Data Source Architecture](#4-phase-2--new-data-source-architecture)
5. [Phase 3 — Extension Backend: Agent Lifecycle](#5-phase-3--extension-backend-agent-lifecycle)
6. [Phase 4 — Extension Backend: Event Parsing](#6-phase-4--extension-backend-event-parsing)
7. [Phase 5 — Extension Backend: Session Monitoring](#7-phase-5--extension-backend-session-monitoring)
8. [Phase 6 — Webview Adaptation](#8-phase-6--webview-adaptation)
9. [Phase 7 — Custom Agent Configuration](#9-phase-7--custom-agent-configuration)
10. [Phase 8 — Documentation & Metadata](#10-phase-8--documentation--metadata)
11. [Phase 9 — Build, Lint, Test](#11-phase-9--build-lint-test)
12. [Phase 10 — Integration Testing](#12-phase-10--integration-testing)
13. [Appendices](#13-appendices)

---

## 1. Overview & Glossary

### What Changes

| Layer                                 | % Code Changed | Nature                                          |
| ------------------------------------- | -------------- | ----------------------------------------------- |
| Extension backend (`src/`)            | ~70%           | New data source, new lifecycle, remove JSONL    |
| Webview UI (`webview-ui/src/`)        | ~5%            | Rename props/messages, update tool name mapping |
| Office engine (canvas/sprites/editor) | 0%             | No changes needed                               |
| Asset system                          | 0%             | No changes needed                               |
| Layout persistence                    | 0%             | No changes needed                               |

### Glossary

| Term            | Old (Claude)                            | New (Copilot)                                          |
| --------------- | --------------------------------------- | ------------------------------------------------------ |
| Agent session   | Terminal running `claude --session-id`  | VS Code Chat session (Agent mode)                      |
| Transcript      | JSONL file at `~/.claude/projects/`     | Chat API events / proposed `chatSessionsProvider`      |
| Tool use        | `tool_use` JSONL block                  | Tool invocation via LM Tools API                       |
| Tool result     | `tool_result` JSONL block               | Tool completion callback                               |
| Turn end        | `system.subtype === 'turn_duration'`    | Response stream completion                             |
| Sub-agent       | `Task` tool → `progress.agent_progress` | `runSubagent` tool invocation                          |
| Permission wait | 7s silence heuristic                    | `ChatSessionStatus.NeedsInput` or tool approval dialog |
| Idle/waiting    | Text-idle 5s timer                      | Response completion + no pending tools                 |

### Key Reference Documents

- `docs/TOOL-MAPPING.md` — Complete tool name mapping table
- `docs/ARCHITECTURE.md` — Before/after architecture diagram
- `docs/FILE-MANIFEST.md` — Every file to create/modify/delete with exact changes

---

## 2. Phase 0 — Pre-flight Checks

> **Goal**: Ensure the project builds and the AI agent understands the codebase before making changes.

### Task 0.1: Verify build succeeds

```
Steps:
1. Run `npm install` in project root
2. Run `cd webview-ui && npm install && cd ..`
3. Run `npm run build`
```

**KPI**: Build completes with exit code 0. No TypeScript errors. No ESLint errors.

### Task 0.2: Read all source files listed in FILE-MANIFEST.md

```
Steps:
1. Read every file listed in docs/FILE-MANIFEST.md
2. Confirm file contents match expected patterns from this document
```

**KPI**: All files exist and contain the expected Claude-specific code patterns.

### Task 0.3: Create a git branch

```
Steps:
1. Create branch `feat/copilot-conversion` from current HEAD
2. Commit message convention: "feat(copilot): <description>"
```

**KPI**: Branch created. `git status` shows clean working tree.

---

## 3. Phase 1 — Rename & Rebrand (No Logic Changes)

> **Goal**: Replace all "Claude" text references with "Copilot" equivalents. No logic changes. The extension should still build (though it won't work with Copilot yet).

### Task 1.1: Update `src/constants.ts`

| Line                   | Old             | New               |
| ---------------------- | --------------- | ----------------- |
| `TERMINAL_NAME_PREFIX` | `'Claude Code'` | `'Copilot Agent'` |

**KPI**: `grep -r "Claude Code" src/` returns 0 results.

### Task 1.2: Update `package.json`

| Field         | Old                                                                                    | New                                                                                       |
| ------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `description` | `"Pixel art office where your Claude Code agents come to life as animated characters"` | `"Pixel art office where your GitHub Copilot agents come to life as animated characters"` |

**KPI**: `node -e "console.log(require('./package.json').description)"` contains "Copilot".

### Task 1.3: Remove `@anthropic-ai/sdk` dependency

The `devDependencies` in `package.json` includes `"@anthropic-ai/sdk": "^0.74.0"`. This is only used by scripts (`3-vision-inspect.ts`), not the extension itself. Remove it.

```
Steps:
1. Remove the line `"@anthropic-ai/sdk": "^0.74.0"` from package.json devDependencies
```

**KPI**: `@anthropic-ai/sdk` not in package.json.

### Task 1.4: Rename message type `openClaude` → `openAgent`

Files to change (5 files, ~10 occurrences total):

| File                                                  | Change                                                                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/PixelAgentsViewProvider.ts` line 65              | `message.type === 'openClaude'` → `message.type === 'openAgent'`                                                                             |
| `webview-ui/src/hooks/useEditorActions.ts` line 82    | `vscode.postMessage({ type: 'openClaude' })` → `vscode.postMessage({ type: 'openAgent' })`                                                   |
| `webview-ui/src/components/BottomToolbar.tsx` line 85 | `vscode.postMessage({ type: 'openClaude', folderPath: folder.path })` → `vscode.postMessage({ type: 'openAgent', folderPath: folder.path })` |

**KPI**: `grep -r "openClaude" src/ webview-ui/src/` returns 0 results.

### Task 1.5: Rename prop/callback `onOpenClaude` → `onOpenAgent`

Files to change:

| File                                          | Changes                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `webview-ui/src/components/BottomToolbar.tsx` | `onOpenClaude` → `onOpenAgent` in interface, destructuring, and usage (3 occurrences)              |
| `webview-ui/src/hooks/useEditorActions.ts`    | `handleOpenClaude` → `handleOpenAgent` in declaration, return value, and interface (3 occurrences) |
| `webview-ui/src/App.tsx` line 228             | `onOpenClaude={editor.handleOpenClaude}` → `onOpenAgent={editor.handleOpenAgent}`                  |

**KPI**: `grep -r "openClaude\|handleOpenClaude\|onOpenClaude" webview-ui/src/` returns 0 results.

### Task 1.6: Update comment references

| File                  | Line ~210                                                   | Change                                                        |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `src/agentManager.ts` | `// Extract terminal index from name like "Claude Code #3"` | `// Extract terminal index from name like "Copilot Agent #3"` |

**KPI**: `grep -ri "claude" src/ webview-ui/src/ --include="*.ts" --include="*.tsx"` returns 0 results (excluding `scripts/` and `CLAUDE.md`).

### Task 1.7: Build verification

```
Steps:
1. Run `npm run build`
2. Verify no TypeScript errors
3. Verify no ESLint errors
```

**KPI**: Build succeeds with exit code 0. All tests pass (if any).

### Task 1.8: Commit Phase 1

```
Commit message: "feat(copilot): rename all Claude references to Copilot"
```

**KPI**: `git diff --stat` shows only rename/text changes, no logic changes.

---

## 4. Phase 2 — New Data Source Architecture

> **Goal**: Design and create the new modules that will replace JSONL file watching with Copilot Chat API integration. Create files but don't wire them yet.

### Task 2.1: Create `src/copilotTools.ts` — Tool Name Registry

This module maps Copilot tool names to display names and animation categories.

```typescript
// Create file: src/copilotTools.ts
// Content: See docs/TOOL-MAPPING.md for the complete mapping table
// Exports:
//   - formatCopilotToolStatus(toolName: string, input: Record<string, unknown>): string
//   - COPILOT_PERMISSION_EXEMPT_TOOLS: Set<string>
//   - mapCopilotToolToAnimationCategory(toolName: string): 'typing' | 'reading'
```

Requirements:

- Map every known Copilot built-in tool to a user-friendly status string
- Preserve the same animation categories (typing vs reading) as the Claude version
- Include MCP tools with a fallback pattern (`mcp_*` → "Using <toolName>")
- Export a set of permission-exempt tools (equivalent to `PERMISSION_EXEMPT_TOOLS`)

**KPI**: File exists, exports all 3 symbols, handles all tools from `docs/TOOL-MAPPING.md`.

### Task 2.2: Create `src/chatSessionTracker.ts` — Session Lifecycle Manager

This module replaces `agentManager.ts`'s terminal+JSONL lifecycle with Chat session tracking.

```typescript
// Create file: src/chatSessionTracker.ts
// Exports:
//   - class ChatSessionTracker
//     - constructor(context: vscode.ExtensionContext)
//     - startNewSession(): Promise<number>  // returns agentId
//     - removeSession(agentId: number): void
//     - restoreSessions(): void
//     - getSessionForAgent(agentId: number): SessionState | undefined
//     - dispose(): void
```

This module must:

1. Open a new Copilot Chat session when `+ Agent` is clicked
2. Track the session's status (active, waiting, completed)
3. Detect tool invocations and their completions
4. Detect sub-agent spawns
5. Persist sessions to `workspaceState` for restore on reload

**Strategy**: Use the VS Code command `workbench.action.chat.open` to open chat sessions, then monitor activity through available APIs. The exact integration mechanism depends on available APIs (see Architecture doc for decision tree).

**KPI**: File exists, class is instantiable, all methods defined (can be stubs initially).

### Task 2.3: Create `src/copilotEventParser.ts` — Event Interpreter

This replaces `transcriptParser.ts`. Instead of parsing JSONL lines, it interprets Copilot events.

```typescript
// Create file: src/copilotEventParser.ts
// Exports:
//   - processCopilotToolEvent(agentId, event, agents, timers, webview): void
//   - processCopilotStatusChange(agentId, status, agents, timers, webview): void
```

**KPI**: File exists, exports both functions, handles all status transitions.

### Task 2.4: Update `src/types.ts` — Remove JSONL-specific fields

Modify `AgentState` interface:

| Remove               | Replace with                                             |
| -------------------- | -------------------------------------------------------- |
| `projectDir: string` | (delete — no longer needed)                              |
| `jsonlFile: string`  | `chatSessionUri?: string` (optional URI to chat session) |
| `fileOffset: number` | (delete — no file reading)                               |
| `lineBuffer: string` | (delete — no line buffering)                             |

Modify `PersistedAgent` interface:

| Remove               | Replace with              |
| -------------------- | ------------------------- |
| `jsonlFile: string`  | `chatSessionUri?: string` |
| `projectDir: string` | (delete)                  |

**KPI**: No references to `jsonlFile`, `fileOffset`, `lineBuffer`, or `projectDir` in `types.ts`. Build still succeeds.

### Task 2.5: Build verification

```
Steps:
1. New files should have no type errors on their own
2. Existing files will have errors (references to removed fields) — that's expected
3. Run `npx tsc --noEmit` and document expected errors
```

**KPI**: New files (`copilotTools.ts`, `chatSessionTracker.ts`, `copilotEventParser.ts`) have 0 type errors individually.

### Task 2.6: Commit Phase 2

```
Commit message: "feat(copilot): create new data source modules (stubs)"
```

---

## 5. Phase 3 — Extension Backend: Agent Lifecycle

> **Goal**: Replace terminal-based agent creation with Chat session-based creation. Wire up the new modules.

### Task 3.1: Rewrite `launchNewTerminal()` → `launchNewAgentSession()`

In `src/agentManager.ts`:

**Remove**:

- `crypto.randomUUID()` session ID generation
- `terminal.sendText(\`claude --session-id ${sessionId}\`)`
- `path.join(os.homedir(), '.claude', 'projects', dirName)` project dir
- JSONL file pre-registration
- JSONL poll timer setup

**Replace with**:

```
1. Create a VS Code terminal (keep for user interaction / command execution)
   - Name: `Copilot Agent #N`
   - Do NOT send any CLI command
2. Register the agent in the agents Map
3. Notify webview: { type: 'agentCreated', id, folderName }
4. Begin session monitoring (via chatSessionTracker)
```

**KPI**:

- Function no longer references `claude`, `.jsonl`, `sessionId`
- `grep -r "claude --session" src/` returns 0 results
- `grep -r "\.jsonl" src/agentManager.ts` returns 0 results

### Task 3.2: Rewrite `getProjectDirPath()`

This function computed `~/.claude/projects/<hash>`. It's no longer needed.

**Action**: Remove the function entirely. Update all call sites:

- `PixelAgentsViewProvider.ts` lines that call `getProjectDirPath()`
- Replace with a no-op or remove the code block

**KPI**: `getProjectDirPath` not exported nor called anywhere.

### Task 3.3: Rewrite `removeAgent()`

Remove JSONL-specific cleanup:

- Remove `fs.unwatchFile(agent.jsonlFile)`
- Remove file watcher closing for JSONL
- Keep: timer cancellation, map cleanup, persist call

**KPI**: No `fs.unwatchFile` in agentManager.ts. No `jsonlFile` references.

### Task 3.4: Rewrite `restoreAgents()`

**Remove**:

- JSONL file existence check (`fs.existsSync(p.jsonlFile)`)
- File offset setting (`agent.fileOffset = stat.size`)
- `startFileWatching()` calls
- JSONL poll timer setup

**Replace with**:

- Match persisted agents to live terminals by name
- Restore agent state without file watching
- Start session monitoring for restored agents

**KPI**: No `startFileWatching`, `jsonlFile`, `fileOffset` references in `restoreAgents`.

### Task 3.5: Rewrite `persistAgents()` and `sendExistingAgents()`

Update to use new `AgentState` fields (no `jsonlFile`, `projectDir`).

**KPI**: These functions reference only the new fields from Task 2.4.

### Task 3.6: Update `PixelAgentsViewProvider.ts`

Major changes:

1. **Remove** all JSONL-related state:
   - `knownJsonlFiles: Set<string>` → delete
   - `projectScanTimer` → delete
   - `fileWatchers: Map` → delete (or repurpose)
   - `pollingTimers: Map` → delete

2. **Remove** `openSessionsFolder` message handler (no `~/.claude/` folder)

3. **Update** `webviewReady` handler:
   - Remove `ensureProjectScan()` call
   - Remove JSONL file watching setup
   - Add chat session tracker initialization

4. **Update** `dispose()`:
   - Remove file watcher cleanup
   - Add session tracker disposal

**KPI**:

- `grep "jsonl\|knownJsonl\|projectScan\|fileWatcher\|pollingTimer" src/PixelAgentsViewProvider.ts` returns 0 results
- No imports from `fileWatcher.ts`

### Task 3.7: Delete or gut `src/fileWatcher.ts`

This entire file is Claude-specific JSONL file watching.

**Action**: Delete the file entirely, OR keep it as an empty module with deprecation comment if other files still import from it (remove those imports first).

**KPI**: `src/fileWatcher.ts` either deleted or contains only a deprecation comment. No imports from it anywhere.

### Task 3.8: Build verification

```
Steps:
1. Run `npm run check-types`
2. Fix any remaining type errors
3. Run `npm run build`
```

**KPI**: Build succeeds. Zero TypeScript errors. Extension activates without crash.

### Task 3.9: Commit Phase 3

```
Commit message: "feat(copilot): replace terminal+JSONL lifecycle with chat session tracking"
```

---

## 6. Phase 4 — Extension Backend: Event Parsing

> **Goal**: Replace JSONL transcript parsing with Copilot event interpretation.

### Task 4.1: Implement `src/copilotTools.ts` (full implementation)

Complete the stub from Phase 2 with full tool mapping:

```typescript
export function formatCopilotToolStatus(
  toolName: string,
  input: Record<string, unknown>,
): string {
  // Map each Copilot tool to a human-readable status
  // See docs/TOOL-MAPPING.md for complete table
}
```

Must handle at minimum:

- `read_file` → "Reading <basename>"
- `replace_string_in_file` / `multi_replace_string_in_file` → "Editing <basename>"
- `create_file` → "Writing <basename>"
- `run_in_terminal` → "Running: <command truncated>"
- `grep_search` → "Searching code"
- `file_search` → "Searching files"
- `semantic_search` → "Searching codebase"
- `fetch_webpage` → "Fetching web content"
- `list_dir` → "Listing directory"
- `get_errors` → "Checking errors"
- `runSubagent` → "Subtask: <description>"
- `manage_todo_list` → "Managing tasks"
- Any unknown tool → "Using <toolName>"

**KPI**: Every tool from `docs/TOOL-MAPPING.md` returns a non-empty status string.

### Task 4.2: Implement `src/copilotEventParser.ts` (full implementation)

This replaces `processTranscriptLine()`. Must handle:

1. **Tool start** → send `agentToolStart` to webview
2. **Tool completion** → send `agentToolDone` to webview (with 300ms delay)
3. **Sub-agent start** → send `agentToolStart` with "Subtask:" prefix
4. **Sub-agent tool events** → forward as `subagentToolStart`/`subagentToolDone`
5. **Session complete** → clear all tools, send `agentStatus: waiting`
6. **Permission needed** → send `agentToolPermission`

**KPI**: All 6 event types produce correct webview messages.

### Task 4.3: Delete or gut `src/transcriptParser.ts`

This entire file parses Claude JSONL format. It must be removed.

**Action**: Delete `src/transcriptParser.ts`. All call sites now use `copilotEventParser.ts`.

**KPI**:

- File deleted
- `grep -r "transcriptParser\|processTranscriptLine" src/` returns 0 results

### Task 4.4: Update `src/timerManager.ts`

The timer logic itself is framework-agnostic (it's just setTimeout/clearTimeout). Keep it as-is, but verify:

- No imports from deleted files
- Permission timer constant still referenced from `src/constants.ts`
- All call sites updated to use new event parser

**KPI**: `timerManager.ts` has no imports from `fileWatcher.ts` or `transcriptParser.ts`.

### Task 4.5: Update `src/constants.ts`

Remove constants that are only used by JSONL watching:

| Constant                              | Action                                         |
| ------------------------------------- | ---------------------------------------------- |
| `JSONL_POLL_INTERVAL_MS`              | Remove (or rename if still polling something)  |
| `FILE_WATCHER_POLL_INTERVAL_MS`       | Remove                                         |
| `PROJECT_SCAN_INTERVAL_MS`            | Remove                                         |
| `BASH_COMMAND_DISPLAY_MAX_LENGTH`     | Keep (still used for terminal command display) |
| `TASK_DESCRIPTION_DISPLAY_MAX_LENGTH` | Keep (still used for subtask display)          |

**KPI**: No unused constant exports. `grep` for removed constants returns 0 results in `src/`.

### Task 4.6: Build verification

```
Steps:
1. Run `npm run build`
2. Verify zero errors
```

**KPI**: Build succeeds.

### Task 4.7: Commit Phase 4

```
Commit message: "feat(copilot): implement Copilot event parsing, remove JSONL parser"
```

---

## 7. Phase 5 — Extension Backend: Session Monitoring

> **Goal**: Implement the actual mechanism for detecting what a Copilot agent is doing. This is the most complex phase because it depends on available VS Code APIs.

### Task 5.1: Evaluate available APIs

Read and decide which integration strategy to use. The strategies are ranked by preference:

**Strategy A: `chatSessionsProvider` proposed API** (preferred if available)

- Check if the host VS Code version supports `vscode.proposed.chatSessionsProvider`
- Requires adding `enabledApiProposals` to `package.json`
- Provides: `ChatSessionItemController`, `ChatSessionStatus`, real-time session state

**Strategy B: Chat Participant + Language Model Tools API**

- Create a Chat Participant that the user invokes
- Monitor tool calls through the participant's request handler
- More stable API, but requires explicit user action (`@pixel-agents`)

**Strategy C: Terminal Activity Monitoring**

- Detect Copilot-created terminals via name patterns
- Monitor terminal output for activity signals
- Fallback approach, least granular

Decision algorithm:

```
IF vscode.proposed.chatSessionsProvider is available AND stable:
  USE Strategy A
ELSE IF vscode.chat.createChatParticipant is available:
  USE Strategy B
ELSE:
  USE Strategy C
```

**KPI**: Strategy decision documented in a `// Strategy:` comment at top of `chatSessionTracker.ts`.

### Task 5.2: Implement chosen strategy

#### If Strategy A (chatSessionsProvider):

```typescript
// In extension.ts activate():
const controller = vscode.chat.createChatSessionItemController(
  "pixel-agents",
  refreshHandler,
);

// refreshHandler polls for session state changes
// Map ChatSessionStatus to webview messages:
//   InProgress → agentStatus: 'active'
//   NeedsInput → agentToolPermission
//   Completed  → agentStatus: 'waiting'
//   Failed     → agentClosed
```

Add to `package.json`:

```json
"enabledApiProposals": ["chatSessionsProvider"]
```

#### If Strategy B (Chat Participant):

```typescript
// In extension.ts activate():
const participant = vscode.chat.createChatParticipant(
  "pixel-agents.agent",
  handler,
);

// handler intercepts requests, forwards to LM, monitors tool usage
// Tool calls detected via vscode.lm.tools
```

Add to `package.json`:

```json
"contributes": {
  "chatParticipants": [{
    "id": "pixel-agents.agent",
    "name": "pixel-agents",
    "fullName": "Pixel Agents",
    "description": "Copilot agent with pixel art visualization"
  }]
}
```

#### If Strategy C (Terminal Monitoring):

```typescript
// Monitor vscode.window.onDidChangeActiveTerminal
// Detect terminals with "Copilot" in name
// Use vscode.window.onDidWriteTerminalData (proposed) for output
// Infer activity from terminal output patterns
```

**KPI**:

- Session tracker creates and tracks at least one session
- Status changes are detected and forwarded to webview
- Tool invocations produce `agentToolStart` messages

### Task 5.3: Wire session tracker to PixelAgentsViewProvider

```
Steps:
1. Replace the openAgent handler to use chatSessionTracker.startNewSession()
2. Wire session status callbacks to webview postMessage
3. Wire tool events to webview postMessage
4. Ensure dispose() cleans up the tracker
```

**KPI**: Clicking "+ Agent" creates a new Copilot session and spawns a character.

### Task 5.4: Build verification

```
Steps:
1. Run `npm run build`
2. Test in Extension Development Host (F5)
3. Click "+ Agent" — verify character appears
```

**KPI**: Build succeeds. Character spawns on button click.

### Task 5.5: Commit Phase 5

```
Commit message: "feat(copilot): implement session monitoring with [Strategy A/B/C]"
```

---

## 8. Phase 6 — Webview Adaptation

> **Goal**: Update webview-side code to handle the new tool names and message patterns.

### Task 6.1: Update `webview-ui/src/office/toolUtils.ts`

Replace the `STATUS_TO_TOOL` mapping to reflect Copilot tool status strings:

```typescript
export const STATUS_TO_TOOL: Record<string, string> = {
  Reading: "Read",
  Searching: "Grep", // grep_search, file_search, semantic_search
  Fetching: "WebFetch", // fetch_webpage
  Writing: "Write", // create_file
  Editing: "Edit", // replace_string_in_file, multi_replace_string_in_file
  Running: "Bash", // run_in_terminal
  Listing: "Read", // list_dir
  Checking: "Read", // get_errors
  Managing: "Read", // manage_todo_list
  Subtask: "Task", // runSubagent
  Using: "Bash", // fallback for unknown tools
};
```

**KPI**: Every status string produced by `copilotTools.ts` has a matching entry in `STATUS_TO_TOOL`.

### Task 6.2: Verify webview message protocol

The webview message protocol (`useExtensionMessages.ts`) should NOT need changes because it uses generic message types (`agentToolStart`, `agentToolDone`, etc.) that are framework-agnostic. Verify:

| Message type               | Used by Claude? | Used by Copilot? | Changes needed? |
| -------------------------- | --------------- | ---------------- | --------------- |
| `agentCreated`             | ✅              | ✅               | None            |
| `agentClosed`              | ✅              | ✅               | None            |
| `agentToolStart`           | ✅              | ✅               | None            |
| `agentToolDone`            | ✅              | ✅               | None            |
| `agentToolsClear`          | ✅              | ✅               | None            |
| `agentStatus`              | ✅              | ✅               | None            |
| `agentToolPermission`      | ✅              | ✅               | None            |
| `agentToolPermissionClear` | ✅              | ✅               | None            |
| `subagentToolStart`        | ✅              | ✅               | None            |
| `subagentToolDone`         | ✅              | ✅               | None            |
| `subagentClear`            | ✅              | ✅               | None            |
| `existingAgents`           | ✅              | ✅               | None            |
| `agentSelected`            | ✅              | ✅               | None            |

**KPI**: `useExtensionMessages.ts` has zero changes (or minimal changes to types only).

### Task 6.3: Build webview

```
Steps:
1. cd webview-ui && npm run build
2. Verify no TypeScript errors
```

**KPI**: Webview builds with 0 errors.

### Task 6.4: Commit Phase 6

```
Commit message: "feat(copilot): update webview tool mapping for Copilot tools"
```

---

## 9. Phase 7 — Custom Agent Configuration

> **Goal**: Create `.agent.md` file and custom agent definitions for users who want specialized pixel agents.

### Task 7.1: Create `.github/agents/pixel-agent.agent.md`

```markdown
---
name: Pixel Agent
description: A coding agent tracked by Pixel Agents visualization
tools: ["read", "edit", "search", "run_in_terminal", "fetch", "agent"]
---

You are a coding agent. Complete tasks efficiently and methodically.
Your activity is visualized as an animated pixel art character in the Pixel Agents panel.
```

**KPI**: File exists, valid YAML frontmatter, VS Code recognizes it as a custom agent.

### Task 7.2: Create example orchestration agent (optional)

Create `.github/agents/pixel-team.agent.md` that demonstrates sub-agent usage:

```markdown
---
name: Pixel Team Lead
description: Orchestrates multiple Pixel Agents for complex tasks
tools: ["agent", "read", "search"]
agents: ["Pixel Agent"]
---

You coordinate development tasks by delegating to specialized Pixel Agent sub-agents.
Each sub-agent appears as a separate character in the pixel art office.
```

**KPI**: File exists, valid format.

### Task 7.3: Commit Phase 7

```
Commit message: "feat(copilot): add custom agent definitions"
```

---

## 10. Phase 8 — Documentation & Metadata

> **Goal**: Update all documentation to reflect the Copilot-based architecture.

### Task 8.1: Rewrite `README.md`

Changes:

- Title stays "Pixel Agents"
- Description: replace "Claude Code" with "GitHub Copilot"
- Requirements: replace "Claude Code CLI" with "GitHub Copilot subscription"
- Usage: replace "Claude Code terminal" with "Copilot chat session"
- "How It Works" section: replace JSONL explanation with Chat API explanation
- Known Limitations: update for Copilot-specific issues
- Roadmap: update for Copilot features

**KPI**: `grep -i "claude" README.md` returns 0 results.

### Task 8.2: Rewrite `CLAUDE.md` → `COPILOT.md`

Rename the file and update all content:

- Architecture description
- Core concepts vocabulary
- Agent status tracking mechanism
- File watching → Session monitoring
- JSONL format → Chat API events
- All code references

**KPI**:

- `CLAUDE.md` no longer exists (or is a redirect)
- `COPILOT.md` exists with updated content
- `grep -i "jsonl\|\.claude\|claude code" COPILOT.md` returns 0 results (except in historical context sections)

### Task 8.3: Update `CHANGELOG.md`

Add entry:

```markdown
## [2.0.0] - 2026-XX-XX

### Changed

- **Breaking**: Migrated from Claude Code to GitHub Copilot
- Agent sessions now use VS Code Chat API instead of JSONL file watching
- Tool tracking uses Copilot tool names instead of Claude tool names
- Sub-agent visualization uses Copilot's native sub-agent system

### Removed

- Claude Code CLI dependency
- JSONL transcript file monitoring
- `~/.claude/projects/` path handling
```

**KPI**: CHANGELOG.md has a 2.0.0 entry documenting the migration.

### Task 8.4: Commit Phase 8

```
Commit message: "docs: update all documentation for Copilot conversion"
```

---

## 11. Phase 9 — Build, Lint, Test

> **Goal**: Ensure everything builds, lints, and the extension loads correctly.

### Task 9.1: Full build

```
Steps:
1. rm -rf dist/ node_modules/ webview-ui/node_modules/
2. npm install
3. cd webview-ui && npm install && cd ..
4. npm run build
```

**KPI**: Build succeeds with exit code 0.

### Task 9.2: Type check

```
npm run check-types
```

**KPI**: 0 TypeScript errors.

### Task 9.3: Lint

```
npm run lint
```

**KPI**: 0 ESLint errors. Warnings acceptable but should be documented.

### Task 9.4: No dead code

Verify no orphaned imports or unused files:

```
Check each file in src/ is either:
  - Imported by another file, OR
  - Is an entry point (extension.ts)
```

**KPI**: No files in `src/` are unreferenced.

### Task 9.5: No Claude references in source code

```bash
grep -ri "claude" src/ webview-ui/src/ --include="*.ts" --include="*.tsx" --include="*.json"
```

**KPI**: 0 results (excluding `node_modules/`, `scripts/`, documentation files).

### Task 9.6: Commit Phase 9

```
Commit message: "chore: clean build, zero errors, no dead code"
```

---

## 12. Phase 10 — Integration Testing

> **Goal**: Verify the extension works end-to-end with GitHub Copilot.

### Task 10.1: Manual smoke test — Extension loads

```
Steps:
1. Press F5 to launch Extension Development Host
2. Open the Pixel Agents panel
3. Verify the office renders correctly
4. Verify the Layout editor works
```

**KPI**: Office renders, layout editor opens/closes, zoom controls work.

### Task 10.2: Manual smoke test — Agent creation

```
Steps:
1. Click "+ Agent"
2. Verify a character spawns with matrix effect
3. Verify a new session/terminal is created
```

**KPI**: Character appears in office. Session/terminal opens.

### Task 10.3: Manual smoke test — Activity tracking

```
Steps:
1. Create an agent
2. Give it a task in the Copilot chat
3. Observe character animation changes when tools are used
4. Verify character shows "typing" during file edits
5. Verify character shows "reading" during file reads
```

**KPI**: Character animation matches tool activity.

### Task 10.4: Manual smoke test — Status transitions

```
Steps:
1. Agent completes a task → character shows waiting bubble
2. Agent needs permission → character shows permission bubble
3. Sound notification plays (if enabled)
```

**KPI**: Bubbles appear at correct moments.

### Task 10.5: Manual smoke test — Sub-agents

```
Steps:
1. Give agent a complex task that spawns sub-agents
2. Verify sub-agent characters appear near parent
3. Verify sub-agent characters animate independently
4. Verify sub-agent characters despawn when task completes
```

**KPI**: Sub-agent lifecycle works correctly.

### Task 10.6: Manual smoke test — Persistence

```
Steps:
1. Create agents and arrange seats
2. Reload VS Code window (Ctrl+Shift+P → Reload Window)
3. Verify agents are restored with correct seats and palettes
```

**KPI**: Agents persist across reloads.

### Task 10.7: Final commit

```
Commit message: "feat(copilot): complete Claude → Copilot conversion"
```

---

## 13. Appendices

### A. Decision Log

Record all significant decisions made during conversion:

| #   | Decision                               | Rationale      | Date |
| --- | -------------------------------------- | -------------- | ---- |
| 1   | Strategy A/B/C for session monitoring  | [to be filled] |      |
| 2   | Keep/remove fileWatcher.ts             | [to be filled] |      |
| 3   | Chat Participant vs passive monitoring | [to be filled] |      |

### B. Risk Register

| Risk                                                   | Impact                                      | Mitigation                                                                         |
| ------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `chatSessionsProvider` API is proposed and unstable    | High — may break on VS Code updates         | Implement fallback strategy, pin minimum VS Code version                           |
| No public API for observing Copilot tool calls         | High — core feature depends on this         | Strategy B (Chat Participant) gives full control; Strategy C as fallback           |
| Tool name mapping is incomplete                        | Medium — some tools won't animate correctly | Use "Using <name>" fallback, add tools as discovered                               |
| Sub-agent detection differs between Claude and Copilot | Medium — sub-agent characters may not spawn | Copilot's `runSubagent` is well-documented; map it to existing `subagentToolStart` |

### C. Files Not Modified

These files require **zero changes** during conversion:

```
webview-ui/src/office/colorize.ts
webview-ui/src/office/floorTiles.ts
webview-ui/src/office/wallTiles.ts
webview-ui/src/office/types.ts
webview-ui/src/office/sprites/*
webview-ui/src/office/editor/*
webview-ui/src/office/engine/*
webview-ui/src/office/layout/*
webview-ui/src/office/components/OfficeCanvas.tsx
webview-ui/src/office/components/ToolOverlay.tsx
webview-ui/src/components/ZoomControls.tsx
webview-ui/src/components/DebugView.tsx
webview-ui/src/components/SettingsModal.tsx
webview-ui/src/components/AgentLabels.tsx
webview-ui/src/notificationSound.ts
webview-ui/src/constants.ts
webview-ui/src/index.css
webview-ui/src/main.tsx
webview-ui/src/vscodeApi.ts
src/assetLoader.ts
src/layoutPersistence.ts
scripts/*
```
