# Shellama

To install dependencies:

```bash
bun install
```

To run from this repo:

```bash
bun run index.tsx
```

To use `shellama` from any project folder:

```bash
bun linkv
cd /path/to/another/project
shellama
```

`shellama` uses the terminal's current working directory, so if you launch it inside another project, that project becomes the workspace it reads.

Shellama now sends the current workspace files along with your prompts, so local Ollama models behave more like a lightweight repo-aware coding assistant instead of a plain chat box.

Usage tips:

```text
- Pick a local model from the selector
- Ask coding questions about the repo
- Press Ctrl/Cmd+P to switch models
- Press Ctrl/Cmd+L to clear the conversation
```

Project structure:

```text
.
├── App.tsx
├── index.tsx
└── src
	├── modules
	│   └── chat
	│       └── ChatApp.tsx
	├── services
	│   └── ollamaService.ts
	├── types
	│   └── model.ts
	└── utils
		├── model.ts
		└── ollamaError.ts
```

This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
