# Tool Name Mapping: Claude Code → GitHub Copilot

> **Purpose**: Complete reference mapping between Claude Code tool names and GitHub Copilot tool names. Used by the AI agent executing `CONVERSION-PLAN.md` to implement `src/copilotTools.ts` and `webview-ui/src/office/toolUtils.ts`.

---

## 1. Core Tool Mapping

| Claude Tool       | Copilot Tool(s)                                          | Status String Format      | Animation Category    |
| ----------------- | -------------------------------------------------------- | ------------------------- | --------------------- |
| `Read`            | `read_file`                                              | `Reading <basename>`      | reading               |
| `Edit`            | `replace_string_in_file`, `multi_replace_string_in_file` | `Editing <basename>`      | typing                |
| `Write`           | `create_file`                                            | `Writing <basename>`      | typing                |
| `Bash`            | `run_in_terminal`                                        | `Running: <command…>`     | typing                |
| `Glob`            | `file_search`                                            | `Searching files`         | reading               |
| `Grep`            | `grep_search`                                            | `Searching code`          | reading               |
| `WebFetch`        | `fetch_webpage`                                          | `Fetching web content`    | reading               |
| `WebSearch`       | _(no direct equivalent)_                                 | `Searching the web`       | reading               |
| `Task`            | `runSubagent`                                            | `Subtask: <description…>` | typing                |
| `AskUserQuestion` | `ask_questions`                                          | `Waiting for your answer` | _(idle/no animation)_ |
| `EnterPlanMode`   | _(no equivalent)_                                        | `Planning`                | reading               |
| `NotebookEdit`    | `edit_notebook_file`, `run_notebook_cell`                | `Editing notebook`        | typing                |

## 2. Copilot-Only Tools (no Claude equivalent)

| Copilot Tool                | Status String Format | Animation Category |
| --------------------------- | -------------------- | ------------------ |
| `semantic_search`           | `Searching codebase` | reading            |
| `search_subagent`           | `Searching codebase` | reading            |
| `list_dir`                  | `Listing directory`  | reading            |
| `get_errors`                | `Checking errors`    | reading            |
| `manage_todo_list`          | `Managing tasks`     | reading            |
| `read_notebook_cell_output` | `Reading notebook`   | reading            |
| `get_terminal_output`       | `Reading terminal`   | reading            |
| `list_code_usages`          | `Finding usages`     | reading            |
| `renderMermaidDiagram`      | `Rendering diagram`  | typing             |
| `tool_search_tool_regex`    | `Loading tools`      | reading            |

## 3. MCP Tools (prefix `mcp_*`)

| Pattern               | Status String Format   | Animation Category |
| --------------------- | ---------------------- | ------------------ |
| `mcp_io_github_git_*` | `GitHub: <operation>`  | reading            |
| `mcp_pylance_*`       | `Pylance: <operation>` | reading            |
| Any other `mcp_*`     | `Using <tool name>`    | reading            |

## 4. Proposed API / Deferred Tools

These tools may appear when using `chatSessionsProvider` or extension-contributed tools:

| Tool Pattern            | Status String Format   | Animation Category |
| ----------------------- | ---------------------- | ------------------ |
| `github-pull-request_*` | `GitHub: <operation>`  | reading            |
| `vscode_*`              | `VS Code: <operation>` | reading            |
| Unknown                 | `Using <toolName>`     | reading            |

## 5. Permission-Exempt Tools

These tools should NOT trigger the permission-waiting timer (they are expected to be long-running or user-interactive):

### Claude (old)

```
Task, AskUserQuestion
```

### Copilot (new)

```
runSubagent, ask_questions, manage_todo_list, search_subagent, tool_search_tool_regex
```

## 6. `STATUS_TO_TOOL` Reverse Mapping (for webview animation)

This maps the prefix of the status string back to an animation-category tool name. Used in `webview-ui/src/office/toolUtils.ts`:

```typescript
export const STATUS_TO_TOOL: Record<string, string> = {
  // File operations
  Reading: "Read", // read_file, read_notebook_cell_output, get_terminal_output
  Writing: "Write", // create_file
  Editing: "Edit", // replace_string_in_file, multi_replace_string_in_file, edit_notebook_file

  // Search operations
  Searching: "Grep", // grep_search, file_search, semantic_search, search_subagent
  Finding: "Grep", // list_code_usages
  Listing: "Read", // list_dir

  // Execution
  Running: "Bash", // run_in_terminal

  // Web
  Fetching: "WebFetch", // fetch_webpage

  // Sub-agents
  Subtask: "Task", // runSubagent

  // Meta
  Checking: "Read", // get_errors
  Managing: "Read", // manage_todo_list
  Loading: "Read", // tool_search_tool_regex
  Rendering: "Write", // renderMermaidDiagram
  Waiting: "Read", // ask_questions

  // External
  GitHub: "Read", // mcp_io_github_git_*, github-pull-request_*
  Pylance: "Read", // mcp_pylance_*
  "VS Code": "Read", // vscode_* tools

  // Fallback
  Using: "Bash", // any unknown tool
};
```

