# File-by-File Change Manifest

> **Purpose**: Exact per-file changes with old/new code for every modification in the Copilot conversion. Cross-reference with [CONVERSION-PLAN.md](CONVERSION-PLAN.md) phase numbers.

---

## Legend

| Action      | Meaning                                             |
| ----------- | --------------------------------------------------- |
| **KEEP**    | No changes needed                                   |
| **MODIFY**  | Edit specific sections                              |
| **REWRITE** | Most of the file changes, preserving some structure |
| **CREATE**  | New file                                            |
| **DELETE**  | Remove entirely                                     |

---

## Extension Backend: `src/`

---

### `src/constants.ts` — MODIFY (Phase 1 + Phase 4)

**Line 2-4** — Remove JSONL-specific timing constants:

```typescript
// OLD:
export const JSONL_POLL_INTERVAL_MS = 1000;
export const FILE_WATCHER_POLL_INTERVAL_MS = 1000;
export const PROJECT_SCAN_INTERVAL_MS = 1000;

// NEW:
// (delete these 3 lines entirely)
```

**Line 42** — Rename terminal prefix:

```typescript
// OLD:
export const TERMINAL_NAME_PREFIX = "Claude Code";

// NEW:
export const TERMINAL_NAME_PREFIX = "Copilot Agent";
```

**Lines to KEEP** (unchanged):

- `TOOL_DONE_DELAY_MS = 300`
- `PERMISSION_TIMER_DELAY_MS = 7000`
- `TEXT_IDLE_DELAY_MS = 5000`
- `BASH_COMMAND_DISPLAY_MAX_LENGTH = 30`
- `TASK_DESCRIPTION_DISPLAY_MAX_LENGTH = 40`
- All PNG/asset constants
- All layout persistence constants
- All VS Code identifiers (VIEW*ID, COMMAND*_, WORKSPACE*KEY*_, GLOBAL*KEY*\*)

---

### `src/types.ts` — MODIFY (Phase 2)

**Full file replacement:**

```typescript
// OLD:
import type * as vscode from "vscode";

export interface AgentState {
  id: number;
  terminalRef: vscode.Terminal;
  projectDir: string; // ← DELETE
  jsonlFile: string; // ← DELETE
  fileOffset: number; // ← DELETE
  lineBuffer: string; // ← DELETE
  activeToolIds: Set<string>;
  activeToolStatuses: Map<string, string>;
  activeToolNames: Map<string, string>;
  activeSubagentToolIds: Map<string, Set<string>>;
  activeSubagentToolNames: Map<string, Map<string, string>>;
  isWaiting: boolean;
  permissionSent: boolean;
  hadToolsInTurn: boolean;
  folderName?: string;
}

export interface PersistedAgent {
  id: number;
  terminalName: string;
  jsonlFile: string; // ← DELETE
  projectDir: string; // ← DELETE
  folderName?: string;
}

// NEW:
import type * as vscode from "vscode";

export interface AgentState {
  id: number;
  terminalRef: vscode.Terminal;
  chatSessionUri?: string; // ← NEW: optional Chat session reference
  activeToolIds: Set<string>;
  activeToolStatuses: Map<string, string>;
  activeToolNames: Map<string, string>;
  activeSubagentToolIds: Map<string, Set<string>>;
  activeSubagentToolNames: Map<string, Map<string, string>>;
  isWaiting: boolean;
  permissionSent: boolean;
  hadToolsInTurn: boolean;
  folderName?: string;
}

export interface PersistedAgent {
  id: number;
  terminalName: string;
  chatSessionUri?: string; // ← NEW
  folderName?: string;
}
```

---

### `src/extension.ts` — MODIFY (Phase 5)

**Current** (32 lines, unchanged in Phase 1):

```typescript
// Keep as-is for Phase 1-4. In Phase 5, add Chat Participant registration:

// After line 12 (registerWebviewViewProvider):
// If Strategy B:
//   const participant = vscode.chat.createChatParticipant('pixel-agents.agent', handler);
//   context.subscriptions.push(participant);
```

