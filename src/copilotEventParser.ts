import type * as vscode from "vscode";
import type { AgentState } from "./types.js";
import {
  cancelWaitingTimer,
  startWaitingTimer,
  clearAgentActivity,
  startPermissionTimer,
  cancelPermissionTimer,
} from "./timerManager.js";
import { TOOL_DONE_DELAY_MS, TEXT_IDLE_DELAY_MS } from "./constants.js";
import {
  formatCopilotToolStatus,
  COPILOT_PERMISSION_EXEMPT_TOOLS,
} from "./copilotTools.js";

/**
 * Process a Copilot tool invocation event (start or done).
 * Maps tool events to the webview message protocol (agentToolStart/agentToolDone).
 */
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
): void {
  const agent = agents.get(agentId);
  if (!agent) return;

  if (event.type === "start") {
    // Cancel any waiting/idle timer — agent is active
    cancelWaitingTimer(agentId, waitingTimers);
    agent.isWaiting = false;
    agent.hadToolsInTurn = true;
    webview?.postMessage({
      type: "agentStatus",
      id: agentId,
      status: "active",
    });

    const toolName = event.toolName;
    const status = formatCopilotToolStatus(toolName, event.input || {});
    console.log(
      `[Pixel Agents] Agent ${agentId} tool start: ${event.toolId} ${status}`,
    );

    agent.activeToolIds.add(event.toolId);
    agent.activeToolStatuses.set(event.toolId, status);
    agent.activeToolNames.set(event.toolId, toolName);

    webview?.postMessage({
      type: "agentToolStart",
      id: agentId,
      toolId: event.toolId,
      status,
    });

    // Handle sub-agent detection: runSubagent creates a sub-agent character
    if (toolName === "runSubagent") {
      // The webview will create a sub-agent character from the 'agentToolStart'
      // message when the status starts with "Subtask:"
    }

    // Start permission timer for non-exempt tools
    if (!COPILOT_PERMISSION_EXEMPT_TOOLS.has(toolName)) {
      startPermissionTimer(
        agentId,
        agents,
        permissionTimers,
        COPILOT_PERMISSION_EXEMPT_TOOLS,
        webview,
      );
    }
  } else if (event.type === "done") {
    console.log(`[Pixel Agents] Agent ${agentId} tool done: ${event.toolId}`);

    const completedToolName = agent.activeToolNames.get(event.toolId);

    // If the completed tool was a sub-agent task, clear its sub-tools
    if (completedToolName === "runSubagent") {
      agent.activeSubagentToolIds.delete(event.toolId);
      agent.activeSubagentToolNames.delete(event.toolId);
      webview?.postMessage({
        type: "subagentClear",
        id: agentId,
        parentToolId: event.toolId,
      });
    }

    agent.activeToolIds.delete(event.toolId);
    agent.activeToolStatuses.delete(event.toolId);
    agent.activeToolNames.delete(event.toolId);

    const toolId = event.toolId;
    setTimeout(() => {
      webview?.postMessage({
        type: "agentToolDone",
        id: agentId,
        toolId,
      });
    }, TOOL_DONE_DELAY_MS);

    // All tools completed — allow text-idle timer as fallback
    if (agent.activeToolIds.size === 0) {
      agent.hadToolsInTurn = false;
    }
  }
}

/**
 * Process a sub-agent tool event (from runSubagent tool invocations).
 */
