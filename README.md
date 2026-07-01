# mvcs

A really simple VCS system built to practice Node.js fundamentals, TypeScript design, and testing by implementing core version-control concepts from scratch.

> ⚠️ This project is primarily a learning exercise and may evolve frequently.

---

## Motivation

This project exists for two main reasons:

1. **Learning by building** - understand how version control works internally by implementing a minimal VCS
2. **Practice fundamentals** - improve confidence with Node.js, TypeScript, and TDD

This project is intended to be simple and explore foundational concepts like repository initialization, snapshots, history, and state restoration.

---

## Key Featues

- Repository initialization in a working directory
- Tracking file snapshots
- Viewing snapshot history/log
- Restoring files to previous states

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm (or pnpm, depending on your setup)

### Install

```bash
git clone https://github.com/andrehgdias/mvcs.git
cd mvcs
npm install
```

### Build

Use the scripts defined in `package.json`:

```bash
npm run build
```

---

## Testing

Tests are a core part of this project’s purpose.  
Run them with:

```bash
npm run test
```

---

## Roadmap

Potential next improvements:

- Save delta instead of whole directory
- Zip snapshots
- Branching
- Commit metadata enhancements
- Improved CLI UX and help output

---

## Contributing

Contributions, suggestions, and feedback are welcome.  
Feel free to open an issue to discuss ideas or improvements.