The exact changes depend on the chosen integration strategy (see ARCHITECTURE.md Section 5).

---

### `src/agentManager.ts` — REWRITE (Phase 3)

**337 lines → estimated ~150 lines after rewrite**

#### Imports — Replace:

```typescript
// OLD:
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";
import type { AgentState, PersistedAgent } from "./types.js";
import { cancelWaitingTimer, cancelPermissionTimer } from "./timerManager.js";
import {
  startFileWatching,
  readNewLines,
  ensureProjectScan,
} from "./fileWatcher.js";
import {
  JSONL_POLL_INTERVAL_MS,
  TERMINAL_NAME_PREFIX,
  WORKSPACE_KEY_AGENTS,
  WORKSPACE_KEY_AGENT_SEATS,
} from "./constants.js";
import { migrateAndLoadLayout } from "./layoutPersistence.js";

// NEW:
import * as path from "path";
import * as vscode from "vscode";
import type { AgentState, PersistedAgent } from "./types.js";
import { cancelWaitingTimer, cancelPermissionTimer } from "./timerManager.js";
import {
  TERMINAL_NAME_PREFIX,
  WORKSPACE_KEY_AGENTS,
  WORKSPACE_KEY_AGENT_SEATS,
} from "./constants.js";
import { migrateAndLoadLayout } from "./layoutPersistence.js";
```

#### `getProjectDirPath()` — DELETE entirely (lines 11-18):

```typescript
// DELETE this function:
export function getProjectDirPath(cwd?: string): string | null { ... }
```

#### `launchNewTerminal()` — REWRITE:

Remove parameters:

- `knownJsonlFiles: Set<string>` — delete
- `fileWatchers: Map<number, fs.FSWatcher>` — delete
- `pollingTimers: Map<number, ReturnType<typeof setInterval>>` — delete
- `jsonlPollTimers: Map<number, ReturnType<typeof setInterval>>` — delete
- `projectScanTimerRef` — delete

Remove from function body:

- `const sessionId = crypto.randomUUID()` — delete
- `terminal.sendText(\`claude --session-id ${sessionId}\`)` — delete
- `const projectDir = getProjectDirPath(cwd)` — delete
- `const expectedFile = path.join(projectDir, ...)` — delete
- `knownJsonlFiles.add(expectedFile)` — delete
- `ensureProjectScan(...)` — delete
- Entire `setInterval` poll block — delete

Keep/adapt from function body:

- Terminal creation with `TERMINAL_NAME_PREFIX`
- Agent state construction (without `projectDir`, `jsonlFile`, `fileOffset`, `lineBuffer`)
- `agents.set(id, agent)` + `persistAgents()` + `webview.postMessage(agentCreated)`

#### `removeAgent()` — SIMPLIFY:

Remove parameters:

- `fileWatchers: Map<number, fs.FSWatcher>` — delete
- `pollingTimers: Map<number, ReturnType<typeof setInterval>>` — delete
- `jsonlPollTimers: Map<number, ReturnType<typeof setInterval>>` — delete

Remove from function body:

- `jsonlPollTimers.get(agentId)` cleanup — delete
- `fileWatchers.get(agentId)?.close()` — delete
- `pollingTimers` cleanup — delete
- `fs.unwatchFile(agent.jsonlFile)` — delete

Keep:

- `cancelWaitingTimer` + `cancelPermissionTimer`
- `agents.delete(agentId)` + `persistAgents()`

#### `persistAgents()` — SIMPLIFY:

Remove from persisted object:

- `jsonlFile: agent.jsonlFile` — delete
- `projectDir: agent.projectDir` — delete

Add:

- `chatSessionUri: agent.chatSessionUri` — add

#### `restoreAgents()` — REWRITE:

Remove parameters:

- `knownJsonlFiles` — delete
- `fileWatchers` — delete
- `pollingTimers` — delete
- `jsonlPollTimers` — delete
- `projectScanTimerRef` — delete

Remove from function body:

