<div align="center">

# Pixel Agents for Copilot

### Your GitHub Copilot agents, alive in pixel art.

A VS Code extension that transforms your AI coding sessions into an animated pixel art office — each Copilot agent becomes a character that walks, sits at desks, and visually reflects what it's doing in real time.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.107%2B-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-Powered-8957e5?logo=githubcopilot)](https://github.com/features/copilot)

![Pixel Agents screenshot](webview-ui/public/Screenshot.jpg)

<p>
  <img src="webview-ui/public/characters.png" alt="Pixel Agents characters" width="320" height="72" style="image-rendering: pixelated;">
</p>

</div>

---

## What is Pixel Agents?

Pixel Agents turns your GitHub Copilot coding sessions into something you can *see*. Every agent you launch spawns an animated pixel character in a virtual office — typing when writing code, reading when searching files, waiting when it needs your attention. Sub-agents appear as new characters near their parent, and when a task finishes, you'll know by a glance.

> **Fork notice**: This project is a fork of the original [Pixel Agents](https://github.com/pablodelucca/pixel-agents) by [Pablo De Lucca](https://github.com/pablodelucca), adapted to work with **GitHub Copilot** instead of Claude Code. All credit for the original concept, pixel art engine, layout editor, and office rendering goes to the original author. This fork focuses on integrating the beautiful visualization with the Copilot ecosystem.

---

## Features

| Feature | Description |
|---------|-------------|
| **One agent, one character** | Every Copilot agent session gets its own animated character |
| **Live activity tracking** | Characters animate based on real tool usage — writing, reading, running commands, searching |
| **Sub-agent visualization** | Sub-agents spawn as separate characters linked to their parent |
| **Office layout editor** | Design your office with floors, walls, furniture, and full HSB color control |
| **Speech bubbles** | Visual indicators when an agent is waiting for input or needs permission |
| **Sound notifications** | Optional chime when an agent finishes its turn |
| **Persistent layouts** | Your office design is saved and shared across VS Code windows |
| **Diverse characters** | 6 unique character sprites with automatic palette diversification |
| **Export & import** | Share your office layouts as JSON files |

---

## Getting Started

### Requirements

- **VS Code** 1.107.0 or later
- **GitHub Copilot** subscription (Free, Pro, or Enterprise)

### Install from source

```bash
git clone https://github.com/eumakerdev/pixel-agents-copilot.git
cd pixel-agents-copilot
npm install
cd webview-ui && npm install && cd ..
npm run build
```

Then press **F5** in VS Code to launch the Extension Development Host.

### Usage

1. Open the **Pixel Agents** panel (bottom panel area, alongside your terminal)
2. Click **+ Agent** to launch a new Copilot agent session
3. Start coding — watch the character react in real time as tools are invoked
4. Click a character to select it, then click a seat to reassign it
5. Click **Layout** to customize your office

---

## Layout Editor

The built-in editor lets you design your pixel art office:

- **Floor painting** — 7 patterns with full HSB color control
- **Wall painting** — Auto-tiling walls with color customization
- **Furniture** — Place, rotate (R), toggle state (T), drag to move, color per item
- **Tools** — Select, paint, erase, place, eyedropper, pick
- **Undo/Redo** — 50 levels with Ctrl+Z / Ctrl+Y
- **Expandable grid** — Up to 64×64 tiles; click the ghost border to grow

### Office Assets

The office tileset is **[Office Interior Tileset (16x16)](https://donarg.itch.io/officetileset)** by **Donarg** on itch.io ($2 USD). It is not included in this repository due to its license. To use the full furniture catalog locally:

```bash
npm run import-tileset
```

The extension works without the tileset — you get the default characters and basic layout. The full catalog requires the imported assets.

Character sprites are based on the amazing work of **[JIK-A-4, Metro City](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack)**.

---

## How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Copilot     │────▶│  Extension Host   │────▶│  Webview (React) │
│  Agent       │     │  Event tracking   │     │  Pixel art office│
│  Session     │     │  Tool detection   │     │  Canvas rendering│
└─────────────┘     └──────────────────┘     └──────────────────┘
```

The extension monitors Copilot agent sessions and detects tool invocations (file reads, edits, terminal commands, searches, sub-agent spawns). Each event maps to a character animation — typing for writes, reading for searches, idle wandering between tasks. The webview runs a lightweight game loop with canvas rendering, BFS pathfinding, and a character state machine. Everything is pixel-perfect at integer zoom levels.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Extension** | TypeScript, VS Code Webview API, esbuild |
| **Webview** | React 19, TypeScript, Vite, Canvas 2D |
| **Rendering** | Custom pixel engine, sprite caching, z-sorted entities |
| **Pathfinding** | BFS on tile map with per-character walkability |

---

## Roadmap

- **GitHub Copilot integration** — Full migration from Claude Code to Copilot Chat API / Agent mode
- **Custom agent definitions** — `.agent.md` files with custom skills, system prompts, names, and skins
- **Desks as directories** — Click a desk to assign a working directory to an agent
- **Agent teams** — Visualize multi-agent coordination with Copilot's sub-agent system
- **Git worktree support** — Agents in different worktrees to avoid file conflicts
- **Community assets** — Freely usable pixel art tilesets and characters
- **Cross-platform testing** — macOS and Linux support improvements

---

## Contributing

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for setup instructions and contribution guidelines.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

---

## Credits & Acknowledgments

This project exists thanks to the work of many people:

| | |
|---|---|
| **Original project** | [Pixel Agents](https://github.com/pablodelucca/pixel-agents) by [Pablo De Lucca](https://github.com/pablodelucca) — the entire pixel art engine, office renderer, layout editor, character system, sprite pipeline, and the original vision of coding agents as animated characters. |
| **This fork** | [Pixel Agents for Copilot](https://github.com/eumakerdev/pixel-agents-copilot) by [eumakerdev](https://github.com/eumakerdev) — adaptation to integrate with GitHub Copilot's ecosystem. |
| **Character sprites** | [JIK-A-4, Metro City](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack) — the base character pack. |
| **Office tileset** | [Donarg](https://donarg.itch.io/officetileset) — Office Interior Tileset (16x16). |
| **Original contributors** | [@johnnnzhub](https://github.com/johnnnzhub), [@pghoya2956](https://github.com/pghoya2956) — macOS fixes, multi-root workspace support. |

### Supporting the original author

If you enjoy Pixel Agents, consider supporting **Pablo De Lucca**, who created the original project:

<a href="https://github.com/sponsors/pablodelucca">
  <img src="https://img.shields.io/badge/Sponsor_Pablo-GitHub-ea4aaa?logo=github" alt="GitHub Sponsors">
</a>
<a href="https://ko-fi.com/pablodelucca">
  <img src="https://img.shields.io/badge/Support_Pablo-Ko--fi-ff5e5b?logo=ko-fi" alt="Ko-fi">
</a>

---

## License

This project is licensed under the [MIT License](LICENSE).

Original work copyright (c) 2026 Pablo De Lucca. Fork modifications by eumakerdev.
