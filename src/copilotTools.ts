import * as path from 'path';
import {
	BASH_COMMAND_DISPLAY_MAX_LENGTH,
	TASK_DESCRIPTION_DISPLAY_MAX_LENGTH,
} from './constants.js';

export const COPILOT_PERMISSION_EXEMPT_TOOLS = new Set([
	'runSubagent',
	'ask_questions',
	'manage_todo_list',
	'search_subagent',
	'tool_search_tool_regex',
]);

export function formatCopilotToolStatus(
	toolName: string,
	input: Record<string, unknown>,
): string {
	const basename = (p: unknown) => typeof p === 'string' ? path.basename(p) : '';

	switch (toolName) {
		// File operations
		case 'read_file':
			return `Reading ${basename(input.filePath)}`;
		case 'replace_string_in_file':
			return `Editing ${basename(input.filePath)}`;
		case 'multi_replace_string_in_file':
			return 'Editing multiple files';
		case 'create_file':
			return `Writing ${basename(input.filePath)}`;
		case 'edit_notebook_file':
			return 'Editing notebook';

		// Search
		case 'grep_search':
			return 'Searching code';
		case 'file_search':
			return 'Searching files';
		case 'semantic_search':
			return 'Searching codebase';
		case 'search_subagent':
			return 'Searching codebase';
		case 'list_code_usages':
			return 'Finding usages';
		case 'list_dir':
			return 'Listing directory';

		// Execution
		case 'run_in_terminal': {
			const cmd = (input.command as string) || '';
			return `Running: ${cmd.length > BASH_COMMAND_DISPLAY_MAX_LENGTH
				? cmd.slice(0, BASH_COMMAND_DISPLAY_MAX_LENGTH) + '\u2026'
				: cmd}`;
		}
		case 'get_terminal_output':
			return 'Reading terminal';

		// Web
		case 'fetch_webpage':
			return 'Fetching web content';

		// Sub-agents
		case 'runSubagent': {
			const desc = typeof input.description === 'string' ? input.description : '';
			return desc
				? `Subtask: ${desc.length > TASK_DESCRIPTION_DISPLAY_MAX_LENGTH
					? desc.slice(0, TASK_DESCRIPTION_DISPLAY_MAX_LENGTH) + '\u2026'
					: desc}`
				: 'Running subtask';
		}

		// Interactive
		case 'ask_questions':
			return 'Waiting for your answer';
		case 'manage_todo_list':
			return 'Managing tasks';

		// Diagnostics
		case 'get_errors':
			return 'Checking errors';
		case 'tool_search_tool_regex':
			return 'Loading tools';

		// Notebook
		case 'run_notebook_cell':
			return 'Running notebook cell';
		case 'read_notebook_cell_output':
			return 'Reading notebook';

		// Rendering
		case 'renderMermaidDiagram':
			return 'Rendering diagram';

		default: {
			// MCP tools
			if (toolName.startsWith('mcp_io_github_git_'))
				return `GitHub: ${toolName.replace('mcp_io_github_git_', '').replace(/_/g, ' ')}`;
			if (toolName.startsWith('mcp_pylance_'))
				return `Pylance: ${toolName.replace('mcp_pylance_mcp_s_pylance', '').replace(/([A-Z])/g, ' $1').trim()}`;
			if (toolName.startsWith('github-pull-request_'))
				return `GitHub: ${toolName.replace('github-pull-request_', '').replace(/_/g, ' ')}`;

			return `Using ${toolName}`;
		}
	}
}

export function mapCopilotToolToAnimationCategory(
	toolName: string,
): 'typing' | 'reading' {
	const typingTools = new Set([
		'replace_string_in_file',
		'multi_replace_string_in_file',
		'create_file',
		'run_in_terminal',
		'runSubagent',
		'edit_notebook_file',
		'run_notebook_cell',
		'renderMermaidDiagram',
	]);
	return typingTools.has(toolName) ? 'typing' : 'reading';
}
