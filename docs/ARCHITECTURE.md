# Architecture: Claude Code vs GitHub Copilot

> **Purpose**: Visual comparison of current (Claude) and target (Copilot) data flow architectures. Used alongside `CONVERSION-PLAN.md`.

---

## 1. Current Architecture (Claude Code)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         VS Code Extension Host                          │
│                                                                          │
│  ┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐  │
│  │  extension.ts    │────▶│ PixelAgentsView  │────▶│   Webview (React)│  │
│  │  (entry point)   │     │  Provider.ts     │     │   OfficeCanvas   │  │
│  └─────────────────┘     └──────┬───────────┘     └──────────────────┘  │
│                                  │                          ▲            │
│                                  │ postMessage              │ postMessage│
│  ┌─────────────────┐            │                          │            │
│  │ agentManager.ts  │◀──────────┘                          │            │
│  │                   │                                      │            │
│  │  • launchTerminal │──┐                                  │            │
│  │  • removeAgent    │  │                                  │            │
│  │  • restoreAgents  │  │                                  │            │
│  │  • persistAgents  │  │                                  │            │
│  └──────────────────┘  │                                  │            │
│                          ▼                                  │            │
│  ┌─────────────────────────┐     ┌──────────────────────┐  │            │
│  │   VS Code Terminal      │     │  fileWatcher.ts       │  │            │
│  │   "Claude Code #1"      │     │                       │  │            │
│  │                          │     │  • fs.watch            │  │            │
│  │   $ claude --session-id  │     │  • 2s polling backup   │──┘            │
│  │     <uuid>              │     │  • readNewLines()      │              │
│  └─────────┬───────────────┘     │  • projectScan()       │              │
│             │                     └──────────┬────────────┘              │
│             │ writes to disk                  │ reads from disk           │
│             ▼                                 │                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  ~/.claude/projects/<project-hash>/<session-id>.jsonl            │    │
│  │                                                                    │    │
│  │  {"type":"assistant","message":{"content":[{"type":"tool_use",...}]}} │ │
│  │  {"type":"user","message":{"content":[{"type":"tool_result",...}]}}   │ │
│  │  {"type":"system","subtype":"turn_duration",...}                      │ │
│  │  {"type":"progress","data":{"type":"agent_progress",...}}             │ │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────┐     ┌──────────────────────┐                   │
│  │ transcriptParser.ts  │     │   timerManager.ts     │                   │
│  │                       │     │                       │                   │
│  │ • Parse JSONL lines   │     │ • Permission timers   │                   │
│  │ • Extract tool_use    │────▶│ • Waiting timers      │                   │
│  │ • Extract tool_result │     │ • Text-idle timer     │                   │
│  │ • Detect turn_duration│     └───────────────────────┘                   │
│  │ • Process progress    │                                                │
│  └───────────────────────┘                                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Claude)

```
1. User clicks "+ Agent"
2. agentManager creates VS Code terminal
3. Terminal runs `claude --session-id <uuid>`
4. Claude CLI writes JSONL to ~/.claude/projects/<hash>/<uuid>.jsonl
5. fileWatcher detects new lines via fs.watch + polling
6. transcriptParser parses JSONL: extracts tool_use, tool_result, turn_duration
7. Parser calls timerManager for permission/waiting detection
8. Extension sends agentToolStart/Done/Status to webview
9. Webview animates character based on tool activity
```

---