- All `fs.existsSync(p.jsonlFile)` checks — delete
- All `startFileWatching(...)` calls — delete
- All `agent.fileOffset = stat.size` — delete
- JSONL poll timers for missing files — delete
- `knownJsonlFiles.add(...)` — delete
- `ensureProjectScan(...)` — delete
- `restoredProjectDir` tracking — delete

Keep:

- Terminal name matching: `liveTerminals.find(t => t.name === p.terminalName)`
- Counter advancement: `maxId`, `maxIdx`
- Re-persist call

Update comment at line ~210:

```typescript
// OLD: 'Extract terminal index from name like "Claude Code #3"'
// NEW: 'Extract terminal index from name like "Copilot Agent #3"'
```

Agent state construction:

```typescript
// OLD:
const agent: AgentState = {
	id: p.id, terminalRef: terminal,
	projectDir: p.projectDir, jsonlFile: p.jsonlFile,
	fileOffset: 0, lineBuffer: '',
	activeToolIds: new Set(), ...
};

// NEW:
const agent: AgentState = {
	id: p.id, terminalRef: terminal,
	chatSessionUri: p.chatSessionUri,
	activeToolIds: new Set(), ...
};
```

#### `sendExistingAgents()` — KEEP as-is

#### `sendCurrentAgentStatuses()` — KEEP as-is

#### `sendLayout()` — KEEP as-is

---

### `src/fileWatcher.ts` — DELETE (Phase 3)

**263 lines → 0 lines**

Entire file removed. Exports that need to be removed from import sites:

- `startFileWatching` — imported in `agentManager.ts` and `PixelAgentsViewProvider.ts`
- `readNewLines` — imported in `agentManager.ts`
- `ensureProjectScan` — imported in `agentManager.ts` and `PixelAgentsViewProvider.ts`

---

### `src/transcriptParser.ts` — DELETE (Phase 4)

**300 lines → 0 lines**

Entire file removed. Exports that need to be removed from import sites:

- `processTranscriptLine` — imported in `fileWatcher.ts` (which is also deleted)
- `formatToolStatus` — imported only internally
- `PERMISSION_EXEMPT_TOOLS` — imported only in `fileWatcher.ts`

---

### `src/PixelAgentsViewProvider.ts` — REWRITE (Phase 3 + Phase 5)

**355 lines → estimated ~250 lines**

#### Imports — Replace:

```typescript
// OLD:
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { AgentState } from './types.js';
import {
	launchNewTerminal, removeAgent, restoreAgents, persistAgents,
	sendExistingAgents, sendLayout, getProjectDirPath,
} from './agentManager.js';
import { ensureProjectScan } from './fileWatcher.js';
import { loadFurnitureAssets, sendAssetsToWebview, ... } from './assetLoader.js';
import { WORKSPACE_KEY_AGENT_SEATS, GLOBAL_KEY_SOUND_ENABLED } from './constants.js';
import { writeLayoutToFile, readLayoutFromFile, watchLayoutFile } from './layoutPersistence.js';
import type { LayoutWatcher } from './layoutPersistence.js';

// NEW:
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { AgentState } from './types.js';
import {
	launchNewTerminal, removeAgent, restoreAgents, persistAgents,
	sendExistingAgents, sendLayout,
} from './agentManager.js';
// REMOVED: import { ensureProjectScan } from './fileWatcher.js';
// REMOVED: import { getProjectDirPath } from './agentManager.js';
import { loadFurnitureAssets, sendAssetsToWebview, ... } from './assetLoader.js';
import { WORKSPACE_KEY_AGENT_SEATS, GLOBAL_KEY_SOUND_ENABLED } from './constants.js';
import { writeLayoutToFile, readLayoutFromFile, watchLayoutFile } from './layoutPersistence.js';
import type { LayoutWatcher } from './layoutPersistence.js';
```

#### Class fields — Remove:

