# Shellama

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.tsx
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
