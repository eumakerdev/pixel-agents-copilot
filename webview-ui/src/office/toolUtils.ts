/** Map status prefixes back to tool names for animation selection */
export const STATUS_TO_TOOL: Record<string, string> = {
  'Reading': 'Read',
  'Searching': 'Grep',
  'Finding': 'Grep',
  'Listing': 'Read',
  'Fetching': 'WebFetch',
  'Writing': 'Write',
  'Editing': 'Edit',
  'Running': 'Bash',
  'Subtask': 'Task',
  'Checking': 'Read',
  'Managing': 'Read',
  'Loading': 'Read',
  'Rendering': 'Write',
  'Waiting': 'Read',
  'GitHub': 'Read',
  'Pylance': 'Read',
  'VS Code': 'Read',
  'Using': 'Bash',
}

export function extractToolName(status: string): string | null {
  for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
    if (status.startsWith(prefix)) return tool
  }
  const first = status.split(/[\s:]/)[0]
  return first || null
}

import { ZOOM_DEFAULT_DPR_FACTOR, ZOOM_MIN } from '../constants.js'

/** Compute a default integer zoom level (device pixels per sprite pixel) */
export function defaultZoom(): number {
  const dpr = window.devicePixelRatio || 1
  return Math.max(ZOOM_MIN, Math.round(ZOOM_DEFAULT_DPR_FACTOR * dpr))
}