```typescript
// DELETE these fields:
fileWatchers = new Map<number, fs.FSWatcher>();
pollingTimers = new Map<number, ReturnType<typeof setInterval>>();
jsonlPollTimers = new Map<number, ReturnType<typeof setInterval>>();

activeAgentId = { current: null as number | null };
knownJsonlFiles = new Set<string>();
projectScanTimer = { current: null as ReturnType<typeof setInterval> | null };

// KEEP these fields:
nextAgentId = { current: 1 };
nextTerminalIndex = { current: 1 };
agents = new Map<number, AgentState>();
webviewView: vscode.WebviewView | undefined;
waitingTimers = new Map<number, ReturnType<typeof setTimeout>>();
permissionTimers = new Map<number, ReturnType<typeof setTimeout>>();
defaultLayout: Record<string, unknown> | null = null;
layoutWatcher: LayoutWatcher | null = null;

// ADD:
// chatSessionTracker: ChatSessionTracker | null = null;
// activeAgentId = { current: null as number | null };  // keep this one, just remove its JSONL associations
```

#### Message handler at line 65 — Rename:

```typescript
// OLD:
if (message.type === 'openClaude') {

// NEW:
if (message.type === 'openAgent') {
```

#### `launchNewTerminal` call — Simplify parameters:

```typescript
// OLD:
await launchNewTerminal(
  this.nextAgentId,
  this.nextTerminalIndex,
  this.agents,
  this.activeAgentId,
  this.knownJsonlFiles,
  this.fileWatchers,
  this.pollingTimers,
  this.waitingTimers,
  this.permissionTimers,
  this.jsonlPollTimers,
  this.projectScanTimer,
  this.webview,
  this.persistAgents,
  message.folderPath as string | undefined,
);

// NEW:
await launchNewTerminal(
  this.nextAgentId,
  this.nextTerminalIndex,
  this.agents,
  this.activeAgentId,
  this.waitingTimers,
  this.permissionTimers,
  this.webview,
  this.persistAgents,
  message.folderPath as string | undefined,
);
```

#### `restoreAgents` call — Simplify parameters:

```typescript
// OLD:
restoreAgents(
  this.context,
  this.nextAgentId,
  this.nextTerminalIndex,
  this.agents,
  this.knownJsonlFiles,
  this.fileWatchers,
  this.pollingTimers,
  this.waitingTimers,
  this.permissionTimers,
  this.jsonlPollTimers,
  this.projectScanTimer,
  this.activeAgentId,
  this.webview,
  this.persistAgents,
);

// NEW:
restoreAgents(
  this.context,
  this.nextAgentId,
  this.nextTerminalIndex,
  this.agents,
  this.waitingTimers,
  this.permissionTimers,
  this.activeAgentId,
  this.webview,
  this.persistAgents,
);
```

#### `webviewReady` handler — Remove `ensureProjectScan` and `getProjectDirPath`:

```typescript
// DELETE these blocks:
const projectDir = getProjectDirPath();
if (projectDir) {
	ensureProjectScan(...);
}

// The asset loading block should continue to work — just remove the
// `if (projectDir)` condition. Always load assets regardless.
```

#### `openSessionsFolder` handler (line ~252) — DELETE:

```typescript
// DELETE this entire handler:
} else if (message.type === 'openSessionsFolder') {
	const projectDir = getProjectDirPath();
	if (projectDir && fs.existsSync(projectDir)) {
		vscode.env.openExternal(vscode.Uri.file(projectDir));
	}
}
```

#### `removeAgent` call in `onDidCloseTerminal` — Simplify:

```typescript
// OLD:
removeAgent(
  id,
  this.agents,
  this.fileWatchers,
  this.pollingTimers,
  this.waitingTimers,
  this.permissionTimers,
  this.jsonlPollTimers,
  this.persistAgents,
);

// NEW:
removeAgent(
  id,
  this.agents,
  this.waitingTimers,
  this.permissionTimers,
  this.persistAgents,
);
```

#### `dispose()` — Simplify:

