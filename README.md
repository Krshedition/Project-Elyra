# ELYRA — Windows Multimodal AI Desktop Assistant & Web Controller

> **Project Elyra** is an ultra-low latency, Windows-native virtual AI desktop assistant engineered for **Krish Bhutiya**. Operating as a sleek, transparent, floating desktop widget, Elyra leverages the **Gemini Multimodal Live API** (`gemini-3.1-flash-live-preview`) over bidirectional WebSockets to deliver real-time voice conversation, event-driven desktop vision, autonomous browser orchestration via Playwright, deep OS automation via a custom C++ native addon, and a persistent long-term SQLite memory system.

---

## 📑 Table of Contents
- [1. Executive Summary](#1-executive-summary)
- [2. System Architecture & Information Flow](#2-system-architecture--information-flow)
- [3. Technology Stack Breakdown (What Was Used for What)](#3-technology-stack-breakdown-what-was-used-for-what)
- [4. Complete Codebase Anatomy & File Map](#4-complete-codebase-anatomy--file-map)
- [5. Deep-Dive Subsystem Analysis](#5-deep-dive-subsystem-analysis)
  - [5.1 Multimodal Live Voice & Vision Streaming](#51-multimodal-live-voice--vision-streaming)
  - [5.2 Playwright Web Automation & Visual DOM Tagging](#52-playwright-web-automation--visual-dom-tagging)
  - [5.3 Native Windows C++ Engine (`elyra_automation.node`)](#53-native-windows-c-engine-elyra_automationnode)
  - [5.4 Persistent SQLite Core Memory & Autonomous Worker](#54-persistent-sqlite-core-memory--autonomous-worker)
  - [5.5 Transparent Glassmorphic UI & Animation Pipeline](#55-transparent-glassmorphic-ui--animation-pipeline)
  - [5.6 Security, Validation & Confirmation Protocols](#56-security-validation--confirmation-protocols)
- [6. Current Progress & Implementation Status](#6-current-progress--implementation-status)
- [7. Setup, Build & Running Guide](#7-setup-build--running-guide)
- [8. Roadmap & Phase 2 Evolution](#8-roadmap--phase-2-evolution)

---

## 1. Executive Summary

Project Elyra bridges conversational multimodal artificial intelligence directly into the Windows operating system and modern web environments. Rather than relying on rigid text chat or cloud-delayed REST APIs, Elyra communicates with human-like latency using full-duplex PCM16 audio streaming (16kHz in, 24kHz out) and lightweight desktop vision.

### Key Highlights:
- **Autonomous Browser Orchestrator (Phase 1 College Presentation Focus)**: Elyra directly pilots a dedicated **Brave Browser** session via Chrome DevTools Protocol (CDP) and Playwright. She can visually scan web pages, inject numeric red tags (`[ID]`) over interactive elements, click links/buttons, type into inputs, search and play YouTube videos, and scroll dynamically.
- **Native Windows OS Integration**: Powered by a custom-compiled C++ N-API binary (`elyra_automation.node`), Elyra controls system volume, screen brightness via WMI, Wi-Fi radio states via WLAN APIs, Bluetooth radios via WinRT, display resolutions, clipboard contents, running processes, and application windows.
- **Persistent Local Core Memory**: Powered by `better-sqlite3`, Elyra remembers facts, preferences, user habits, and summaries across sessions without cloud dependency. An autonomous Gemini worker analyzes conversation transcripts in the background to deduce and store new knowledge.
- **Non-Intrusive Desktop Presence**: A frameless, transparent, click-through desktop overlay featuring orbital animations, dynamic reactive waveforms, and expandable memory management.

---

## 2. System Architecture & Information Flow

```text
                                +--------------------------------------------+
                                |        Gemini Multimodal Live API          |
                                |       (gemini-3.1-flash-live-preview)      |
                                +---------------------+----------------------+
                                                      ^
                               WebSocket Bidi Stream  |  (Audio PCM16 16kHz, 
                               (Tool calls / Vision)  |   Audio PCM16 24kHz,
                                                      v   JPEG screen diffs)
+-------------------------------------------------------------------------------------------------+
|                                    PROJECT ELYRA RUNTIME                                        |
|                                                                                                 |
|  +-------------------------------------+       +---------------------------------------------+  |
|  |       ELECTRON RENDERER (React 19)   |       |          ELECTRON MAIN PROCESS              |  |
|  |                                     |       |                                             |  |
|  | - WaveWidget (Orb, Waveforms, Glow) |       | - Window Manager (Frameless, Always-On-Top) |  |
|  | - MemoryManager (Fact Inspector UI) |       | - IPC Router & Validator Layer              |  |
|  | - useLiveSession Hook               | <===> | - SQLite DB (Sessions & User Facts)         |  |
|  | - AudioRecorder (16kHz PCM16)       |  IPC  | - Background Memory Worker (Gemini 2.5)     |  |
|  | - AudioStreamer (24kHz Web Audio)   |       | - State-Aware Session Resumption            |  |
|  | - Screen Capturer (WebRTC + Canvas) |       |                                             |  |
|  +-------------------------------------+       +----------------------+----------------------+  |
|                                                                       |                          |
|                                               +-----------------------+-----------------------+  |
|                                               |                                               |  |
|                                               v                                               v  |
|                                +-----------------------------+               +----------------+  |
|                                | Playwright Browser Service  |               |  C++ Native    |  |
|                                | (DirectBrowserEngine)       |               |  Engine Addon  |  |
|                                +--------------+--------------+               +--------+-------+  |
+-----------------------------------------------|---------------------------------------|---------+
                                                | CDP Port 9222                         | Win32 / WMI / WinRT
                                                v                                       v
                                    +-----------------------+               +-----------------------+
                                    |     Brave Browser     |               |      Windows OS       |
                                    | (DOM Tagging, Clicks, |               | (Volume, Brightness,  |
                                    |  Forms, Navigation)   |               |  Apps, WiFi, Process) |
                                    +-----------------------+               +-----------------------+
```

---

## 3. Technology Stack Breakdown (What Was Used for What)

| Technology / Library | Version | Purpose & Specific Implementation in Elyra |
| :--- | :--- | :--- |
| **Electron** | `^42.2.0` | Desktop container providing transparent frameless windowing, system tray integration, single-instance locking, screen capturing via `desktopCapturer`, and deep system IPC bridging. |
| **React** | `^19.2.6` | Modern UI layer powering the floating desktop widget, reactive audio waveforms, and interactive Core Memory manager. |
| **Vite** | `^8.0.12` | Lightning-fast development server, HMR, and production builder configured with `vite-plugin-electron` and `@tailwindcss/vite`. |
| **Tailwind CSS** | `^4.3.0` | High-performance styling utility for dark-mode aesthetic, backdrop blur effects, glassmorphic styling, and fluid layouts. |
| **Framer Motion** | `^12.40.0` | Powers Elyra's multi-stage ignition boot sequence, revolving conic gradients, particle physics, specular glass sweeps, and animated modal transitions. |
| **Playwright** | `^1.62.1` | Automated browser driver executing web automation by attaching to Brave Browser over Chrome DevTools Protocol (`localhost:9222`), evaluating DOM scripts, clicking elements, and typing. |
| **Node-API (N-API)** | `^8.8.0` | C++ abstraction interface used to build `elyra_automation.node`, binding native Windows APIs directly into Node.js. |
| **Better-SQLite3** | `^13.0.2` | Ultra-fast, synchronous local SQLite database engine storing permanent user facts, preferences, confidence scores, and historical session digests. |
| **@google/genai** | `^2.6.0` | Google Gen AI SDK used by the background memory worker (`gemini-2.5-flash`) for structured fact extraction and summarization. |
| **WebSockets (Native)** | *Standard* | Establishes full-duplex bidirectional communication with Gemini Multimodal Live API (`v1alpha.GenerativeService.BidiGenerateContent`). |
| **Web Audio API** | *Standard* | Captures raw microphone audio at 16kHz PCM16 via `ScriptProcessorNode` and plays AI voice at 24kHz PCM16 via `AudioBufferSourceNode` with FFT frequency analysis. |
| **Win32 / COM / WinRT APIs** | *Native C++* | `ShellExecuteW`, `SendInput`, `GetSystemPowerStatus`, `WlanSetInterface`, `IAudioEndpointVolume`, `WmiSetBrightness`, and `IRadioStatics` for hardware and OS control. |
| **Lucide React** | `^1.16.0` | Clean, crisp vector icons for microphone status, keyboard, settings, and memory operations. |
| **NirCmd** | `bin/nircmdc.exe` | Compact command-line utility used as a robust secondary driver for configuring Windows default sound devices. |

---

## 4. Complete Codebase Anatomy & File Map

```text
Project Elyra/
├── .env                               # Environment variables (VITE_GEMINI_API_KEY)
├── about elyra.md                     # Architecture specification & overview
├── binding.gyp                        # node-gyp build configuration for C++ addon
├── package.json                       # Dependencies, scripts, and electron-builder config
├── tsconfig.json                      # Master TypeScript configuration
├── vite.config.ts                     # Vite + React + Electron + Tailwind plugin configuration
│
├── bin/                               # Bundled native Windows helper binaries
│   ├── nircmd.chm                     # NirCmd documentation
│   ├── nircmd.exe                     # NirCmd Windows GUI binary
│   └── nircmdc.exe                    # NirCmd Windows CLI binary (audio switching)
│
├── build/Release/                     # Output folder for compiled C++ binary
│   └── elyra_automation.node          # Native C++ module compiled via node-gyp
│
├── electron/                          # Electron Main Process & Native Handlers
│   ├── action_handler.ts              # Bridges desktop action IPC calls to C++ addon or PowerShell
│   ├── browser_service.ts             # DirectBrowserEngine: Playwright CDP controller, tab manager & DOM tagger
│   ├── main.ts                        # Electron entry point: window management, IPC registration, lifecycle
│   ├── memory.ts                      # SQLite memory layer & background Gemini summarization worker
│   ├── preload.ts                     # ContextBridge exposing secure IPC APIs to React renderer
│   └── validator.ts                   # Security layer validating and sanitizing AI tool arguments
│
├── native_engine/                     # Low-level C++ Windows Automation Core
│   ├── addon.cpp                      # N-API bindings & AsyncWorkers for non-blocking Node calls
│   ├── automation.cpp                 # Win32, WMI, WLAN, WinRT, and Core Audio implementations
│   └── automation.h                   # C++ Automation namespace declarations and function signatures
│
└── src/                               # React Frontend (Renderer Process)
    ├── App.tsx                        # Root component managing window mode and widget states
    ├── index.css                      # Base stylesheet and typography imports
    ├── WaveWidget.tsx                 # Main visual interface (orb, boot sequence, reactive waveform)
    ├── main.tsx                       # React DOM root bootstrapping
    │
    ├── components/
    │   └── MemoryManager.tsx          # Glassmorphic modal to view, search, add, edit & delete facts
    │
    ├── hooks/
    │   └── useLiveSession.ts          # Central hook: WebSocket lifecycle, unified tool dispatcher, vision, audio
    │
    └── lib/
        ├── audio-recorder.ts          # 16kHz PCM16 mic capture and RMS volume calculation
        └── audio-streamer.ts          # 24kHz PCM16 queue playback, FFT analyser, and interruption
```

---

## 5. Deep-Dive Subsystem Analysis

### 5.1 Multimodal Live Voice & Vision Streaming
- **Voice Ingestion (`audio-recorder.ts`)**: Initializes `AudioContext` at 16,000Hz mono. Samples are converted from Float32 to signed 16-bit PCM (`ArrayBuffer`), base64-encoded, and transmitted continuously as `realtimeInput.audio` WebSocket packets.
- **Voice Synthesis & Playback (`audio-streamer.ts`)**: Streams 24,000Hz PCM16 chunks from the Gemini server directly into scheduled `AudioBufferSourceNode` buffers. Supports **instant barge-in / interruption**; when the user speaks while Elyra is talking, incoming `interrupted` frames cancel audio playback instantly without audio clipping.
- **Adaptive Screen Vision (`useLiveSession.ts`)**:
  - Captures the primary display feed using Electron's `desktopCapturer.getSources({ types: ['screen'] })` piped into a hidden HTML `<video>` element.
  - An event-driven diffing engine samples a downscaled 64x36 `<canvas>` every 4 seconds.
  - Computes a pixel delta against the previous snapshot. **If less than 3% of pixels have changed, the frame is dropped**. If dynamic activity is detected, a compressed 720p JPEG is streamed to Gemini. This achieves up to **85% bandwidth reduction** during idle screen states.

### 5.2 Playwright Web Automation & Multi-Tab Orchestration
Located in `electron/browser_service.ts`, `DirectBrowserEngine` controls an active Brave Browser session:
1. **CDP Connection**: Connects to an active Brave instance over Chrome DevTools Protocol at `http://localhost:9222`. If Brave is closed or running without remote debugging, it restarts Brave with `--remote-debugging-port=9222 --restore-last-session`.
2. **Multi-Tab Architecture & Tab ID Protocol**:
   - Maintains a synchronized map of tab contexts (`tabIdMap: Map<number, Page>` and `pageToIdMap: WeakMap<Page, number>`).
   - Each tab is assigned a stable numeric identifier (`Tab ID 1, 2, 3...`).
   - `browser_new_tab`: Launches new tabs and returns their assigned Tab ID.
   - `browser_switch_tab`: Brings a specific tab to focus via Tab ID or title/URL matching.
   - `browser_list_tabs`: Reports all open tabs, their IDs, page titles, active URLs, and focus state.
   - `browser_close_tab`: Terminates specific tabs cleanly by Tab ID or title.
   - **Targeted Tab Execution**: High-level actions (`browser_navigate`, `browser_type_input`, `browser_click_text`, `browser_click_video`, `browser_scroll`, and `browser_analyze_page`) accept an optional `tabId`. This allows Elyra to execute actions directly on secondary tabs without losing place or swapping contexts unintentionally.
3. **Visual DOM Tagging (`browser_analyze_page`)**:
   - Injects a script into the DOM that identifies up to 200 visible, interactable elements (`<a>`, `<button>`, `<input>`, `[role="button"]`, etc.).
   - Appends high-contrast visual badges (`.elyra-tag-overlay`) containing numeric IDs `[1]`, `[2]`, `[3]` directly above the elements.
   - Assigns corresponding `data-elyra-id` attributes to DOM nodes and returns a structured summary to the AI model.
   - Elyra can then execute pinpoint actions like `browser_click_element(id)` or multi-field form fills (`browser_fill_form`) without fragile CSS selectors.
4. **Dedicated YouTube Navigation**: Employs custom CSS locators (`ytd-rich-grid-media a#video-title`) for instantaneous one-shot video playback (`browser_click_video`).
5. **Autonomous Loop Breaker**:
   - Embedded in `src/hooks/useLiveSession.ts`, a safety governor tracks consecutive tool calls executed without new user voice transcriptions (`toolsSinceLastUserSpeechRef`).
   - If autonomous tool executions chain repeatedly (e.g., recursive tab loops), execution halts after two turns and waits for user confirmation before proceeding.

### 5.3 Native Windows C++ Engine (`elyra_automation.node`)
Built with `node-addon-api` and compiled via `binding.gyp`, the C++ addon executes directly against Windows operating system APIs without spawning external shells where possible:
- **Window Management & App Launching**: Uses `ShellExecuteW` and `EnumWindows`. Focuses windows using thread synchronization (`AttachThreadInput` + `SetForegroundWindow`).
- **Simulated Input**: Translates virtual keys and injects Unicode keystrokes using Win32 `SendInput` with keyup/keydown timing delays.
- **Hardware & Power Stats**: Retrieves CPU model from the Windows Registry (`HARDWARE\DESCRIPTION\System\CentralProcessor\0`), RAM load using `GlobalMemoryStatusEx`, and battery status via `GetSystemPowerStatus`.
- **Display Brightness**: Connects to `ROOT\WMI` via COM and executes `WmiSetBrightness` on `WmiMonitorBrightnessMethods`.
- **System Audio Volume**: Interacts directly with `IMMDeviceEnumerator` and `IAudioEndpointVolume` (scalar 0.0 to 1.0).
- **Wi-Fi & Bluetooth Radios**: Uses `WlanSetInterface` (`WLAN_PHY_RADIO_STATE`) for Wi-Fi and modern WinRT `Windows.Devices.Radios.Radio` for Bluetooth.
- **Display Resolution**: Adjusts display resolution on the fly using `EnumDisplaySettingsW` and `ChangeDisplaySettingsW`.
- **Sandboxed File Operations**: Implements `IsPathSafe` path canonicalization that blocks attempts to mutate critical system directories (`C:\Windows`, `Program Files`, etc.).

### 5.4 Persistent SQLite Core Memory & Autonomous Worker
Located in `electron/memory.ts`:
- **Database Schema**:
  - `user_facts`: `(id, category, key UNIQUE, value, confidence, updated_at)`
  - `sessions`: `(id, created_at, summary, day_of_week)`
- **Dynamic Context Injection**: Every time a live conversation starts, all stored facts are extracted, formatted, and injected directly into Elyra's system instructions.
- **Confidence Scoring**: If an existing fact key is reaffirmed in subsequent conversations, its `confidence` score increments.
- **Shared Session Digest**: Both the background memory worker and direct IPC digest invocations route through a unified `applySessionDigest` helper, deduplicating updates and maintaining consistency.
- **Background Intelligence Worker**:
  - Upon session disconnection or during an 8.5-minute state-aware session swap, the full conversation transcript is sent to `runMemoryWorkerMain`.
  - Utilizing `gemini-2.5-flash` with structured JSON output, the worker extracts a concise 2-sentence summary and analyzes explicit and implicit user facts (categorized into `personal`, `tech_stack`, `preferences`, and `project_goals`).
  - Matches new facts against existing keys to update records rather than creating redundant duplicates.

### 5.5 Transparent Glassmorphic UI & Animation Pipeline
Located in `src/WaveWidget.tsx`:
- **Boot Sequence (0.0s to 1.2s)**:
  - *Phase 0 (0ms)*: White ignition pinpoint sparks at the widget center.
  - *Phase 1 (200ms)*: Revolving 360-degree conic gradient border illuminates the perimeter.
  - *Phase 2 (500ms)*: Inner fluid liquid waves begin undulating inside the glass sphere.
  - *Phase 3 (800ms)*: Pill expands from 100px to 480px width, revealing aurora background glows and drifting parallax particles.
  - *Phase 4 (1200ms)*: Specular light sweep passes over the widget; typography and controls reveal with a subtle glitch transition.
- **Dynamic Reactive Waveform**: Eleven independent bar segments dynamically adjust their height and frequency in response to audio input/output volumes.
- **State Indicator Modes**:
  - 🟡 **Connecting**: Amber pulse with soft halo.
  - 🟣 **Listening**: Purple neon aura with active mic wave.
  - 🩵 **Speaking**: Cyan luminescence responsive to AI audio output.
  - 🔴 **Error**: Red accent with explanatory hover tooltip.
- **Memory Manager Modal**: Frameless popover allowing the user to search, inspect confidence levels, manually add, edit, or delete memories.

### 5.6 Security, Validation & Unified Dispatch Architecture
Located across `electron/validator.ts`, `electron/main.ts`, and `src/hooks/useLiveSession.ts`:
- **Input Sanitization**: Action arguments from the AI are validated with regex to prevent command injection (e.g., verifying `appName` and `processName` do not contain command chaining characters).
- **Strict Error Signatures**: Validation failures consistently adhere to the `{ valid: boolean, error?: string }` contract, ensuring error reasons are accurately surfaced to callers.
- **Two-Step Confirmation for Destructive Actions**: When Elyra triggers a file deletion or overwrite via `file_system_action`, the tool halts execution and returns a confirmation requirement. Elyra must verbally request user confirmation and re-invoke the tool with `confirmed: true`.
- **Keystroke Queuing**: Keystroke actions are funneled through a serialized promise chain (`typeQueue`) in `action_handler.ts` to prevent overlapping or garbled keystroke execution.
- **Unified Tool Dispatcher**: Replaced sprawling per-tool wrappers with a consolidated router in `useLiveSession.ts`, standardizing error logging and response packaging across all browser, desktop, and memory tools.
- **Singleton Browser Lifecycle**: In `electron/main.ts`, the browser engine is managed as a single top-level singleton, eliminating redundant inline module resolutions.

---

## 6. Current Progress & Implementation Status

### Milestone 1: Multimodal Desktop Streaming & Native Hardware Primitives — COMPLETED (100%)
* **Full-Duplex Audio Streaming:** Bidirectional WebSocket streaming with 16kHz PCM16 microphone capture and 24kHz PCM16 audio playback via Web Audio API.
* **Instant Barge-In / Interruption:** Cancels in-flight audio buffers instantaneously upon user speech detection.
* **Visual Screen Diffing:** Samples downscaled display frames every 4 seconds, transmitting compressed 720p JPEGs only when screen changes exceed 3% pixel variance.
* **Persistent SQLite Core Memory:** `better-sqlite3` storage for long-term facts, confidence weighting, session digests, and background transcript extraction via `gemini-2.5-flash`.
* **C++ Native Addon (`elyra_automation.node`):** Low-level Win32, WMI, WLAN, and WinRT controls for volume, brightness, display resolution, Wi-Fi, Bluetooth, battery stats, process control, and path-sandboxed file operations.
* **Glassmorphic Floating UI:** Frameless, transparent Electron overlay with multi-stage ignition boot sequence, 11-bar reactive waveform, and interactive Memory Manager modal.

### Milestone 2: Physical Layer Web Orchestration — COMPLETED (100%)
* **Brave CDP Automation:** Attach-or-launch Playwright controller over Chrome DevTools Protocol (`localhost:9222`) with session restoration.
* **Multi-Tab Architecture & Tab ID Routing:** Manages tab contexts via synchronized `tabIdMap` / `pageToIdMap` with stable numeric identifiers (`Tab ID 1, 2, 3...`). Enables independent multi-tab workflows without context collisions.
* **Dynamic Visual DOM Tagging:** Real-time extraction of interactable elements, visual badge injection (`[1]`, `[2]`, ...), and dual visual/JSON input generation.
* **Synthetic Event Dispatching:** Programmatic click-by-text, direct selector typing, scroll navigation, multi-field form fills, and one-shot YouTube video playback.
* **Autonomous Loop Breaker:** Safety governor tracking consecutive tool executions without fresh user speech, preventing runaway re-trigger loops.
* **Unified Tool Dispatcher & Lean IPC:** Centralized action router in `useLiveSession.ts`, singleton browser lifecycle in `electron/main.ts`, and strict `{ valid, error }` validation signatures.

### Milestone 3: Advanced Background Task Automation — COMPLETED (100%)
* **Silent Email Delivery:** Headless API integrations allowing the AI to compose and send emails via Google SMTP over TLS (Port 465) without launching a browser window, complete with user review/approval gates.
* **Calendar Scheduling:** Background calendar event creation, meeting management, and agenda lookups backed by SQLite, with an active 60-second polling daemon delivering native Windows toast notifications.
* **Headless Data Retrieval:** Autonomous background data fetching (DuckDuckGo web search, Open-Meteo weather, cheerio/readability URL extraction, CoinCap crypto prices) operating without GUI dependencies.
* **n8n Webhook Bridge:** Local n8n workflow integration trigger for external automation dispatch.
* **Dynamic Task Decomposition UI:** Sub-problem breakdown, status tracking, and verification proof badges displayed on the Tasks tab.

### Milestone 4: Complex Workflow & Self-Healing Automation — COMPLETED (100%)
* **Autonomous Multi-Source Deep Research Engine:** End-to-end autonomous research orchestrator (`conduct_deep_research`) performing query decomposition, multi-domain search, concurrent content extraction, fact cross-referencing, and markdown dossiers with source citations.
* **Self-Healing Overlay & Cookie Banner Dismissal:** Heuristic detection and automatic clearing of GDPR cookie dialogs, newsletter popups, and backdrop modals that intercept pointer events.
* **Multi-Strategy Selector Fallback & DOM Resync:** Automatic tier-based recovery for element clicks (text matching, placeholder lookup, silent DOM re-tagging), rich-text input typing (contenteditable), and dynamic client-side SPA re-render recovery.
* **Self-Healing Task Recovery Protocol:** Dynamic recovery logging (`recover_workflow_step`) with visual status indicators (pulsing amber "Self-Healing", emerald "Self-Healed" badges) on the Tasks UI tab.

```text
Milestone / Component                         Status         Progress
======================================================================
M1: Multimodal Live Audio Stream (16k/24k)    COMPLETED      100%
M1: Barge-in / Interruption Handling          COMPLETED      100%
M1: 3% Pixel Diffing Screen Capture           COMPLETED      100%
M1: SQLite Memory Store & Background Worker   COMPLETED      100%
M1: Native C++ Addon (OS & Hardware APIs)     COMPLETED      100%
M1: Transparent Glassmorphic Widget UI        COMPLETED      100%
----------------------------------------------------------------------
M2: Brave Browser CDP Engine & Lifecycle      COMPLETED      100%
M2: Multi-Tab Orchestration & Tab ID Protocol COMPLETED      100%
M2: Dynamic DOM Tagging & Element IDs ([1]..) COMPLETED      100%
M2: Synthetic Actions (Click, Type, Form)     COMPLETED      100%
M2: Autonomous Re-trigger Loop Breaker        COMPLETED      100%
M2: Unified Dispatcher & Streamlined IPC      COMPLETED      100%
----------------------------------------------------------------------
M3: Headless Email Dispatch (Nodemailer SMTP) COMPLETED      100%
M3: Headless Calendar & Windows Reminders     COMPLETED      100%
M3: Silent Headless Data Fetcher (Search/API) COMPLETED      100%
M3: n8n Workflow Webhook Integration Bridge   COMPLETED      100%
----------------------------------------------------------------------
M4: Autonomous Deep Research Engine           COMPLETED      100%
M4: Self-Healing Overlay & Cookie Dismissal   COMPLETED      100%
M4: Multi-Strategy Selector & DOM Resync      COMPLETED      100%
M4: Tasks UI Self-Healing & Recovery Badges   COMPLETED      100%
----------------------------------------------------------------------
M5: System Optimization & Final Testing       UPCOMING         0%
```

---

## 7. Setup, Build & Running Guide

### Prerequisites
1. **Operating System**: Windows 10 or Windows 11 (x64).
2. **Node.js**: v20.x or v22.x LTS.
3. **C++ Build Tools**: Visual Studio Build Tools (with the **Desktop development with C++** workload installed) and Python (for `node-gyp`).
4. **Browser**: [Brave Browser](https://brave.com/) installed at default path (`C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe` or `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe`).
5. **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/).

### Installation

1. **Clone and Install Node Dependencies**:
   ```bash
   git clone https://github.com/Krshedition/Project-Elyra.git
   cd "Project Elyra"
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Build the Native C++ Addon**:
   Compile the C++ source files against your installed Node/Electron headers:
   ```bash
   # Build for standard Node environment
   npm run build:native

   # Or rebuild specifically for Electron 42.2.0 headers
   npm run build:electron
   ```
   This produces `build/Release/elyra_automation.node`.

4. **Launch in Development Mode**:
   ```bash
   npm run dev
   ```
   This launches the Vite dev server and opens the frameless Electron desktop widget.

5. **Build Standalone Executable**:
   ```bash
   npm run dist:win
   ```
   Outputs an NSIS Windows installer in the `dist-app/` directory.

---

## 8. Roadmap & Milestone Progression

Project Elyra follows a milestone-driven development roadmap:

1. **Milestone 1: Multimodal Desktop Streaming & Native OS Primitives** *(Completed)*
   - Full-duplex real-time audio and vision pipeline with hardware control and SQLite memory.
2. **Milestone 2: Physical Layer Web Orchestration** *(Completed)*
   - Multi-tab browser controller, Tab ID routing, dynamic DOM tagging, input dispatching, and loop prevention.
3. **Milestone 3: Advanced Background Task Automation** *(Completed)*
   - Headless background email dispatch via Nodemailer SMTP.
   - Background SQLite calendar scheduling and Windows notification reminder daemon.
   - Headless web search, weather, URL scraping, and crypto data extraction.
   - Local n8n Webhook Bridge (`trigger_n8n_workflow`) for enterprise SaaS automation.
4. **Milestone 4: Complex Workflow & Self-Healing Automation** *(Upcoming Focus)*
   - Chaining cross-application multi-step flows and dynamic error recovery.
   - WSL / Kali Linux terminal task automation.
5. **Milestone 5: System Optimization & Final Testing** *(Planned)*
   - Bandwidth optimization, security sandboxing, and final presentation edge-case hardening.