## 2. Target Architecture (GitHub Copilot)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         VS Code Extension Host                          │
│                                                                          │
│  ┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐  │
│  │  extension.ts    │────▶│ PixelAgentsView  │────▶│   Webview (React)│  │
│  │  (entry point)   │     │  Provider.ts     │     │   OfficeCanvas   │  │
│  │                   │     └──────┬───────────┘     └──────────────────┘  │
│  │  + Register Chat │            │                          ▲            │
│  │    Participant    │            │ postMessage              │ postMessage│
│  │  + Register Tools │           │                          │            │
│  └─────────────────┘            │                          │            │
│                                  ▼                          │            │
│  ┌──────────────────────────────────────────────────────────┤            │
│  │            chatSessionTracker.ts                         │            │
│  │                                                          │            │
│  │  • startNewSession()      ───▶ Opens Copilot Chat        │            │
│  │  • trackToolInvocation()  ───▶ agentToolStart            │            │
│  │  • trackToolCompletion()  ───▶ agentToolDone             │            │
│  │  • trackSubagent()        ───▶ subagentToolStart         │            │
│  │  • detectIdle()           ───▶ agentStatus: waiting      │            │
│  │  • detectPermission()     ───▶ agentToolPermission       │            │
│  │  • removeSession()        ───▶ agentClosed               │            │
│  │  • restoreSessions()      ───▶ existingAgents            │            │
│  │                                                          │            │
│  └──────────┬───────────────────────────────────────────────┘            │
│              │ uses                                                       │
│              ▼                                                            │
│  ┌────────────────────────┐   ┌────────────────────────────────────┐    │
│  │ copilotEventParser.ts   │   │          VS Code Chat API          │    │
│  │                          │   │                                    │    │
│  │ • Process tool events    │   │  ┌────────────────────────────┐   │    │
│  │ • Map tool names         │◀──│  │  Chat Participant           │   │    │
│  │ • Format status strings  │   │  │  (Strategy B)               │   │    │
│  │ • Detect sub-agents      │   │  │  @pixel-agents              │   │    │
│  └────────────┬─────────────┘   │  └────────────────────────────┘   │    │
│                │                  │                                    │    │
│                ▼                  │  ┌────────────────────────────┐   │    │
│  ┌────────────────────────┐     │  │  chatSessionsProvider       │   │    │
│  │   copilotTools.ts       │     │  │  (Strategy A — proposed)    │   │    │
│  │                          │     │  │  Session status callbacks   │   │    │
│  │  • Tool name registry    │     │  └────────────────────────────┘   │    │
│  │  • formatCopilotToolStat │     │                                    │    │
│  │  • Animation categories  │     │  ┌────────────────────────────┐   │    │
│  │  • Permission-exempt set │     │  │  Language Model Tools API   │   │    │
│  └──────────────────────────┘     │  │  Tool invocation monitoring │   │    │
│                                    │  └────────────────────────────┘   │    │
│  ┌─────────────────────┐         └────────────────────────────────────┘    │
│  │   timerManager.ts    │                                                  │
│  │ (unchanged)          │   NO FILE WATCHING. NO JSONL. NO ~/.claude/     │
│  └──────────────────────┘                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Copilot)

```
1. User clicks "+ Agent"
2. chatSessionTracker opens a Copilot Chat session (or creates terminal for Strategy C)
3. Copilot processes user request, invokes tools
4. Tool invocations detected via Chat API events OR participant handler
5. copilotEventParser interprets events, maps tool names via copilotTools.ts
6. Timer logic (unchanged) handles permission/waiting detection
7. Extension sends agentToolStart/Done/Status to webview (SAME protocol)
8. Webview animates character based on tool activity (UNCHANGED)
```

---

## 3. Module Dependency Comparison

### Before (Claude)

```
extension.ts
  ├── PixelAgentsViewProvider.ts
  │     ├── agentManager.ts
  │     │     └── types.ts, constants.ts
  │     ├── fileWatcher.ts          ← REMOVE
  │     │     └── transcriptParser.ts  ← REMOVE
  │     │           └── timerManager.ts
  │     ├── assetLoader.ts          (unchanged)
  │     └── layoutPersistence.ts    (unchanged)
  └── constants.ts
```

### After (Copilot)

```
extension.ts
  ├── PixelAgentsViewProvider.ts
  │     ├── chatSessionTracker.ts   ← NEW (replaces agentManager + fileWatcher)
  │     │     ├── copilotEventParser.ts  ← NEW (replaces transcriptParser)
  │     │     │     └── copilotTools.ts  ← NEW (tool registry)
  │     │     └── timerManager.ts   (unchanged)
  │     ├── assetLoader.ts          (unchanged)
  │     └── layoutPersistence.ts    (unchanged)
  └── constants.ts
```

---

## 4. Message Protocol (Extension ↔ Webview)

**This does NOT change.** The webview protocol is framework-agnostic:

