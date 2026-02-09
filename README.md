<div align="center">

# Fluent File Explorer

A modern, fluent desktop file manager built with **Tauri v2**, **React 18**, and **TypeScript**.

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?style=for-the-badge&logo=tauri&logoColor=white)](https://v2.tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## Showcase

<div align="center">

### List View
> Clean, detailed file listing with sortable columns

<img src="docs/screenshots/list-view.png" alt="List View" width="800" />

---

### Preview Panel
> Inline file preview with support for 20+ formats

<img src="docs/screenshots/preview-panel.png" alt="Preview Panel" width="800" />

---

### Grid View & Built-in Terminal
> Visual grid layout with integrated terminal panel

<img src="docs/screenshots/grid-terminal.png" alt="Grid View with Terminal" width="800" />

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| **Dual View Modes** | Grid and list views with JetBrains-style file icons (100+ extensions) |
| **File Preview Panel** | Preview 20+ file types including images, code (with syntax highlighting), markdown, CSV, SVG, audio, and video |
| **Bookmarks** | Pin frequently accessed directories with localStorage persistence |
| **File Templates** | Create files from 16 language templates (HTML, CSS, JS, TS, Python, Rust, Go, Java, and more) |
| **Built-in Terminal** | Terminal panel with tab management and command execution |
| **Settings Dialog** | General, Appearance, and Advanced settings with dark/light theme support |
| **Directory Size Calculator** | Calculate total size of current directory |
| **Context Menu** | Copy, cut, paste, rename, delete, open in system, and file properties |
| **Keyboard Shortcuts** | Ctrl+C/X/V/A, F2 (rename), F5 (refresh), Delete, Space (preview) |
| **Search** | Real-time file search within current directory |
| **Quick Access** | Home, Desktop, Documents, Downloads, Pictures, Music, Videos |
| **Smooth Animations** | Transitions, hover effects, and responsive adaptive design |

---

## Tech Stack

<div align="center">

| Layer | Technology |
|:-----:|:----------:|
| **Frontend** | React 18, TypeScript, Vite 6 |
| **Backend** | Rust, Tauri v2 |
| **Styling** | CSS3 with CSS Variables |
| **Icons** | react-icons (VS Code icon set) |

</div>

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) 1.70+
- Tauri v2 system dependencies ([see docs](https://v2.tauri.app/start/prerequisites/))

### Install & Run

```bash
git clone https://github.com/Masterofowls/File_Explorer.git
cd File_Explorer

npm install          # Install dependencies
npm run tauri dev    # Run in development
npm run tauri build  # Build for production
```

---

## Project Structure

```
src/                        # React frontend
  components/               # UI components (Toolbar, FileList, Sidebar, etc.)
  hooks/                    # Custom hooks (useFileSystem, useBookmarks, useSettings)
  data/                     # File templates, icon mappings
  utils/                    # Formatters, parsers, syntax highlighting
  styles/                   # CSS modules (layout, animations, themes)
  types/                    # TypeScript type definitions

src-tauri/                  # Rust backend
  src/
    commands.rs             # 16 Tauri commands (file ops, dir size, etc.)
    lib.rs                  # Plugin registration & command setup
    main.rs                 # Entry point
  capabilities/             # Tauri v2 permission capabilities
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|:--------:|:------:|
| `Ctrl+C` | Copy |
| `Ctrl+X` | Cut |
| `Ctrl+V` | Paste |
| `Ctrl+A` | Select all |
| `Ctrl+,` | Settings |
| `` Ctrl+` `` | Toggle terminal |
| `F2` | Rename |
| `F5` | Refresh |
| `Delete` | Delete |
| `Space` | Toggle preview |
| `Backspace` | Go back |
| `Escape` | Clear selection |

---

## Downloads

Get the latest release from the [**Releases**](https://github.com/Masterofowls/File_Explorer/releases/tag/v1.0.0) page.

| Platform | Installer | Portable |
|:--------:|:---------:|:--------:|
| **Windows** | [NSIS Setup](https://github.com/Masterofowls/File_Explorer/releases/download/v1.0.0/Fluent.File.Explorer_1.0.0_x64-setup.exe) / [MSI](https://github.com/Masterofowls/File_Explorer/releases/download/v1.0.0/Fluent.File.Explorer_1.0.0_x64_en-US.msi) | [.exe](https://github.com/Masterofowls/File_Explorer/releases/download/v1.0.0/fluent-file-explorer.exe) |
| **Linux** | [.deb](https://github.com/Masterofowls/File_Explorer/releases/download/v1.0.0/Fluent.File.Explorer_1.0.0_amd64.deb) / [.rpm](https://github.com/Masterofowls/File_Explorer/releases/download/v1.0.0/Fluent.File.Explorer-1.0.0-1.x86_64.rpm) | [Binary](https://github.com/Masterofowls/File_Explorer/releases/download/v1.0.0/fluent-file-explorer) |

---

<div align="center">

**MIT License** &copy; 2026

</div>