```typescript
// OLD:
dispose() {
	this.layoutWatcher?.dispose();
	this.layoutWatcher = null;
	for (const id of [...this.agents.keys()]) {
		removeAgent(
			id, this.agents,
			this.fileWatchers, this.pollingTimers, this.waitingTimers, this.permissionTimers,
			this.jsonlPollTimers, this.persistAgents,
		);
	}
	if (this.projectScanTimer.current) {
		clearInterval(this.projectScanTimer.current);
		this.projectScanTimer.current = null;
	}
}

// NEW:
dispose() {
	this.layoutWatcher?.dispose();
	this.layoutWatcher = null;
	// this.chatSessionTracker?.dispose();
	for (const id of [...this.agents.keys()]) {
		removeAgent(
			id, this.agents,
			this.waitingTimers, this.permissionTimers,
			this.persistAgents,
		);
	}
}
```

---

### `src/timerManager.ts` — KEEP (no changes)

**123 lines — untouched**

All imports are from `types.ts` (which is updated but compatible) and `vscode`. No references to JSONL, Claude, or file watching.

---

### `src/assetLoader.ts` — KEEP (no changes)

No Claude-specific code.

---

### `src/layoutPersistence.ts` — KEEP (no changes)

No Claude-specific code.

---

### `src/copilotTools.ts` — CREATE (Phase 2 + Phase 4)

**New file, ~120 lines**

See [TOOL-MAPPING.md](TOOL-MAPPING.md) Section 7 for full implementation.

---

### `src/copilotEventParser.ts` — CREATE (Phase 2 + Phase 4)

**New file, ~100 lines**

Core function signature:

```typescript
export function processCopilotToolEvent(
  agentId: number,
  event: {
    type: "start" | "done";
    toolName: string;
    toolId: string;
    input?: Record<string, unknown>;
  },
  agents: Map<number, AgentState>,
  waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
  permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
  webview: vscode.Webview | undefined,
): void;

export function processCopilotStatusChange(
  agentId: number,
  status: "active" | "waiting" | "permission",
  agents: Map<number, AgentState>,
  waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
  permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
  webview: vscode.Webview | undefined,
): void;
```

---

### `src/chatSessionTracker.ts` — CREATE (Phase 2 + Phase 5)

**New file, ~200 lines (estimated)**

See [ARCHITECTURE.md](ARCHITECTURE.md) for strategy-dependent implementation.

---

## Webview: `webview-ui/src/`

---

### `webview-ui/src/office/toolUtils.ts` — MODIFY (Phase 6)

**Line 1-12** — Update `STATUS_TO_TOOL`:

```typescript
// OLD:
export const STATUS_TO_TOOL: Record<string, string> = {
  Reading: "Read",
  Searching: "Grep",
  Globbing: "Glob",
  Fetching: "WebFetch",
  "Searching web": "WebSearch",
  Writing: "Write",
  Editing: "Edit",
  Running: "Bash",
  Task: "Task",
};

// NEW:
export const STATUS_TO_TOOL: Record<string, string> = {
  Reading: "Read",
  Searching: "Grep",
  Finding: "Grep",
  Listing: "Read",
  Fetching: "WebFetch",
  Writing: "Write",
  Editing: "Edit",
  Running: "Bash",
  Subtask: "Task",
  Checking: "Read",
  Managing: "Read",
  Loading: "Read",
  Rendering: "Write",
  Waiting: "Read",
  GitHub: "Read",
  Pylance: "Read",
  "VS Code": "Read",
  Using: "Bash",
};
```

---

### `webview-ui/src/hooks/useEditorActions.ts` — MODIFY (Phase 1)

**Line 22** — Rename in interface:

```typescript
// OLD: handleOpenClaude: () => void;
// NEW: handleOpenAgent: () => void;
```

**Line 81-82** — Rename callback:

```typescript
// OLD:
const handleOpenClaude = useCallback(() => {
  vscode.postMessage({ type: "openClaude" });
}, []);

// NEW:
const handleOpenAgent = useCallback(() => {
  vscode.postMessage({ type: "openAgent" });
}, []);
```

**Line ~506** — Rename in return:

```typescript
// OLD: handleOpenClaude,
// NEW: handleOpenAgent,
```

---

### `webview-ui/src/components/BottomToolbar.tsx` — MODIFY (Phase 1)

**Line 8** — Rename prop:

```typescript
// OLD: onOpenClaude: () => void;
// NEW: onOpenAgent: () => void;
```