```
Extension → Webview:
  agentCreated    { id, folderName }
  agentClosed     { id }
  agentToolStart  { id, toolId, status }
  agentToolDone   { id, toolId }
  agentToolsClear { id }
  agentStatus     { id, status: 'active'|'waiting' }
  agentToolPermission      { id }
  agentToolPermissionClear { id }
  subagentToolStart { id, parentToolId, toolId, status }
  subagentToolDone  { id, parentToolId, toolId }
  subagentClear     { id, parentToolId }
  existingAgents    { agents: [...] }
  layoutLoaded      { layout }
  furnitureAssetsLoaded { ... }
  floorTilesLoaded  { ... }
  wallTilesLoaded   { ... }
  characterSpritesLoaded { ... }
  settingsLoaded    { ... }

Webview → Extension:
  openAgent         { folderPath? }        (renamed from openClaude)
  focusAgent        { id }
  closeAgent        { id }
  reassignSeat      { agentId, seatId }
  saveLayout        { layout }
  saveAgentSeats    { seats }
  exportLayout      {}
  importLayout      {}
  setSoundEnabled   { enabled }
```

---

## 5. Strategy Decision Tree

```
START
  │
  ▼
Is VS Code version ≥ 1.107?  ──No──▶  ABORT (minimum engine requirement)
  │
  Yes
  │
  ▼
Does `vscode.proposed.chatSessionsProvider` exist?
  │
  ├─Yes──▶  STRATEGY A: Use chatSessionsProvider
  │          Pros: Direct session state, real-time status
  │          Cons: Proposed API, may change
  │          Requires: enabledApiProposals in package.json
  │
  └─No
     │
     ▼
   Does `vscode.chat.createChatParticipant` exist?
     │
     ├─Yes──▶  STRATEGY B: Chat Participant + LM Tools  ★ RECOMMENDED ★
     │          Pros: Stable API, full control over requests
     │          Cons: Requires @pixel-agents invocation by user
     │          Requires: chatParticipants contribution in package.json
     │
     └─No
        │
        ▼
      STRATEGY C: Terminal Activity Monitoring (fallback)
        Pros: Works everywhere, no API dependency
        Cons: Least granular, heuristic-based
```

### Recommended Approach: Strategy B

`vscode.chat.createChatParticipant` is the most stable API with the richest event model:

1. Register `@pixel-agents` chat participant
2. In the request handler, access `ChatRequest.toolReferences` and `ChatRequest.toolInvocationToken`
3. Forward requests to the language model via `vscode.lm.selectChatModels()`
4. Monitor `ChatResponseStream` for tool call chunks
5. Map tool calls to the existing webview message protocol

This gives full visibility into every tool invocation, including sub-agent spawns (`runSubagent`), without depending on proposed APIs.

---

## 6. File Lifecycle Summary

| File                                 | Action      | Replacement                                    |
| ------------------------------------ | ----------- | ---------------------------------------------- |
| `src/fileWatcher.ts`                 | **DELETE**  | `src/chatSessionTracker.ts`                    |
| `src/transcriptParser.ts`            | **DELETE**  | `src/copilotEventParser.ts`                    |
| `src/agentManager.ts`                | **REWRITE** | Merge into `chatSessionTracker.ts` or simplify |
| `src/copilotTools.ts`                | **CREATE**  | New tool name registry                         |
| `src/copilotEventParser.ts`          | **CREATE**  | New event interpreter                          |
| `src/chatSessionTracker.ts`          | **CREATE**  | New session lifecycle manager                  |
| `src/types.ts`                       | **MODIFY**  | Remove JSONL fields, add session fields        |
| `src/constants.ts`                   | **MODIFY**  | Remove JSONL constants, rename prefix          |
| `src/extension.ts`                   | **MODIFY**  | Add Chat Participant registration              |
| `src/PixelAgentsViewProvider.ts`     | **MODIFY**  | Remove file watcher, add session tracker       |
| `src/timerManager.ts`                | **KEEP**    | No changes needed                              |
| `src/assetLoader.ts`                 | **KEEP**    | No changes needed                              |
| `src/layoutPersistence.ts`           | **KEEP**    | No changes needed                              |
| `webview-ui/src/office/toolUtils.ts` | **MODIFY**  | Update STATUS_TO_TOOL mapping                  |
| All other webview files              | **KEEP**    | No changes needed (except phase 1 renames)     |