## 7. `formatCopilotToolStatus()` Implementation Reference

```typescript
import * as path from "path";
import {
  BASH_COMMAND_DISPLAY_MAX_LENGTH,
  TASK_DESCRIPTION_DISPLAY_MAX_LENGTH,
} from "./constants.js";

export const COPILOT_PERMISSION_EXEMPT_TOOLS = new Set([
  "runSubagent",
  "ask_questions",
  "manage_todo_list",
  "search_subagent",
  "tool_search_tool_regex",
]);

export function formatCopilotToolStatus(
  toolName: string,
  input: Record<string, unknown>,
): string {
  const basename = (p: unknown) =>
    typeof p === "string" ? path.basename(p) : "";

  switch (toolName) {
    // File operations
    case "read_file":
      return `Reading ${basename(input.filePath)}`;
    case "replace_string_in_file":
      return `Editing ${basename(input.filePath)}`;
    case "multi_replace_string_in_file":
      return `Editing multiple files`;
    case "create_file":
      return `Writing ${basename(input.filePath)}`;
    case "edit_notebook_file":
      return `Editing notebook`;

    // Search
    case "grep_search":
      return `Searching code`;
    case "file_search":
      return `Searching files`;
    case "semantic_search":
      return `Searching codebase`;
    case "search_subagent":
      return `Searching codebase`;
    case "list_code_usages":
      return `Finding usages`;
    case "list_dir":
      return `Listing directory`;

    // Execution
    case "run_in_terminal": {
      const cmd = (input.command as string) || "";
      return `Running: ${
        cmd.length > BASH_COMMAND_DISPLAY_MAX_LENGTH
          ? cmd.slice(0, BASH_COMMAND_DISPLAY_MAX_LENGTH) + "\u2026"
          : cmd
      }`;
    }
    case "get_terminal_output":
      return `Reading terminal`;

    // Web
    case "fetch_webpage":
      return `Fetching web content`;

    // Sub-agents
    case "runSubagent": {
      const desc =
        typeof input.description === "string" ? input.description : "";
      return desc
        ? `Subtask: ${
            desc.length > TASK_DESCRIPTION_DISPLAY_MAX_LENGTH
              ? desc.slice(0, TASK_DESCRIPTION_DISPLAY_MAX_LENGTH) + "\u2026"
              : desc
          }`
        : "Running subtask";
    }

    // Interactive
    case "ask_questions":
      return `Waiting for your answer`;
    case "manage_todo_list":
      return `Managing tasks`;

    // Diagnostics
    case "get_errors":
      return `Checking errors`;
    case "tool_search_tool_regex":
      return `Loading tools`;

    // Notebook
    case "run_notebook_cell":
      return `Running notebook cell`;
    case "read_notebook_cell_output":
      return `Reading notebook`;

    // Rendering
    case "renderMermaidDiagram":
      return `Rendering diagram`;

    default: {
      // MCP tools
      if (toolName.startsWith("mcp_io_github_git_"))
        return `GitHub: ${toolName.replace("mcp_io_github_git_", "").replace(/_/g, " ")}`;
      if (toolName.startsWith("mcp_pylance_"))
        return `Pylance: ${toolName
          .replace("mcp_pylance_mcp_s_pylance", "")
          .replace(/([A-Z])/g, " $1")
          .trim()}`;
      if (toolName.startsWith("github-pull-request_"))
        return `GitHub: ${toolName.replace("github-pull-request_", "").replace(/_/g, " ")}`;

      return `Using ${toolName}`;
    }
  }
}

export function mapCopilotToolToAnimationCategory(
  toolName: string,
): "typing" | "reading" {
  const typingTools = new Set([
    "replace_string_in_file",
    "multi_replace_string_in_file",
    "create_file",
    "run_in_terminal",
    "runSubagent",
    "edit_notebook_file",
    "run_notebook_cell",
    "renderMermaidDiagram",
  ]);
  return typingTools.has(toolName) ? "typing" : "reading";
}
```

## 8. Animation Category Rules

The webview character FSM has two activity animations:

- **typing**: character faces desk and types — used for write/edit/execute operations
- **reading**: character faces desk and reads — used for search/read operations

Rule of thumb:

- If the tool **modifies** something (file, terminal, notebook) → `typing`
- If the tool **reads/searches** something → `reading`
- Fallback for unknown tools → `reading`
