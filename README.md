# Shellama

To install dependencies:

```bash
bun install
```

To run from this repo:

```bash
bun run index.tsx
```

To build a Windows `.exe` from this repo:

```bash
bun run build:win
```

This writes the executable to:

```text
dist/shellama.exe
```

If you need wider compatibility for older Windows x64 CPUs without AVX2 support, use:

```bash
bun run build:win:baseline
```

To build a macOS executable for Apple Silicon:

```bash
bun run build:mac
```

This writes:

```text
dist/shellama-macos-arm64
```

To build an Intel macOS executable:

```bash
bun run build:mac:intel
```

This writes:

```text
dist/shellama-macos-x64
```

To build both macOS variants:

```bash
bun run build:mac:all
```

Compiled application files are also available in:

```text
compile applications/
```

Current prebuilt apps in that folder:

```text
compile applications/shellama.exe
compile applications/shellama-macos-arm64
```

To use `shellama` from any project folder:

```bash
bun linkv
cd /path/to/another/project
shellama
```

`shellama` uses the terminal's current working directory, so if you launch it inside another project, that project becomes the workspace it reads.

On startup, Shellama resolves that workspace directly from the terminal session before the first conversation turn, then shows the active folder in the UI.

Shellama now sends the current workspace files along with your prompts, so local Ollama models behave more like a lightweight workspace-aware assistant instead of a plain chat box.

Usage tips:

```text
- Pick a local model from the selector
- Ask coding, documentation, scripting, or general workspace questions
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