export function processCopilotSubagentToolEvent(
  agentId: number,
  parentToolId: string,
  event: {
    type: "start" | "done";
    toolName: string;
    toolId: string;
    input?: Record<string, unknown>;
  },
  agents: Map<number, AgentState>,
  permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
  webview: vscode.Webview | undefined,
): void {
  const agent = agents.get(agentId);
  if (!agent) return;

  if (event.type === "start") {
    const toolName = event.toolName;
    const status = formatCopilotToolStatus(toolName, event.input || {});
    console.log(
      `[Pixel Agents] Agent ${agentId} subagent tool start: ${event.toolId} ${status} (parent: ${parentToolId})`,
    );

    // Track sub-tool IDs
    let subTools = agent.activeSubagentToolIds.get(parentToolId);
    if (!subTools) {
      subTools = new Set();
      agent.activeSubagentToolIds.set(parentToolId, subTools);
    }
    subTools.add(event.toolId);

    // Track sub-tool names (for permission checking)
    let subNames = agent.activeSubagentToolNames.get(parentToolId);
    if (!subNames) {
      subNames = new Map();
      agent.activeSubagentToolNames.set(parentToolId, subNames);
    }
    subNames.set(event.toolId, toolName);

    webview?.postMessage({
      type: "subagentToolStart",
      id: agentId,
      parentToolId,
      toolId: event.toolId,
      status,
    });

    if (!COPILOT_PERMISSION_EXEMPT_TOOLS.has(toolName)) {
      startPermissionTimer(
        agentId,
        agents,
        permissionTimers,
        COPILOT_PERMISSION_EXEMPT_TOOLS,
        webview,
      );
    }
  } else if (event.type === "done") {
    console.log(
      `[Pixel Agents] Agent ${agentId} subagent tool done: ${event.toolId} (parent: ${parentToolId})`,
    );

    const subTools = agent.activeSubagentToolIds.get(parentToolId);
    if (subTools) {
      subTools.delete(event.toolId);
    }
    const subNames = agent.activeSubagentToolNames.get(parentToolId);
    if (subNames) {
      subNames.delete(event.toolId);
    }

    const toolId = event.toolId;
    setTimeout(() => {
      webview?.postMessage({
        type: "subagentToolDone",
        id: agentId,
        parentToolId,
        toolId,
      });
    }, TOOL_DONE_DELAY_MS);

    // Check if there are still non-exempt sub-agent tools — if so, restart permission timer
    let stillHasNonExempt = false;
    for (const [, names] of agent.activeSubagentToolNames) {
      for (const [, toolName] of names) {
        if (!COPILOT_PERMISSION_EXEMPT_TOOLS.has(toolName)) {
          stillHasNonExempt = true;
          break;
        }
      }
      if (stillHasNonExempt) break;
    }
    if (stillHasNonExempt) {
      startPermissionTimer(
        agentId,
        agents,
        permissionTimers,
        COPILOT_PERMISSION_EXEMPT_TOOLS,
        webview,
      );
    }
  }
}

/**
 * Process a Copilot session status change.
 * Maps session lifecycle events to the existing webview message protocol.
 */
export function processCopilotStatusChange(
  agentId: number,
  status: "active" | "waiting" | "permission" | "turn-complete",
  agents: Map<number, AgentState>,
  waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
  permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
  webview: vscode.Webview | undefined,
): void {
  const agent = agents.get(agentId);
  if (!agent) return;

  switch (status) {
    case "active":
      cancelWaitingTimer(agentId, waitingTimers);
      cancelPermissionTimer(agentId, permissionTimers);
      agent.isWaiting = false;
      if (agent.permissionSent) {
        agent.permissionSent = false;
        webview?.postMessage({ type: "agentToolPermissionClear", id: agentId });
      }
      webview?.postMessage({
        type: "agentStatus",
        id: agentId,
        status: "active",
      });
      break;

    case "waiting":
      // Use text-idle timer approach: wait before marking as idle
      startWaitingTimer(
        agentId,
        TEXT_IDLE_DELAY_MS,
        agents,
        waitingTimers,
        webview,
      );
      break;

    case "permission":
      agent.permissionSent = true;
      webview?.postMessage({ type: "agentToolPermission", id: agentId });
      break;

    case "turn-complete":
      // Definitive turn-end: clean up all tool state
      cancelWaitingTimer(agentId, waitingTimers);
      cancelPermissionTimer(agentId, permissionTimers);

      if (agent.activeToolIds.size > 0) {
        agent.activeToolIds.clear();
        agent.activeToolStatuses.clear();
        agent.activeToolNames.clear();
        agent.activeSubagentToolIds.clear();
        agent.activeSubagentToolNames.clear();
        webview?.postMessage({ type: "agentToolsClear", id: agentId });
      }

      agent.isWaiting = true;
      agent.permissionSent = false;
      agent.hadToolsInTurn = false;
      webview?.postMessage({
        type: "agentStatus",
        id: agentId,
        status: "waiting",
      });
      break;
  }
}
