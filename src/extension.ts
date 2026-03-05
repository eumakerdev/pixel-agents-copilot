import * as vscode from 'vscode';
import { PixelAgentsViewProvider } from './PixelAgentsViewProvider.js';
import { VIEW_ID, COMMAND_SHOW_PANEL, COMMAND_EXPORT_DEFAULT_LAYOUT } from './constants.js';
import { ChatSessionTracker } from './chatSessionTracker.js';

let providerInstance: PixelAgentsViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
	// Create session tracker (bridges Chat Participant events → agent state → webview)
	const tracker = new ChatSessionTracker(context);

	const provider = new PixelAgentsViewProvider(context, tracker);
	providerInstance = provider;

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(VIEW_ID, provider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_SHOW_PANEL, () => {
			vscode.commands.executeCommand(`${VIEW_ID}.focus`);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_EXPORT_DEFAULT_LAYOUT, () => {
			provider.exportDefaultLayout();
		})
	);

	// Strategy B: Register Chat Participant for Copilot integration
	const participant = vscode.chat.createChatParticipant('pixel-agents.agent', async (request, _chatContext, stream, token) => {
		// Forward request to the language model and monitor tool invocations
		const models = await vscode.lm.selectChatModels({ family: 'gpt-4o' });
		const model = models[0];
		if (!model) {
			stream.markdown('No language model available. Please ensure GitHub Copilot is active.');
			return;
		}

		const messages = [vscode.LanguageModelChatMessage.User(request.prompt)];

		try {
			const chatResponse = await model.sendRequest(messages, {}, token);

			for await (const part of chatResponse.stream) {
				if (part instanceof vscode.LanguageModelTextPart) {
					stream.markdown(part.value);
				} else if (part instanceof vscode.LanguageModelToolCallPart) {
					// Tool invocation detected — notify the tracker
					tracker.handleToolEvent({
						type: 'start',
						toolName: part.name,
						toolId: part.callId,
						input: typeof part.input === 'object' && part.input !== null
							? part.input as Record<string, unknown>
							: {},
					});
				} else if (part instanceof vscode.LanguageModelToolResultPart) {
					// Tool completion — notify the tracker
					tracker.handleToolEvent({
						type: 'done',
						toolName: '',
						toolId: part.callId,
						input: {},
					});
				}
			}
		} catch (err) {
			if (err instanceof vscode.LanguageModelError) {
				stream.markdown(`Error: ${err.message}`);
			}
			throw err;
		}

		// Turn complete — notify the tracker
		tracker.handleStatusChange('turn-complete');
	});

	participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
	context.subscriptions.push(participant);
	context.subscriptions.push(tracker);
}

export function deactivate() {
	providerInstance?.dispose();
}