**Line 49** — Rename destructure:

```typescript
// OLD: onOpenClaude,
// NEW: onOpenAgent,
```

**Line 79** — Rename call:

```typescript
// OLD: onOpenClaude()
// NEW: onOpenAgent()
```

**Line 85** — Rename message type:

```typescript
// OLD: vscode.postMessage({ type: 'openClaude', folderPath: folder.path })
// NEW: vscode.postMessage({ type: 'openAgent', folderPath: folder.path })
```

---

### `webview-ui/src/App.tsx` — MODIFY (Phase 1)

**Line 228** — Rename prop:

```typescript
// OLD: onOpenClaude={editor.handleOpenClaude}
// NEW: onOpenAgent={editor.handleOpenAgent}
```

---

### `webview-ui/src/hooks/useExtensionMessages.ts` — KEEP (no changes)

**365 lines — untouched**

The message handler uses generic types (`agentToolStart`, `agentToolDone`, etc.) that are framework-agnostic. No Claude-specific code.

---

### All other `webview-ui/src/` files — KEEP (no changes)

These files have zero Claude-specific code:

- `constants.ts`, `index.css`, `main.tsx`, `vscodeApi.ts`, `notificationSound.ts`
- `components/`: `AgentLabels.tsx`, `DebugView.tsx`, `SettingsModal.tsx`, `ZoomControls.tsx`
- `office/`: `colorize.ts`, `floorTiles.ts`, `wallTiles.ts`, `types.ts`
- `office/sprites/`: `spriteCache.ts`, `spriteData.ts`, `index.ts`
- `office/editor/`: `editorActions.ts`, `editorState.ts`, `EditorToolbar.tsx`, `index.ts`
- `office/engine/`: `characters.ts`, `gameLoop.ts`, `matrixEffect.ts`, `officeState.ts`, `renderer.ts`, `index.ts`
- `office/layout/`: `furnitureCatalog.ts`, `layoutSerializer.ts`, `tileMap.ts`, `index.ts`
- `office/components/`: `OfficeCanvas.tsx`, `ToolOverlay.tsx`, `index.ts`

---

## Root Files

---

### `package.json` — MODIFY (Phase 1 + Phase 5 + Phase 8)

**Phase 1:**

```json
// OLD line ~4:
"description": "Pixel art office where your Claude Code agents come to life as animated characters"
// NEW:
"description": "Pixel art office where your GitHub Copilot agents come to life as animated characters"

// OLD devDependencies:
"@anthropic-ai/sdk": "^0.74.0",
// NEW: (delete this line)
```

**Phase 5 (if Strategy B):**

```json
// ADD to "contributes":
"chatParticipants": [{
	"id": "pixel-agents.agent",
	"name": "pixel-agents",
	"fullName": "Pixel Agents",
	"description": "Copilot agent with pixel art visualization"
}]
```

**Phase 5 (if Strategy A):**

```json
// ADD:
"enabledApiProposals": ["chatSessionsProvider"]
```

---

### `README.md` — REWRITE (Phase 8)

Replace all "Claude Code" → "GitHub Copilot" throughout. See CONVERSION-PLAN.md Task 8.1.

---

### `CLAUDE.md` — RENAME + REWRITE (Phase 8)

Rename to `COPILOT.md`. See CONVERSION-PLAN.md Task 8.2.

---

### `CHANGELOG.md` — MODIFY (Phase 8)

Add 2.0.0 entry. See CONVERSION-PLAN.md Task 8.3.

---

## Summary Statistics

| Action    | Files   | Lines removed (approx) | Lines added (approx) |
| --------- | ------- | ---------------------- | -------------------- |
| DELETE    | 2       | ~563                   | 0                    |
| CREATE    | 3       | 0                      | ~420                 |
| REWRITE   | 2       | ~500                   | ~300                 |
| MODIFY    | 7       | ~30                    | ~40                  |
| KEEP      | ~35     | 0                      | 0                    |
| **Total** | **~49** | **~1,093**             | **~760**             |

Net change: approximately **-333 lines** (simpler architecture, no file watching complexity).
