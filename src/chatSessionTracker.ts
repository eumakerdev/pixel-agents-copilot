// Strategy: B (Chat Participant + Language Model Tools API)
// This module bridges the Chat Participant in extension.ts with the webview provider.
// It receives tool invocation events from the Copilot Chat API and forwards
// them to the appropriate agent's state + webview.

import * as vscode from 'vscode';
import type { AgentState } from './types.js';
import { processCopilotToolEvent, processCopilotSubagentToolEvent, processCopilotStatusChange } from './copilotEventParser.js';

/**
 * Lightweight session tracker that bridges Chat Participant events
 * to the agent state + webview messaging system.
 *
 * Created by extension.ts, then connected to PixelAgentsViewProvider
 * via setProviderState() once the webview is ready.
 */
export class ChatSessionTracker implements vscode.Disposable {
	private agents: Map<number, AgentState> | null = null;
	private waitingTimers: Map<number, ReturnType<typeof setTimeout>> | null = null;
	private permissionTimers: Map<number, ReturnType<typeof setTimeout>> | null = null;
	private webview: vscode.Webview | undefined = undefined;
	private activeAgentId: { current: number | null } = { current: null };
	private disposables: vscode.Disposable[] = [];

	constructor(private readonly _context: vscode.ExtensionContext) {}

	/**
	 * Connect the tracker to the provider's shared state.
	 * Called by PixelAgentsViewProvider after initialization.
	 */
	setProviderState(
		agents: Map<number, AgentState>,
		waitingTimers: Map<number, ReturnType<typeof setTimeout>>,
		permissionTimers: Map<number, ReturnType<typeof setTimeout>>,
		activeAgentId: { current: number | null },
		webview: vscode.Webview | undefined,
	): void {
		this.agents = agents;
		this.waitingTimers = waitingTimers;
		this.permissionTimers = permissionTimers;
		this.activeAgentId = activeAgentId;
		this.webview = webview;
	}

	/**
	 * Update the webview reference (needed after webview reload).
	 */
	setWebview(webview: vscode.Webview | undefined): void {
		this.webview = webview;
	}

	/**
	 * Handle a tool invocation event from the Chat Participant.
	 * Automatically targets the currently active agent.
	 */
	handleToolEvent(
		event: { type: 'start' | 'done'; toolName: string; toolId: string; input?: Record<string, unknown> },
	): void {
		if (!this.agents || !this.waitingTimers || !this.permissionTimers) return;
		const agentId = this.activeAgentId.current;
		if (agentId === null) return;

		processCopilotToolEvent(
			agentId, event,
			this.agents, this.waitingTimers, this.permissionTimers, this.webview,
		);
	}

	/**
	 * Handle a sub-agent tool event from the Chat Participant.
	 */
	handleSubagentToolEvent(
		parentToolId: string,
		event: { type: 'start' | 'done'; toolName: string; toolId: string; input?: Record<string, unknown> },
	): void {
		if (!this.agents || !this.permissionTimers) return;
		const agentId = this.activeAgentId.current;
		if (agentId === null) return;

		processCopilotSubagentToolEvent(
			agentId, parentToolId, event,
			this.agents, this.permissionTimers, this.webview,
		);
	}

	/**
	 * Handle a session status change (e.g., turn completed).
	 */
	handleStatusChange(
		status: 'active' | 'waiting' | 'permission' | 'turn-complete',
	): void {
		if (!this.agents || !this.waitingTimers || !this.permissionTimers) return;
		const agentId = this.activeAgentId.current;
		if (agentId === null) return;

		processCopilotStatusChange(
			agentId, status,
			this.agents, this.waitingTimers, this.permissionTimers, this.webview,
		);
	}

	/**
	 * Dispose all resources.
	 */
	dispose(): void {
		for (const d of this.disposables) {
			d.dispose();
		}
		this.disposables = [];
	}
}
